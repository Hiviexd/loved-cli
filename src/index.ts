#!/usr/bin/env node

// Force color output
process.env.FORCE_COLOR = "2";

import { Command } from "commander";
import { setupCommand, mapsCommand, messagesCommand, newsCommand, resultsCommand } from "./commands/index.js";

const program = new Command();

program.name("loved").description("Project Loved management CLI").version("2.0.0");

program.addCommand(setupCommand);
program.addCommand(mapsCommand);
program.addCommand(messagesCommand);
program.addCommand(newsCommand);
program.addCommand(resultsCommand);

program.parse();
