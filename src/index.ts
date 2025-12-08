#!/usr/bin/env node

// Force color output
process.env.FORCE_COLOR = "2";

import { Command } from "commander";
import {
    setupCommand,
    mapsCommand,
    messagesCommand,
    newsCommand,
    resultsCommand,
    adminCommand,
    nominationsCommand,
} from "./commands/index";
import module from "../package.json";

const program = new Command();

program.name("loved").description("Project Loved management CLI").version(module.version);

program.addCommand(setupCommand);
program.addCommand(mapsCommand);
program.addCommand(messagesCommand);
program.addCommand(newsCommand);
program.addCommand(resultsCommand);
program.addCommand(adminCommand);
program.addCommand(nominationsCommand);

program.parse();
