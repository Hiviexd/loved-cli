import { Command } from "commander";
import { mapsDownloadCommand } from "./maps-download";
import { mapsOpenCommand } from "./maps-open";

export const mapsCommand = new Command("maps")
    .description("Beatmapset-related commands")
    .addCommand(mapsDownloadCommand)
    .addCommand(mapsOpenCommand);
