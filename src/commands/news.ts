import { Command } from "commander";
import { join } from "node:path";
import { loadConfig } from "../config";
import { OsuApiService } from "../services/OsuApiService";
import { LovedWebClient } from "../clients/LovedWebClient";
import { NewsService } from "../services/NewsService";
import { Logger, logAndExit } from "../utils/logger";
import { tryUpdate } from "../utils/git-update";

const log = new Logger("news");

export const newsCommand = new Command("news")
    .description("Generate news post and optionally create forum threads")
    .option("-r, --round <id>", "Override the round ID from config", parseInt)
    .option("--threads", "Create forum threads")
    .option("--banners-only", "Only generate banners")
    .option("--discord-only", "Only post Discord announcements")
    .option("--skip-banners", "Skip banner generation")
    .option("--skip-discord", "Skip Discord announcements")
    .option("--dry-run", "Preview without making changes")
    .option("--skip-update", "Skip checking for updates")
    .action(async (options) => {
        if (!options.skipUpdate) {
            await tryUpdate(options.threads);
        }

        const config = await loadConfig();
        const roundId = options.round ?? config.lovedRoundId;

        if (!config.osuWikiPath && !options.bannersOnly) {
            log.error(new Error("osuWikiPath is not set in config"));
            log.error(new Error("Set it to the path of your osu-wiki fork"));
        }

        const lovedWeb = new LovedWebClient(config.lovedWebBaseUrl, config.lovedWebApiKey);
        const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);
        const postTimeIsoString = roundInfo.postTime.toISOString();

        // Add computed properties
        const extendedRoundInfo = {
            ...roundInfo,
            postDateString: postTimeIsoString.slice(0, 10),
            postTimeString: postTimeIsoString.slice(11, 19),
            postYear: postTimeIsoString.slice(0, 4),
            newsDirname: `${postTimeIsoString.slice(0, 10)}-${roundInfo.title.toLowerCase().replace(/\W+/g, "-")}`,
        };

        const beatmapsets = roundInfo.nominations.map((n) => n.beatmapset);
        const beatmapsetBgPaths = await NewsService.loadBeatmapsetBgPaths(roundId, beatmapsets).catch(logAndExit);

        // Assign background paths to nominations
        for (const nomination of roundInfo.allNominations) {
            nomination.beatmapset.bgPath = beatmapsetBgPaths[nomination.beatmapset.id];
        }

        // Generate banners
        if (!options.skipBanners) {
            await NewsService.generateBanners(
                join(config.osuWikiPath, `wiki/shared/news/${extendedRoundInfo.newsDirname}`),
                beatmapsets,
                config.bannerTitleOverrides
            ).catch(logAndExit);
        }

        if (options.bannersOnly) {
            return;
        }

        // Create forum topics
        if (options.threads) {
            const osuApi = new OsuApiService(config.osuBaseUrl, config.botApiClient.id, config.botApiClient.secret);

            await NewsService.generateTopics(lovedWeb, osuApi, roundInfo, roundId, options.dryRun).catch(logAndExit);
        }

        // Generate news post
        if (config.osuWikiPath) {
            await NewsService.generateNews(
                join(config.osuWikiPath, `news/${extendedRoundInfo.postYear}/${extendedRoundInfo.newsDirname}.md`),
                extendedRoundInfo,
                roundId,
                await lovedWeb.getRoundTopicIds(roundId).catch(logAndExit)
            ).catch(logAndExit);
        }

        log.success("Done generating news posts");
    });
