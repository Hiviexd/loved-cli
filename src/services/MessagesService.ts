import chalk from "chalk";
import { OsuApiService } from "./OsuApiService";
import { templateService } from "./TemplateService";
import { logWarning } from "../utils/logger";
import { escapeMarkdown, joinList, pushUnique } from "../utils/index";
import type { Nomination, GameModeExtraInfo, User } from "../models/types";

/**
 * Service for sending notification messages to mappers
 */
export class MessagesService {
    /**
     * Sends notification PMs to mappers for a nomination
     */
    public static async sendNotifyPm({
        osuApi,
        nominations,
        extraGameModeInfo,
        roundName,
        hostTemplate,
        guestTemplate,
        pollStartGuess,
        newsAuthorName,
        newsAuthorId,
        dryRun,
    }: {
        osuApi: OsuApiService;
        nominations: Nomination[];
        extraGameModeInfo: Record<number, GameModeExtraInfo>;
        roundName: string;
        hostTemplate: string;
        guestTemplate: string;
        pollStartGuess: string;
        newsAuthorName: string;
        newsAuthorId: number;
        dryRun: boolean;
    }): Promise<void> {
        if (nominations.length === 0) {
            throw new Error("No nominations provided");
        }

        const beatmapset = nominations[0].beatmapset;
        const creators: User[] = [];
        const excludedVersions: string[] = [];
        const gameModes: (typeof nominations)[0]["game_mode"][] = [];

        for (const nomination of nominations) {
            pushUnique(creators, nomination.beatmapset_creators, (a, b) => a.id === b.id);
            excludedVersions.push(
                ...nomination.beatmaps.filter((beatmap) => beatmap.excluded).map((beatmap) => `[${beatmap.version}]`)
            );
            gameModes.push(nomination.game_mode);
        }

        gameModes.sort((a, b) => a.id - b.id);

        const gameModeVars =
            gameModes.length > 1
                ? {
                      GAME_MODES: joinList(gameModes.map((m) => m.longName)),
                      THRESHOLDS: gameModes
                          .map((m) => `- ${m.longName}: **${extraGameModeInfo[m.id].thresholdFormatted}**`)
                          .join("\n"),
                  }
                : {
                      GAME_MODE: gameModes[0].longName,
                      THRESHOLD: extraGameModeInfo[gameModes[0].id].thresholdFormatted,
                  };

        const guestCreators = creators
            .filter((creator) => creator.id !== beatmapset.creator_id)
            .sort((a, b) => a.name.localeCompare(b.name));

        // Send to host
        const hostMessage = templateService.render(hostTemplate, {
            ARTIST: escapeMarkdown(beatmapset.original_artist || beatmapset.artist),
            BEATMAPSET_ID: beatmapset.id,
            EXCLUDED_DIFFS: excludedVersions.length > 0 ? escapeMarkdown(joinList(excludedVersions)) : null,
            GUESTS:
                guestCreators.length > 0
                    ? joinList(
                          guestCreators.map((c) =>
                              c.id >= 4294000000
                                  ? escapeMarkdown(c.name)
                                  : `[${escapeMarkdown(c.name)}](https://osu.ppy.sh/users/${c.id})`
                          )
                      )
                    : null,
            POLL_START: pollStartGuess,
            ROUND_NAME: roundName,
            ROUND_AUTHOR_NAME: newsAuthorName,
            ROUND_AUTHOR_ID: newsAuthorId,
            TITLE: escapeMarkdown(beatmapset.original_title || beatmapset.title),
            ...gameModeVars,
        });

        if (dryRun) {
            console.log(chalk.cyan(`\n[DRY RUN] Would send to host (user #${beatmapset.creator_id}):`));
            console.log(chalk.dim(hostMessage));
        } else {
            await osuApi.sendChatAnnouncement(
                [beatmapset.creator_id],
                "Project Loved nomination",
                "Your map has been nominated for the next round of Project Loved!",
                hostMessage
            );
        }

        // Send to guests
        const guestCreatorsToMessage = guestCreators.filter((creator) => {
            if (creator.banned || creator.id >= 4294000000) {
                logWarning(`Skipping chat announcement to banned/placeholder user ${creator.name}`);
                return false;
            }
            return true;
        });

        if (guestCreatorsToMessage.length > 0) {
            const guestMessage = templateService.render(guestTemplate, {
                ARTIST: escapeMarkdown(beatmapset.original_artist || beatmapset.artist),
                BEATMAPSET_ID: beatmapset.id,
                ROUND_NAME: roundName,
                ROUND_AUTHOR_NAME: newsAuthorName,
                ROUND_AUTHOR_ID: newsAuthorId,
                TITLE: escapeMarkdown(beatmapset.original_title || beatmapset.title),
            });

            if (dryRun) {
                console.log(
                    chalk.cyan(
                        `\n[DRY RUN] Would send to ${guestCreatorsToMessage.length} guest(s): ${guestCreatorsToMessage
                            .map((c) => c.name)
                            .join(", ")}`
                    )
                );
                console.log(chalk.dim(guestMessage));
            } else {
                await osuApi.sendChatAnnouncement(
                    guestCreatorsToMessage.map((user) => user.id),
                    "Project Loved guest nomination",
                    "Your guest map has been nominated for the next round of Project Loved!",
                    guestMessage
                );
            }
        }
    }
}
