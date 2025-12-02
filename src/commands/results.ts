import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "../config";
import { OsuApiService } from "../services/OsuApiService";
import { LovedWebClient } from "../clients/LovedWebClient";
import { DiscordService } from "../services/DiscordService";
import Ruleset from "../models/Ruleset";
import type { DiscordEmbed } from "../models/types";
import { logAndExit, logInfo, logWarning } from "../utils/logger";
import { escapeMarkdown, formatPercent, joinList } from "../utils/index";
import { tryUpdate } from "../utils/git-update";

export const resultsCommand = new Command("results")
    .description("Process voting results")
    .option("-r, --round <id>", "Override the round ID from config", parseInt)
    .option("--skip-lock", "Skip locking topics")
    .option("--skip-unpin", "Skip unpinning main topics")
    .option("--skip-discord", "Skip Discord announcements")
    .option("--skip-chat", "Skip chat announcements to mappers")
    .option("--skip-unwatch", "Skip removing topic watches")
    .option("--lock-only", "Only lock topics")
    .option("--discord-only", "Only post Discord results")
    .option("--dry-run", "Preview without making changes")
    .option("--skip-update", "Skip checking for updates")
    .action(async (options) => {
        if (!options.skipUpdate) {
            await tryUpdate();
        }

        const config = await loadConfig();
        const roundId = options.round ?? config.lovedRoundId;

        const lovedWeb = new LovedWebClient(config.lovedWebBaseUrl, config.lovedWebApiKey);
        let roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);

        const osuApi = new OsuApiService(config.osuBaseUrl, config.botApiClient.id, config.botApiClient.secret);

        // Get main topic IDs
        const mainTopicIds = await osuApi.getModeTopics(120).catch(logAndExit);

        // Validate that nominations and topics match
        let error = false;
        const gameModesPresent: Ruleset[] = [];

        for (const gameMode of Ruleset.all()) {
            const gameModeHasNominations = roundInfo.allNominations.some(
                (nomination) => nomination.game_mode.id === gameMode.id
            );

            if ((mainTopicIds[gameMode.id] != null) !== gameModeHasNominations) {
                console.error(
                    chalk.red(`Nominations and main topics do not agree about ${gameMode.longName}'s presence`)
                );
                error = true;
            }

            if (gameModeHasNominations) {
                gameModesPresent.push(gameMode);
            }
        }

        if (error) {
            process.exit(1);
        }

        // Discord-only mode
        if (options.discordOnly) {
            await postDiscordResults(roundInfo, gameModesPresent, config, options.dryRun);
            return;
        }

        // Lock and unpin topics
        if (!options.skipLock || !options.skipUnpin) {
            logInfo("Locking and unpinning topics");

            const lockAndUnpinPromises: Promise<void>[] = [];

            if (!options.skipLock) {
                for (const nomination of roundInfo.allNominations) {
                    if (nomination.poll?.topic_id) {
                        if (options.dryRun) {
                            console.log(chalk.yellow(`[DRY RUN] Would lock topic ${nomination.poll.topic_id}`));
                        } else {
                            lockAndUnpinPromises.push(osuApi.lockTopic(nomination.poll.topic_id));
                        }
                    }
                }
            }

            for (const gameMode of gameModesPresent) {
                const topicId = mainTopicIds[gameMode.id];
                if (topicId) {
                    if (!options.skipLock) {
                        if (options.dryRun) {
                            console.log(chalk.yellow(`[DRY RUN] Would lock main topic ${topicId}`));
                        } else {
                            lockAndUnpinPromises.push(osuApi.lockTopic(topicId));
                        }
                    }
                    if (!options.skipUnpin) {
                        if (options.dryRun) {
                            console.log(chalk.yellow(`[DRY RUN] Would unpin main topic ${topicId}`));
                        } else {
                            lockAndUnpinPromises.push(osuApi.pinTopic(topicId, 0));
                        }
                    }
                }
            }

            if (!options.dryRun) {
                await Promise.all(lockAndUnpinPromises).catch(logAndExit);
            }
        }

        if (options.lockOnly) {
            return;
        }

        // Save poll results
        if (!options.dryRun) {
            logInfo("Saving poll results");
            await lovedWeb.postResults(roundId, mainTopicIds).catch(logAndExit);
        } else {
            console.log(chalk.yellow("[DRY RUN] Would save poll results"));
        }

        // Post Discord announcements
        if (!options.skipDiscord) {
            await postDiscordResults(roundInfo, gameModesPresent, config, options.dryRun);
        }

        // Send chat announcement to mappers of passed votings
        if (!options.skipChat) {
            logInfo("Sending chat announcement to mappers of passed votings");

            // Refresh round info to get results
            roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);

            const passedVotingCreatorIds = new Set<number>();

            for (const gameMode of gameModesPresent) {
                const nominations = roundInfo.allNominations.filter(
                    (nomination) => nomination.game_mode.id === gameMode.id
                );
                const threshold = roundInfo.extraGameModeInfo[gameMode.id].threshold;

                for (const nomination of nominations) {
                    if (!nomination.poll) continue;

                    const yesVotes = nomination.poll.result_yes ?? 0;
                    const noVotes = nomination.poll.result_no ?? 0;
                    const yesRatio = yesVotes / (noVotes + yesVotes);
                    const passed = yesRatio >= threshold;

                    if (passed) {
                        for (const creator of nomination.beatmapset_creators) {
                            if (!creator.banned) {
                                passedVotingCreatorIds.add(creator.id);
                            }
                        }
                    }
                }
            }

            if (passedVotingCreatorIds.size > 0) {
                if (options.dryRun) {
                    console.log(
                        chalk.yellow(
                            `[DRY RUN] Would send chat to ${passedVotingCreatorIds.size} creators: ${[
                                ...passedVotingCreatorIds,
                            ].join(", ")}`
                        )
                    );
                } else {
                    await osuApi
                        .sendChatAnnouncement(
                            [...passedVotingCreatorIds],
                            "Project Loved result",
                            "Your map passed Loved voting!",
                            "Congratulations, your map passed voting in the last round of Project Loved! It will be moved to the Loved category soon."
                        )
                        .catch(logAndExit);
                }
            }
        }

        // Remove topic watches
        if (!options.skipUnwatch) {
            logInfo("Removing watches from topics");

            const watchPromises: Promise<void>[] = [];

            for (const nomination of roundInfo.allNominations) {
                if (nomination.poll?.topic_id) {
                    if (options.dryRun) {
                        console.log(chalk.yellow(`[DRY RUN] Would unwatch topic ${nomination.poll.topic_id}`));
                    } else {
                        watchPromises.push(osuApi.watchTopic(nomination.poll.topic_id, false));
                    }
                }
            }

            for (const gameMode of gameModesPresent) {
                const topicId = mainTopicIds[gameMode.id];
                if (topicId) {
                    if (options.dryRun) {
                        console.log(chalk.yellow(`[DRY RUN] Would unwatch main topic ${topicId}`));
                    } else {
                        watchPromises.push(osuApi.watchTopic(topicId, false));
                    }
                }
            }

            if (!options.dryRun) {
                await Promise.all(watchPromises).catch(logAndExit);
            }
        }

        if (options.dryRun) {
            console.log(chalk.yellow("\n[DRY RUN] No changes were made"));
        } else {
            console.log(chalk.green("Done!"));
        }
    });

