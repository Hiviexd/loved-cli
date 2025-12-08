import { Command } from "commander";
import open from "open";
import { loadConfig } from "../../config";
import { LovedWebClient } from "../../clients/LovedWebClient";
import { Logger,logAndExit } from "../../utils/logger";
import { tryUpdate } from "../../utils/git-update";
import { sleep } from "../../utils/misc";

const log = new Logger("maps-open");

export const mapsOpenCommand = new Command("open")
    .description("Open all nominated beatmapsets in the browser")
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

        log.info(`Opening ${beatmapsetIdSet.size} beatmapsets in browser...`);

        for (const beatmapsetId of beatmapsetIdSet) {
            await open(`https://osu.ppy.sh/beatmapsets/${beatmapsetId}`);
            log.dim().success(`Opened beatmapset #${beatmapsetId}`);
            await sleep(500);
        }
        log.success("Done opening beatmapsets in browser");
    });
