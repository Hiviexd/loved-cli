import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "../config";
import { LovedWebClient } from "../clients/LovedWebClient";
import { Logger, logAndExit } from "../utils/logger";
import { tryUpdate } from "../utils/git-update";
import { LovedAdminClient } from "../clients/LovedAdminClient";
import { prompt } from "../utils/cli";

const log = new Logger("messages");

export const messagesCommand = new Command("messages")
    .description("Send chat announcements to nominated mappers")
    .option("-r, --round <id>", "Override the round ID from config", parseInt)
    .option("--poll-start <guess>", "Poll start time guess (skips interactive prompt)")
    .option("--dry-run", "Preview messages without sending them")
    .option("--skip-update", "Skip checking for updates")
    .action(async (options) => {
        if (options.skipUpdate) {
            await tryUpdate();
        }

        const config = await loadConfig();
        const roundId = options.round ?? config.lovedRoundId;

        // Get poll start guess
        let pollStartGuess = options.pollStart;
        if (!pollStartGuess) {
            pollStartGuess = await prompt(chalk.yellow('When do polls start? (e.g., "next weekend", "in 5 days")'), {
                defaultValue: "soon",
            });
        }

        const lovedWeb = new LovedWebClient(config.lovedWebBaseUrl, config.lovedWebApiKey);
        const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);

        if (roundInfo.nominations.length === 0) {
            log.info(`No nominations found for round ${roundId}!`);
            return;
        }

        const lovedAdmin = new LovedAdminClient(config.lovedAdminBaseUrl, config.lovedAdminApiKey);
        await lovedAdmin.sendMessages(roundId, pollStartGuess, options.dryRun).catch(logAndExit);

        log.success("Done sending messages!");
    });
