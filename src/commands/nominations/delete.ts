import { Command } from "commander";
import { loadConfig } from "../../config";
import { LovedAdminClient } from "../../clients/LovedAdminClient";
import { Logger, logAndExit } from "../../utils/logger";

const log = new Logger("nominations-delete");

export const nominationsDeleteCommand = new Command("delete")
    .description("Delete a nomination from a given round")
    .argument("<nominationId>", "The ID of the nomination to delete", parseInt)
    .action(async (nominationId: number) => {
        const config = await loadConfig();
        const lovedAdmin = new LovedAdminClient(config.lovedAdminBaseUrl, config.lovedAdminApiKey);

        log.info(`Deleting nomination #${nominationId}...`);
        const response = await lovedAdmin.deleteNomination(nominationId).catch(logAndExit);

        if (response.success) {
            log.success(`Successfully deleted nomination #${nominationId}`);
            if (response.message) {
                log.dim().info(response.message);
            }
        } else {
            logAndExit(new Error(response.message || "Failed to delete nomination"));
        }
    });
