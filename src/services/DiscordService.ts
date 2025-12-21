import { hexToNumber } from "../utils/misc";
import { RoundInfo } from "../models/loved";
import { Config, loadConfig } from "../config";
import Ruleset from "../models/Ruleset";
import { WebhookBuilder } from "../utils/discord/WebhookBuilder";
import { Logger } from "../utils/logger";
import { EmbedBuilder } from "../utils/discord/EmbedBuilder";
import { NewsService } from "./NewsService";
import { LovedAdminClient } from "../clients/LovedAdminClient";
import { logAndExit } from "../utils/logger";
import { formatPercent } from "../utils/formatting";

const log = new Logger("discord");

/**
 * Webhook color constants
 */
const WEBHOOK_COLORS = {
    red: hexToNumber("#EE2629"),
    blue: hexToNumber("#008cff"),
    green: hexToNumber("#78b159"),
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
 * Service for creating Discord webhook announcements
 */
export class DiscordService {
    /**
     * Get the webhook URL for a given mode.
     * - If a webhook override is found in the config, return the override URL.
     * - Otherwise, return the url at the same index as the mode in the discordWebhooks array.
     */
    private static getWebhookUrl(mode: Ruleset, config: Config, discordWebhooks: string[]): string | undefined {
        const webhookOverride = config.webhookOverrides[mode.shortName];

        if (webhookOverride) {
            log.dim().info(`Using webhook override for mode: ${mode.longName}`);
            return webhookOverride;
        }

        return discordWebhooks[mode.id];
    }

    /**
     * Creates poll start announcements for all modes in a round
     */
    public static async createPollStartAnnouncement(
        roundInfo: RoundInfo,
        adminClient: LovedAdminClient
    ): Promise<void> {
        // Abort if any nomination is missing a poll
        if (roundInfo.nominations.some((n) => n.poll == null)) {
            logAndExit(
                log,
                "One or more nominations are missing a poll! Make sure threads have been created properly."
            );
        }

        const config = await loadConfig();
        const modeTopicsResponse = await adminClient
            .getModeTopics(roundInfo.allNominations[0].round_id)
            .catch(logAndExit);

        // Parse through each mode
        for (const mode of Ruleset.all()) {
            const webhookUrl = this.getWebhookUrl(mode, config, roundInfo.discordWebhooks);

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
                    .map((c) => (c.id >= 4294000000 ? c.name : `[${c.name}](${config.osuBaseUrl}/users/${c.id})`))
                    .join(", ");

                const pollUrl = nomination.poll
                    ? `${config.osuBaseUrl}/community/forums/topics/${nomination.poll?.topic_id}`
                    : null;

                const { diffNames, reverseExclude } = NewsService.getHighlightedDiffNames(nomination);

                const description = `Mapped by ${creatorNames} ${
                    pollUrl ? `\n### [📋 Vote for this map here!](${pollUrl})` : ""
                }`;

                const embed = new EmbedBuilder()
                    .setTitle(`🩷 ${nomination.beatmapset.artist} - ${nomination.beatmapset.title}`)
                    .setUrl(`${config.osuBaseUrl}/beatmapsets/${nomination.beatmapset.id}`)
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
            - [**Click here to view the main forum topic!**](<${
                config.osuBaseUrl
            }/community/forums/topics/${mainTopicId}>)\n- [**Click here to download all of this round's picks!**](${NewsService.packUrl(
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

            log.dim().success(`Sent poll start announcements for mode: ${mode.longName}`);
        }
    }

    /**
     * Creates poll end announcements for all modes in a round
     */
    public static async createPollEndAnnouncement(roundInfo: RoundInfo): Promise<void> {
        const config = await loadConfig();

        // Parse through each mode
        for (const mode of Ruleset.all()) {
            const webhookUrl = this.getWebhookUrl(mode, config, roundInfo.discordWebhooks);

            if (!webhookUrl) {
                log.warning(`No webhook URL found for mode ${mode.shortName}, skipping...`);
                continue;
            }

            const filteredNominations = roundInfo.nominations.filter((n) => n.game_mode.id === mode.id);

            if (filteredNominations.length === 0) {
                log.warning(`No nominations found for mode ${mode.shortName}, skipping...`);
                continue;
            }

            // get required pass threshold for this mode
            const requiredPassThreshold = roundInfo.extraGameModeInfo[mode.id].threshold;

            const webhook = new WebhookBuilder()
                .setWebhookUrl(webhookUrl)
                .setUsername(USERNAME)
                .setMessage(END_MESSAGE);

            for (const nomination of filteredNominations) {
                const resultYes = nomination.poll?.result_yes ?? 0;
                const resultNo = nomination.poll?.result_no ?? 0;
                const total = resultYes + resultNo;

                const yesRatio = total > 0 ? resultYes / total : 0;

                const passed = yesRatio >= requiredPassThreshold;

                const creatorNames = nomination.beatmapset_creators
                    .map((c) => (c.id >= 4294000000 ? c.name : `[${c.name}](${config.osuBaseUrl}/users/${c.id})`))
                    .join(", ");

                const description = `Mapped by ${creatorNames}\n\n- **${formatPercent(
                    yesRatio
                )}** — ${resultYes}:${resultNo}`;

                const coverUrl = `https://assets.ppy.sh/beatmaps/${nomination.beatmapset.id}/covers/list.jpg`;

                const embed = new EmbedBuilder()
                    .setTitle(
                        `${passed ? "💚" : "💔"} ${nomination.beatmapset.artist} - ${nomination.beatmapset.title}`
                    )
                    .setUrl(`${config.osuBaseUrl}/beatmapsets/${nomination.beatmapset.id}`)
                    .setDescription(description)
                    .setColor(passed ? WEBHOOK_COLORS.green : WEBHOOK_COLORS.red)
                    .setThumbnail(coverUrl);

                webhook.addEmbed(embed);
            }

            await webhook.sendChunked();

            log.dim().success(`Sent poll end announcements for mode: ${mode.longName}`);
        }
    }
}
