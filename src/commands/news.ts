import { Command } from "commander";
import { join } from "node:path";
import { loadConfig } from "../config";
import { LovedWebClient } from "../clients/LovedWebClient";
import { NewsService } from "../services/NewsService";
import { Logger, logAndExit } from "../utils/logger";
import { tryUpdate } from "../utils/git-update";
import { LovedAdminClient } from "../clients/LovedAdminClient";
import { checkMutuallyExclusiveFlags, checkFlagConflicts } from "../utils/cli";
import { DiscordService } from "../services/DiscordService";

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
        checkMutuallyExclusiveFlags(
            log,
            {
                bannersOnly: options.bannersOnly,
                discordOnly: options.discordOnly,
                threads: options.threads,
            },
            "only flags"
        );

        checkFlagConflicts(log, [
            [options.bannersOnly, options.skipBanners, "--banners-only and --skip-banners"],
            [options.discordOnly, options.skipDiscord, "--discord-only and --skip-discord"],
        ]);

        // Manual check to ensure --dry-run can only be used with --threads
        if (options.dryRun && !options.threads) {
            logAndExit(log, "Cannot use --dry-run without --threads");
        }

        if (!options.skipUpdate) {
            await tryUpdate();
        }

        const config = await loadConfig();
        const roundId = options.round ?? config.lovedRoundId;

        const lovedWeb = new LovedWebClient(config.lovedWebBaseUrl, config.lovedWebApiKey);
        const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);

        const lovedAdmin = new LovedAdminClient(config.lovedAdminBaseUrl, config.lovedAdminApiKey);

        if (options.discordOnly) {
            log.info("Posting Discord announcements...");
            await DiscordService.createPollStartAnnouncement(roundInfo, lovedAdmin).catch(logAndExit);
            log.success("Done posting Discord announcements");
            return;
        }

        if (!config.osuWikiPath) {
            logAndExit(new Error("osuWikiPath is not set in config! Set it to the path of your osu-wiki fork"));
        }

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
            log.info("Generating beatmapset banners");

            await NewsService.generateBanners(
                join(config.osuWikiPath, `wiki/shared/news/${extendedRoundInfo.newsDirname}`),
                beatmapsets,
                config.bannerTitleOverrides
            ).catch(logAndExit);

            log.success("Done generating beatmapset banners");
        }

        if (options.bannersOnly) {
            return;
        }

        // Start polls
        if (options.threads) {
            log.info("Generating forum threads...");
            await lovedAdmin.startPolls(roundId, options.dryRun).catch(logAndExit);
            log.success("Done generating forum threads");
        }

        // Post Discord announcements (only when threads were created so poll URLs exist; skip on dry-run)
        if (options.threads && !options.skipDiscord && !options.dryRun) {
            log.info("Posting Discord announcements...");
            const refreshedRoundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);
            await DiscordService.createPollStartAnnouncement(refreshedRoundInfo, lovedAdmin).catch(logAndExit);
            log.success("Done posting Discord announcements");
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

        const completedTasks = [];
        if (options.threads) completedTasks.push("forum threads");
        if (options.threads && !options.skipDiscord && !options.dryRun) completedTasks.push("Discord announcements");
        if (config.osuWikiPath) completedTasks.push("news posts");

        log.success("Done generating " + completedTasks.join(", "));
    });
