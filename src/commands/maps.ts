import { Command } from "commander";
import { mapsDownloadCommand } from "./maps-download.js";
import { mapsOpenCommand } from "./maps-open.js";

export const mapsCommand = new Command("maps")
    .description("Beatmapset-related commands")
    .addCommand(mapsDownloadCommand)
    .addCommand(mapsOpenCommand);
