import { Command } from "commander";
import { loadConfig } from "../config";
import { Logger, logAndExit } from "../utils/logger";
import { tryUpdate } from "../utils/git-update";
import { LovedAdminClient } from "../clients/LovedAdminClient";
import { checkMutuallyExclusiveFlags, checkFlagConflicts } from "../utils/cli";

const log = new Logger("results");

export const resultsCommand = new Command("results")
    .description("Process voting results")
    .option("-r, --round <id>", "Override the round ID from config", parseInt)
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
                forumOnly: options.forumOnly,
                messagesOnly: options.messagesOnly,
                threadsOnly: options.threadsOnly,
            },
            "-only flags"
        );

        checkFlagConflicts(log, [
            [options.discordOnly, options.skipDiscord, "--discord-only and --skip-discord"],
            [options.threadsOnly, options.skipThreads, "--threads-only and --skip-threads"],
            [options.messagesOnly, options.skipMessages, "--messages-only and --skip-messages"],
        ]);

        if (!options.skipUpdate) {
            await tryUpdate();
        }

        const config = await loadConfig();
        const roundId = options.round ?? config.lovedRoundId;

        const lovedAdmin = new LovedAdminClient(config.lovedAdminBaseUrl, config.lovedAdminApiKey);

        if (options.threadsOnly) {
            await lovedAdmin.endPollsForum(roundId, options.dryRun).catch(logAndExit);
            return;
        }

        if (options.messagesOnly) {
            await lovedAdmin.endPollsChat(roundId, options.dryRun).catch(logAndExit);
            return;
        }

        if (options.discordOnly) {
            // TODO: Discord flag handling
            // const lovedWeb = new LovedWebClient(config.lovedWebBaseUrl, config.lovedWebApiKey);
            //const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);
            return;
        }

        if (!options.skipThreads) {
            await lovedAdmin.endPollsForum(roundId, options.dryRun).catch(logAndExit);
        }

        if (!options.skipMessages) {
            await lovedAdmin.endPollsChat(roundId, options.dryRun).catch(logAndExit);
        }

        if (options.discordOnly) {
            // TODO: Discord flag handling
            // const lovedWeb = new LovedWebClient(config.lovedWebBaseUrl, config.lovedWebApiKey);
            //const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);
            return;
        }

        log.success("Done processing voting results");
    });
