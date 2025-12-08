import { Command } from "commander";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import axios from "axios";
import { loadConfig } from "../config";
import { LovedWebClient } from "../clients/LovedWebClient";
import { Logger,logAndExit } from "../utils/logger";
import { tryUpdate } from "../utils/git-update";
import { sleep } from "../utils/misc";
import { BannerService } from "../services/BannerService";

const log = new Logger("maps-download");

export const mapsDownloadCommand = new Command("download")
    .description("Download beatmapset background images from osu!")
    .option("-r, --round <id>", "Override the round ID from config", parseInt)
    .option("--skip-update", "Skip checking for updates")
    .action(async (options) => {
        if (!options.skipUpdate) {
            await tryUpdate();
        }

        const config = await loadConfig();
        const roundId = options.round ?? config.lovedRoundId;

        const lovedWeb = new LovedWebClient(config.lovedWebBaseUrl, config.lovedWebApiKey);
        const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);

        const beatmapsetIds = roundInfo.nominations.map((n) => n.beatmapset_id);
        const beatmapsetIdSet = new Set(beatmapsetIds);
        const cacheKey = Math.floor(Date.now() / 1000);

        // Create the backgrounds directory for this round
        const backgroundDir = BannerService.getBackgroundsDir(roundId);
        await mkdir(backgroundDir, { recursive: true });

        log.info(`Downloading backgrounds to ${backgroundDir}`);
        log.dim().info(`Downloading backgrounds for ${beatmapsetIdSet.size} beatmapsets...`);

        const downloadPromises = [...beatmapsetIdSet].map(async (beatmapsetId) => {
            try {
                const response = await axios.get(
                    `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/fullsize.jpg?${cacheKey}`,
                    { responseType: "arraybuffer" }
                );
                await writeFile(join(backgroundDir, `${beatmapsetId}.jpg`), response.data);
                log.dim().success(`Downloaded background for beatmapset #${beatmapsetId}`);
                await sleep(500);
            } catch (error) {
                if (axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404)) {
                    log.warning(`Beatmapset #${beatmapsetId} does not have a background`);
                } else {
                    logAndExit(error);
                }
            }
        });

        await Promise.all(downloadPromises);
        log.success(`Done downloading backgrounds to ${backgroundDir}`);
    });
