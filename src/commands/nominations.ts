import { Command } from "commander";
import { nominationsDeleteCommand } from "./nominations/delete";

export const nominationsCommand = new Command("nominations")
    .description("Nomination-related commands")
    .addCommand(nominationsDeleteCommand);
