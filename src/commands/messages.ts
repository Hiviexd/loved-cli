import { Command } from "commander";
import chalk from "chalk";
import * as readline from "node:readline";
import { loadConfig } from "../config";
import { OsuApiService } from "../services/OsuApiService";
import { LovedWebService } from "../services/LovedWebService";
import { MessagesService } from "../services/MessagesService";
import { TemplateService } from "../services/TemplateService";
import { logAndExit, logInfo } from "../utils/logger";
import { tryUpdate } from "../utils/git-update";

/**
 * Prompts the user for input with an optional default value
 */
async function prompt(question: string, defaultValue?: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const defaultHint = defaultValue ? chalk.dim(` (${defaultValue})`) : "";
    const fullQuestion = `${question}${defaultHint}: `;

    return new Promise((resolve) => {
        rl.question(fullQuestion, (answer) => {
            rl.close();
            resolve(answer.trim() || defaultValue || "");
        });
    });
}

export const messagesCommand = new Command("messages")
    .description("Send chat announcements to nominated mappers")
    .option("-r, --round <id>", "Override the round ID from config", parseInt)
    .option("--dry-run", "Preview messages without sending them")
    .option("--skip-update", "Skip checking for updates")
    .option("--poll-start <guess>", "Poll start time guess (skips interactive prompt)")
    .action(async (options) => {
        if (!options.skipUpdate) {
            await tryUpdate();
        }

        const config = await loadConfig();
        const roundId = options.round ?? config.lovedRoundId;

        // Get poll start guess
        let pollStartGuess = options.pollStart;
        if (!pollStartGuess) {
            pollStartGuess = await prompt(
                chalk.yellow('When do polls start? (e.g., "next weekend", "in 5 days")'),
                "soon"
            );
        }

        const lovedWeb = new LovedWebService(config.lovedWebBaseUrl, config.lovedWebApiKey);
        const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);

        if (roundInfo.nominations.length === 0) {
            logInfo("No nominations found for this round");
            return;
        }

        // Load templates
        const hostTemplate = await TemplateService.loadTemplate("chat-nomination-template.md");
        const guestTemplate = await TemplateService.loadTemplate("chat-nomination-guest-template.md");

        const osuApi = new OsuApiService(config.osuBaseUrl, config.botApiClient.id, config.botApiClient.secret);

        logInfo(`Sending messages for ${roundInfo.nominations.length} nominations...`);

        for (const nomination of roundInfo.nominations) {
            const relatedNominations = roundInfo.allNominations.filter(
                (n) => n.beatmapset_id === nomination.beatmapset_id
            );

            await MessagesService.sendNotifyPm({
                osuApi,
                nominations: relatedNominations,
                extraGameModeInfo: roundInfo.extraGameModeInfo,
                roundName: roundInfo.name,
                hostTemplate,
                guestTemplate,
                pollStartGuess,
                newsAuthorName: roundInfo.newsAuthorName,
                newsAuthorId: roundInfo.newsAuthorId,
                dryRun: options.dryRun,
            }).catch(logAndExit);
        }

        if (options.dryRun) {
            console.log(chalk.yellow("\n[DRY RUN] No messages were actually sent"));
        } else {
            console.log(chalk.green("Done sending messages"));
        }
    });
