import { Command } from "commander";
import chalk from "chalk";
import * as readline from "node:readline";
import { loadConfig } from "../config.js";
import { OsuApiService } from "../services/OsuApiService.js";
import { LovedWebService } from "../services/LovedWebService.js";
import { templateService } from "../services/TemplateService.js";
import { logAndExit, logWarning, logInfo } from "../utils/logger.js";
import { escapeMarkdown, joinList, pushUnique } from "../utils/index.js";
import { tryUpdate } from "../utils/git-update.js";
import type { Nomination, GameModeExtraInfo, User } from "../models/types.js";

/**
 * Prompts the user for input
 */
async function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Sends notification PMs to mappers for a nomination
 */
async function sendNotifyPm(
    osuApi: OsuApiService,
    nominations: Nomination[],
    extraGameModeInfo: Record<number, GameModeExtraInfo>,
    roundName: string,
    hostTemplate: string,
    guestTemplate: string,
    pollStartGuess: string,
    dryRun: boolean
): Promise<void> {
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
            pollStartGuess = await prompt(chalk.yellow('When do polls start? (e.g., "next weekend", "very soon"): '));
            if (!pollStartGuess.trim()) {
                pollStartGuess = "soon";
            }
        }

        const lovedWeb = new LovedWebService(config.lovedBaseUrl, config.lovedApiKey);
        const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);

        if (roundInfo.nominations.length === 0) {
            logInfo("No nominations found for this round");
            return;
        }

        // Load templates
        const hostTemplate = await templateService.loadTemplate("chat-nomination-template.md");
        const guestTemplate = await templateService.loadTemplate("chat-nomination-guest-template.md");

        const osuApi = new OsuApiService(config.osuBaseUrl, config.botApiClient.id, config.botApiClient.secret);

        logInfo(`Sending messages for ${roundInfo.nominations.length} nominations...`);

        for (const nomination of roundInfo.nominations) {
            const relatedNominations = roundInfo.allNominations.filter(
                (n) => n.beatmapset_id === nomination.beatmapset_id
            );

            await sendNotifyPm(
                osuApi,
                relatedNominations,
                roundInfo.extraGameModeInfo,
                roundInfo.name,
                hostTemplate,
                guestTemplate,
                pollStartGuess,
                options.dryRun
            ).catch(logAndExit);
        }

        if (options.dryRun) {
            console.log(chalk.yellow("\n[DRY RUN] No messages were actually sent"));
        } else {
            console.log(chalk.green("Done sending messages"));
        }
    });
