import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import chalk from "chalk";
import { BannerService } from "./BannerService";
import { TemplateService } from "./TemplateService";
import Ruleset from "../models/Ruleset";
import type { Nomination, RoundInfo, Beatmapset, Beatmap } from "../models/types";
import { Logger, NoTraceError } from "../utils/logger";
import { convertToMarkdown, escapeMarkdown, joinList, maxOf, minOf, videoHtml } from "../utils/index";

const log = new Logger("news");

/**
 * Service for generating news posts and banners
 */
export class NewsService {
    /**
     * Gets extra information about a beatmapset for display
     */
    public static getExtraBeatmapsetInfo(nomination: Nomination): string {
        const beatmaps: Beatmap[] = [];
        const beatmapsForMode = nomination.beatmaps.filter((b) => b.game_mode === nomination.game_mode.id);
        const excludedDiffNames: string[] = [];
        const reverseExclude = beatmapsForMode.filter((b) => b.excluded).length / beatmapsForMode.length > 0.5;

        for (const beatmap of beatmapsForMode) {
            const isExcluded = typeof beatmap.excluded === "boolean" ? beatmap.excluded : beatmap.excluded === 1;

            if (reverseExclude !== isExcluded) {
                const versionMatch = beatmap.version.match(/(?:\[\d+K\] )?(.+)/i);
                if (versionMatch == null) {
                    throw new Error(`Excluded beatmap version match failed for nomination #${nomination.id}`);
                }
                excludedDiffNames.push(`[${versionMatch[1]}]`);
            }

            if (!isExcluded) {
                beatmaps.push(beatmap);
            }
        }

        if (beatmaps.length === 0) {
            throw new NoTraceError(`No beatmaps for nomination #${nomination.id}`);
        }

        // Sort by star rating, then by key mode
        beatmaps.sort((a, b) => a.star_rating - b.star_rating);
        beatmaps.sort((a, b) => (a.key_mode ?? 0) - (b.key_mode ?? 0));

        const maxBpm = maxOf(beatmaps, "bpm") as number;
        const minBpm = minOf(beatmaps, "bpm") as number;
        const maxLength = maxOf(beatmaps, "total_length") as number;
        const lengthMinutes = Math.floor(maxLength / 60);
        const lengthSeconds = (maxLength % 60).toString().padStart(2, "0");

        let info = "";

        if (minBpm === maxBpm) {
            info += minBpm;
        } else {
            info += `${minBpm} – ${maxBpm}`;
        }

        info += ` BPM, ${lengthMinutes}:${lengthSeconds} | `;

        if (beatmaps.length > 5) {
            const maxSr = maxOf(beatmaps, "star_rating") as number;
            const minSr = minOf(beatmaps, "star_rating") as number;

            if (nomination.game_mode.id === 3) {
                const keyModes = [...new Set(beatmaps.map((beatmap) => beatmap.key_mode))]
                    .filter((keyMode): keyMode is number => keyMode != null)
                    .sort((a, b) => a - b);
                info += keyModes.map((k) => `${k}K, `).join("");
            }

            info += `${minSr.toFixed(2)}★ – ${maxSr.toFixed(2)}★`;
        } else {
            info += beatmaps
                .map(
                    (beatmap) =>
                        (beatmap.key_mode == null ? "" : `[${beatmap.key_mode}K] `) +
                        `${beatmap.star_rating.toFixed(2)}★`
                )
                .join(", ");
        }

        if (excludedDiffNames.length > 0) {
            const part = `${joinList(excludedDiffNames)} ${
                excludedDiffNames.length > 1 ? "difficulties are" : "difficulty is"
            }`;
            info += reverseExclude
                ? `\nOnly the ${part} being nominated for Loved.`
                : `\nThe ${part} [i]not[/i] being nominated for Loved.`;
        }

        return info;
    }

    /**
     * Loads background paths for beatmapsets from the banners directory for the given round
     */
    public static async loadBeatmapsetBgPaths(
        roundId: number,
        beatmapsets: Beatmapset[]
    ): Promise<Record<number, string>> {
        const backgroundDir = BannerService.getBackgroundsDir(roundId);
        const paths: Record<number, string> = {};

        try {
            const dirents = await readdir(backgroundDir, { withFileTypes: true });

            for (const dirent of dirents) {
                if (!dirent.isFile()) continue;

                const filenameMatch = dirent.name.match(/(\d+)\.(?:jpeg|jpg|png)/i);
                if (filenameMatch != null) {
                    paths[Number.parseInt(filenameMatch[1])] = join(backgroundDir, filenameMatch[0]);
                }
            }
        } catch {
            log.warning(`Background directory ${backgroundDir}/ not found. Run "loved maps download" first.`);
        }

        for (const beatmapset of beatmapsets) {
            if (paths[beatmapset.id] == null) {
                log.warning(
                    `Missing background image for ${chalk.underline(beatmapset.title)} [#${
                        beatmapset.id
                    }], using default`
                );
            }
        }

        return paths;
    }

    /**
     * Generates pack URL for a round and ruleset
     */
    public static packUrl(roundId: number, roundTitle: string, ruleset: Ruleset): string {
        // TODO: This calculation may need adjustment for skipped modes/rounds
        const packNumber = (roundId - 109 + 1) * 4 - ruleset.id;
        return `https://packs.ppy.sh/LR${packNumber} - ${roundTitle} (${ruleset.longName}).zip`;
    }

