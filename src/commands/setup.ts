import { Command } from "commander";
import { constants, copyFile, mkdir } from "node:fs/promises";
import chalk from "chalk";

export const setupCommand = new Command("setup")
    .description("Initialize the project configuration")
    .action(async () => {
        await mkdir("config", { recursive: true });

        try {
            await copyFile("config/config.example.json", "config/config.json", constants.COPYFILE_EXCL);
            console.log(chalk.green("Created config/config.json from example"));
        } catch {
            console.log(chalk.yellow("config/config.json already exists"));
        }

        console.log(chalk.green("Setup complete"));
        console.log(chalk.dim("Edit config/config.json to configure the application"));
    });
