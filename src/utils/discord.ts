import { hexToNumber } from "./misc";
import { RoundInfo } from "../models/loved";
import { Config, loadConfig } from "../config";
import Ruleset from "../models/Ruleset";
import { WebhookBuilder } from "./discord/WebhookBuilder";
import { Logger } from "./logger";
import { EmbedBuilder } from "./discord/EmbedBuilder";
import { NewsService } from "../services/NewsService";
import { LovedAdminClient } from "../clients/LovedAdminClient";
import { logAndExit } from "./logger";
import { formatPercent } from "./formatting";
import { writeFile } from "node:fs/promises";

/**
 * Webhook color constants
 */
const WEBHOOK_COLORS = {
    red: hexToNumber("#EE2629"),
    blue: hexToNumber("#008cff"),
    green: hexToNumber("#1df27d"),
    pink: hexToNumber("#FF66AA"),
    lightPink: hexToNumber("#f4ABBA"),
    white: hexToNumber("#EFEFEF"),
    black: hexToNumber("#272727"),
};

const USERNAME = "Project Loved";
const START_MESSAGE =
    "@everyone {{MAP_COUNT}} new maps have been nominated for Loved, check them out and cast your votes!";
const END_MESSAGE = "@everyone Results from the polls are in! The maps that passed voting will be moved to Loved soon.";

/**
 * Get the webhook URL for a given mode.
 * - If a webhook override is found in the config, return the override URL.
 * - Otherwise, return the url at the same index as the mode in the discordWebhooks array.
 */
const getWebhookUrl = (mode: Ruleset, config: Config, discordWebhooks: string[]) => {
    const webhookOverride = config.webhookOverrides.find((w) => w.mode === mode.shortName);

    if (webhookOverride?.url?.length && webhookOverride.url.length > 0) {
        log.info(`Using webhook override for mode ${mode.shortName}: ${webhookOverride.url}`);
        return webhookOverride.url;
    }

    return discordWebhooks[mode.id];
};

const log = new Logger("discord");

export async function createPollStartAnnouncement(roundInfo: RoundInfo, adminClient: LovedAdminClient) {
    // Abort if any nomination is missing a poll
    if (roundInfo.nominations.some((n) => n.poll == null)) {
        logAndExit(log, "One or more nominations are missing a poll! Make sure threads have been created properly.");
    }

    const config = await loadConfig();
    const modeTopicsResponse = await adminClient.getModeTopics(roundInfo.allNominations[0].round_id).catch(logAndExit);

    // Parse through each mode
    for (const mode of Ruleset.all()) {
        const webhookUrl = getWebhookUrl(mode, config, roundInfo.discordWebhooks);

        if (!webhookUrl) {
            log.warning(`No webhook URL found for mode ${mode.shortName}, skipping...`);
            continue;
        }

        const filteredNominations = roundInfo.nominations.filter((n) => n.game_mode.id === mode.id);

        if (filteredNominations.length === 0) {
            log.warning(`No nominations found for mode ${mode.shortName}, skipping...`);
            continue;
        }

        const webhook = new WebhookBuilder()
            .setWebhookUrl(webhookUrl)
            .setUsername(USERNAME)
            .setMessage(START_MESSAGE.replace("{{MAP_COUNT}}", filteredNominations.length.toString()));

        // generate embeds for each nomination
        for (const nomination of filteredNominations) {
            const coverUrl = `https://assets.ppy.sh/beatmaps/${nomination.beatmapset.id}/covers/list.jpg`;

            const creatorNames = nomination.beatmapset_creators
                .map((c) => (c.id >= 4294000000 ? c.name : `[${c.name}](https://osu.ppy.sh/users/${c.id})`))
                .join(", ");

            const pollUrl = nomination.poll
                ? `https://osu.ppy.sh/community/forums/topics/${nomination.poll?.topic_id}`
                : null;

            const { diffNames, reverseExclude } = NewsService.getHighlightedDiffNames(nomination);

            const description = `*mapped by ${creatorNames}* ${
                pollUrl ? `\n### [📋 Vote for this map here!](${pollUrl})` : ""
            }`;

            const embed = new EmbedBuilder()
                .setTitle(`🩷 ${nomination.beatmapset.artist} - ${nomination.beatmapset.title}`)
                .setUrl(`https://osu.ppy.sh/beatmapsets/${nomination.beatmapset.id}`)
                .setDescription(description)
                .setColor(WEBHOOK_COLORS.lightPink)
                .setThumbnail(coverUrl);

            if (diffNames.length > 0) {
                const diffList = diffNames.map((diff) => `- ${diff}`).join("\n");
                const fieldTitle = reverseExclude ? "Nominated Difficulties" : "Excluded Difficulties";
                embed.addField(fieldTitle, diffList, true);
            }

            webhook.addEmbed(embed);
        }

        // build main info embed
        const mainTopicId = modeTopicsResponse.data.topics[mode.id]?.topic_id ?? 0;

        const mainInfo = `
        - [**Click here to view the main forum topic!**](<https://osu.ppy.sh/community/forums/topics/${mainTopicId}>)\n- [**Click here to download all of this round's picks!**](${NewsService.packUrl(
            roundInfo.allNominations[0].round_id,
            roundInfo.name,
            mode
        )})
        `;

        const mainInfoEmbed = new EmbedBuilder().setDescription(mainInfo.trim()).setColor(WEBHOOK_COLORS.pink);

        webhook.addEmbed(mainInfoEmbed);

        await webhook.sendChunked();

        const video = roundInfo.extraGameModeInfo[mode.id].video;

        if (video) {
            const videoWebhook = new WebhookBuilder()
                .setWebhookUrl(webhookUrl)
                .setUsername(USERNAME)
                .setMessage(`[Video Preview](${video})`);

            await videoWebhook.send();
        }

        log.dim().success(`Sent poll start announcements for mode ${mode.shortName}`);
    }
}

export async function createPollEndAnnouncement(roundInfo: RoundInfo) {
    const config = await loadConfig();

    // write round info to a json file
    await writeFile(`round-info-.json`, JSON.stringify(roundInfo, null, 2));

    // Parse through each mode
    for (const mode of Ruleset.all()) {
        const webhookUrl = getWebhookUrl(mode, config, roundInfo.discordWebhooks);

        const filteredNominations = roundInfo.nominations.filter((n) => n.game_mode.id === mode.id);

        if (filteredNominations.length === 0) {
            log.warning(`No nominations found for mode ${mode.shortName}, skipping...`);
            continue;
        }

        const webhook = new WebhookBuilder().setWebhookUrl(webhookUrl).setUsername(USERNAME).setMessage(END_MESSAGE);

        for (const nomination of filteredNominations) {
            const description = `**${formatPercent(nomination.poll?.yesRatio ?? 0)}** — ${nomination.poll?.result_yes ?? 0}:${nomination.poll?.result_no ?? 0}`;
            const embed = new EmbedBuilder()
                .setTitle(`${nomination.poll?.passed ? "💚" : "💔"} ${nomination.beatmapset.artist} - ${nomination.beatmapset.title}`)
                .setUrl(`https://osu.ppy.sh/beatmapsets/${nomination.beatmapset.id}`)
                .setDescription(description)
                .setColor(nomination.poll?.passed ? WEBHOOK_COLORS.green : WEBHOOK_COLORS.red);

            webhook.addEmbed(embed);
        }

        await webhook.sendChunked();

        log.dim().success(`Sent poll end announcements for mode ${mode.shortName}`);
    }
}
