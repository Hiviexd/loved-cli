import { Command } from "commander";
import { loadConfig } from "../config";
import { Logger, logAndExit } from "../utils/logger";
import { tryUpdate } from "../utils/git-update";
import { LovedAdminClient } from "../clients/LovedAdminClient";
import { checkMutuallyExclusiveFlags, checkFlagConflicts } from "../utils/cli";
import { DiscordService } from "../services/DiscordService";
import { LovedWebClient } from "../clients/LovedWebClient";

const log = new Logger("results");

export const resultsCommand = new Command("results")
    .description("Process voting results")
    .option("-r, --round <id>", "Override the round ID from config", parseInt)
    .option("--force", "Force concluding polls despite timers")
    .option("--skip-discord", "Skip Discord announcements")
    .option("--skip-threads", "Skip forum operations")
    .option("--skip-messages", "Skip chat announcements to mappers")
    .option("--discord-only", "Only post Discord results")
    .option("--threads-only", "Only perform forum operations")
    .option("--messages-only", "Only send chat announcements to mappers")
    .option("--dry-run", "Preview without making changes")
    .option("--skip-update", "Skip checking for updates")
    .action(async (options) => {
        checkMutuallyExclusiveFlags(
            log,
            {
                discordOnly: options.discordOnly,
                threadsOnly: options.threadsOnly,
                messagesOnly: options.messagesOnly,
            },
            "-only flags"
        );

        checkFlagConflicts(log, [
            [options.discordOnly, options.skipDiscord, "--discord-only and --skip-discord"],
            [options.threadsOnly, options.skipThreads, "--threads-only and --skip-threads"],
            [options.messagesOnly, options.skipMessages, "--messages-only and --skip-messages"],
        ]);

        if (options.force && options.discordOnly) {
            logAndExit(log, "Cannot use --force with --discord-only (force only applies to forum and chat operations)");
        }

        if (options.force && options.skipThreads && options.skipMessages) {
            logAndExit(
                log,
                "Cannot use --force with both --skip-threads and --skip-messages (force only applies to forum and chat operations)"
            );
        }

        if (!options.skipUpdate) {
            await tryUpdate();
        }

        const config = await loadConfig();
        const roundId = options.round ?? config.lovedRoundId;

        const lovedAdmin = new LovedAdminClient(config.lovedAdminBaseUrl, config.lovedAdminApiKey);

        if (options.threadsOnly) {
            log.info("Ending forum polls...");
            await lovedAdmin.endPollsForum(roundId, options.dryRun, options.force).catch(logAndExit);
            log.success("Done ending forum polls");
            return;
        }

        if (options.messagesOnly) {
            log.info("Sending chat announcements...");
            await lovedAdmin.endPollsChat(roundId, options.dryRun, options.force).catch(logAndExit);
            log.success("Done sending chat announcements");
            return;
        }

        if (options.discordOnly) {
            log.info("Posting Discord results...");
            const lovedWeb = new LovedWebClient(config.lovedWebBaseUrl, config.lovedWebApiKey);
            const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);
            await DiscordService.createPollEndAnnouncement(roundInfo).catch(logAndExit);
            log.success("Done posting Discord results");
            return;
        }

        if (!options.skipThreads) {
            log.info("Ending forum polls...");
            await lovedAdmin.endPollsForum(roundId, options.dryRun, options.force).catch(logAndExit);
            log.success("Done ending forum polls");
        }

        if (!options.skipMessages) {
            log.info("Sending chat announcements...");
            await lovedAdmin.endPollsChat(roundId, options.dryRun, options.force).catch(logAndExit);
            log.success("Done sending chat announcements");
        }

        if (!options.skipDiscord && !options.dryRun) {
            log.info("Posting Discord results...");
            const lovedWeb = new LovedWebClient(config.lovedWebBaseUrl, config.lovedWebApiKey);
            const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);
            await DiscordService.createPollEndAnnouncement(roundInfo).catch(logAndExit);
            log.success("Done posting Discord results");
        }

        log.success("Done processing voting results");
    });