/**
 * Posts results to Discord webhooks
 */
async function postDiscordResults(
    roundInfo: Awaited<ReturnType<LovedWebClient["getRoundInfo"]>>,
    gameModesPresent: Ruleset[],
    config: Awaited<ReturnType<typeof loadConfig>>,
    dryRun: boolean
): Promise<void> {
    logInfo("Posting announcements to Discord");

    for (const gameMode of gameModesPresent) {
        const nominations = roundInfo.allNominations.filter((nomination) => nomination.game_mode.id === gameMode.id);
        const threshold = roundInfo.extraGameModeInfo[gameMode.id].threshold;
        const discordWebhook = roundInfo.discordWebhooks[gameMode.id];

        if (!discordWebhook) {
            logWarning(`No Discord webhook configured for ${gameMode.longName}`);
            continue;
        }

        // Calculate results
        const nominationsWithResults = nominations.map((nomination) => {
            const yesVotes = nomination.poll?.result_yes ?? 0;
            const noVotes = nomination.poll?.result_no ?? 0;
            const yesRatio = yesVotes / (noVotes + yesVotes) || 0;
            const passed = yesRatio >= threshold;

            return {
                ...nomination,
                yesRatio,
                passed,
                yesVotes,
                noVotes,
            };
        });

        // Sort by passed status (passed first)
        nominationsWithResults.sort((a, b) => +b.passed - +a.passed);

        const embeds: DiscordEmbed[] = nominationsWithResults.map((nomination) => {
            const artistAndTitle = escapeMarkdown(`${nomination.beatmapset.artist} - ${nomination.beatmapset.title}`);
            const creators = joinList(nomination.beatmapset_creators.map((creator) => escapeMarkdown(creator.name)));

            return {
                color: nomination.passed ? 0x22dd22 : 0xdd2222,
                description: `${formatPercent(nomination.yesRatio)} - ${nomination.yesVotes}:${nomination.noVotes}`,
                title: `**${artistAndTitle}** by ${creators}`,
                url: `https://osu.ppy.sh/beatmapsets/${nomination.beatmapset.id}#${nomination.game_mode.linkName}`,
            };
        });

        if (dryRun) {
            console.log(chalk.yellow(`[DRY RUN] Would post to Discord for ${gameMode.longName}`));
            const discord = new DiscordService(discordWebhook);
            await discord.post(`Project Loved: ${gameMode.longName}`, config.messages.discordResults, embeds);
        } else {
            const discord = new DiscordService(discordWebhook);
            await discord
                .post(`Project Loved: ${gameMode.longName}`, config.messages.discordResults, embeds)
                .catch(logAndExit);
        }
    }
}