    /**
     * Generates voting banners for all beatmapsets
     */
    public static async generateBanners(
        bannersPath: string,
        beatmapsets: Beatmapset[],
        bannerTitleOverrides: Record<string, string>
    ): Promise<void> {
        log.info("Generating beatmapset banners");

        await mkdir(bannersPath, { recursive: true });

        await Promise.all(
            beatmapsets.map((beatmapset) =>
                BannerService.createBanner(
                    beatmapset.bgPath ?? null,
                    join(bannersPath, beatmapset.id.toString()),
                    bannerTitleOverrides[beatmapset.id] ?? beatmapset.title
                )
                    .then((generatedBanners) =>
                        log
                            .dim()
                            .success(
                                `${generatedBanners ? "Created" : "Using cached"} banners for ${chalk.underline(
                                    beatmapset.title
                                )} [#${beatmapset.id}]`
                            )
                    )
                    .catch((error) => {
                        console.error(
                            chalk.dim.red(
                                `Failed to create banners for ${chalk.underline(beatmapset.title)} [#${beatmapset.id}]:`
                            )
                        );
                        log.error(error);
                        throw new NoTraceError();
                    })
            )
        );
    }

    /**
     * Generates the news post markdown file
     */
    public static async generateNews(
        newsPath: string,
        roundInfo: RoundInfo & {
            postDateString: string;
            postTimeString: string;
            postYear: string;
            newsDirname: string;
        },
        roundId: number,
        topicIds: Record<number, number>
    ): Promise<void> {
        log.info("Generating news post");

        const gameModeSectionStrings: string[] = [];
        const gameModesPresent: Ruleset[] = [];
        const packUrls: Record<number, string> = {};

        // Load templates
        const newsTemplate = await TemplateService.loadTemplate("news-post-template.md");
        const newsGameModeTemplate = await TemplateService.loadTemplate("news-post-template-mode.md");
        const newsNominationTemplate = await TemplateService.loadTemplate("news-post-template-beatmap.md");

        for (const gameMode of Ruleset.all()) {
            const extraInfo = roundInfo.extraGameModeInfo[gameMode.id];
            const nominationStrings: string[] = [];
            const nominationsForMode = roundInfo.allNominations.filter((n) => n.game_mode.id === gameMode.id);
            packUrls[gameMode.id] = encodeURI(NewsService.packUrl(roundId, roundInfo.title, gameMode));

            if (nominationsForMode.length === 0) {
                log.warning(`Skipping ${gameMode.longName}, there are no nominations`);
                continue;
            }

            gameModesPresent.push(gameMode);

            for (const nomination of nominationsForMode) {
                const errors: string[] = [];

                if (nomination.description == null) {
                    errors.push("missing description");
                } else if (nomination.description_state === 0) {
                    errors.push("unreviewed description");
                }

                if (nomination.beatmapset_creators.length === 0) {
                    errors.push("missing creators");
                }

                if (errors.length > 0) {
                    log.warning(`Skipping nomination #${nomination.id} with ${joinList(errors)}`);
                    continue;
                }

                nominationStrings.push(
                    TemplateService.render(newsNominationTemplate, {
                        BEATMAPSET: escapeMarkdown(`${nomination.beatmapset.artist} - ${nomination.beatmapset.title}`),
                        BEATMAPSET_EXTRAS: convertToMarkdown(NewsService.getExtraBeatmapsetInfo(nomination)),
                        BEATMAPSET_ID: nomination.beatmapset.id,
                        CAPTAIN: escapeMarkdown(nomination.description_author?.name ?? "Unknown"),
                        CAPTAIN_ID: nomination.description_author?.id ?? 0,
                        CONSISTENT_CAPTAIN: extraInfo.descriptionAuthors.length === 1,
                        CREATORS: joinList(
                            nomination.beatmapset_creators.map((c) =>
                                c.id >= 4294000000
                                    ? escapeMarkdown(c.name)
                                    : `[${escapeMarkdown(c.name)}](https://osu.ppy.sh/users/${c.id})`
                            )
                        ),
                        DESCRIPTION: convertToMarkdown(nomination.description ?? ""),
                        FOLDER: roundInfo.newsDirname,
                        LINK_MODE: gameMode.linkName,
                        TOPIC_ID: topicIds[nomination.id],
                    })
                );
            }

            gameModeSectionStrings.push(
                TemplateService.render(newsGameModeTemplate, {
                    ALL_CAPTAINS: joinList(
                        extraInfo.nominators.map((n) => `[${escapeMarkdown(n.name)}](https://osu.ppy.sh/users/${n.id})`)
                    ),
                    CONSISTENT_CAPTAIN:
                        extraInfo.descriptionAuthors.length === 1
                            ? escapeMarkdown(extraInfo.descriptionAuthors[0].name)
                            : null,
                    CONSISTENT_CAPTAIN_ID:
                        extraInfo.descriptionAuthors.length === 1 ? extraInfo.descriptionAuthors[0].id : null,
                    MODE_LONG: gameMode.longName,
                    NOMINATIONS: nominationStrings.join("\n\n"),
                    PACK_URL: packUrls[gameMode.id],
                    VIDEO: videoHtml(extraInfo.video),
                })
            );
        }

        await mkdir(dirname(newsPath), { recursive: true });
        await writeFile(
            newsPath,
            TemplateService.render(newsTemplate, {
                AUTHOR: roundInfo.newsAuthorName,
                DATE: roundInfo.postDateString,
                GAME_MODES: gameModesPresent,
                HEADER: roundInfo.introPreview,
                INTRO: roundInfo.intro,
                NOMINATIONS: gameModeSectionStrings.join("\n\n"),
                OUTRO: roundInfo.outro,
                PACK_URLS: packUrls,
                TIME: roundInfo.postTimeString,
                TITLE: roundInfo.title,
                VIDEO: videoHtml(roundInfo.video),
            }) + "\n"
        );

        log.dim().success(`Generated news post at ${newsPath}`);
    }
}
