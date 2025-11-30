import { Command } from "commander";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import axios from "axios";
import chalk from "chalk";
import { loadConfig } from "../config";
import { LovedWebService } from "../services/LovedWebService";
import { logAndExit, logWarning, logSuccess, logInfo } from "../utils/logger";
import { tryUpdate } from "../utils/git-update";
import { BannerService } from "../services/BannerService";

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

        const lovedWeb = new LovedWebService(config.lovedBaseUrl, config.lovedApiKey);
        const roundInfo = await lovedWeb.getRoundInfo(roundId).catch(logAndExit);

        const beatmapsetIds = roundInfo.nominations.map((n) => n.beatmapset_id);
        const beatmapsetIdSet = new Set(beatmapsetIds);
        const cacheKey = Math.floor(Date.now() / 1000);

        // Create the backgrounds directory for this round
        const backgroundDir = new BannerService().getBackgroundsDir(roundId);
        await mkdir(backgroundDir, { recursive: true });

        logInfo(`Downloading backgrounds to ${backgroundDir}`);
        console.log(chalk.dim(`Downloading backgrounds for ${beatmapsetIdSet.size} beatmapsets...`));

        const downloadPromises = [...beatmapsetIdSet].map(async (beatmapsetId) => {
            try {
                const response = await axios.get(
                    `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/fullsize.jpg?${cacheKey}`,
                    { responseType: "arraybuffer" }
                );
                await writeFile(join(backgroundDir, `${beatmapsetId}.jpg`), response.data);
                logSuccess(`Downloaded background for beatmapset #${beatmapsetId}`);
            } catch (error) {
                if (axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404)) {
                    logWarning(`Beatmapset #${beatmapsetId} does not have a background`);
                } else {
                    logAndExit(error);
                }
            }
        });

        await Promise.all(downloadPromises);
        console.log(chalk.green(`Done downloading backgrounds to ${backgroundDir}`));
    });
