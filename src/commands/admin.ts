import { Command } from "commander";
import { adminGrantCommand } from "./admin/grant";
import { adminKeyCommand } from "./admin/key";

export const adminCommand = new Command("admin")
    .description("Admin-related commands")
    .addCommand(adminGrantCommand)
    .addCommand(adminKeyCommand);
