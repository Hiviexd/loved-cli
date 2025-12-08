import { Command } from "commander";
import { loadConfig } from "../../config";
import { LovedAdminClient } from "../../clients/LovedAdminClient";
import { Logger, logAndExit } from "../../utils/logger";

const log = new Logger("admin-grant");

export const adminGrantCommand = new Command("grant")
    .description("Grant loved.sh web admin permissions to a user")
    .argument("<userId>", "The osu! user ID to grant admin permissions to", parseInt)
    .action(async (userId: number) => {
        const config = await loadConfig();
        const lovedAdmin = new LovedAdminClient(config.lovedAdminBaseUrl, config.lovedAdminApiKey);

        log.info(`Granting admin permissions to user #${userId}...`);
        const response = await lovedAdmin.grantAdminPermissions(userId).catch(logAndExit);

        if (response.success) {
            log.success(
                `Successfully granted admin permissions to ${response.data.user.name} (ID: ${response.data.user.id})`
            );
            if (response.data.privileged) {
                log.dim().info("User is now privileged");
            }
        } else {
            logAndExit(new Error(response.message || "Failed to grant admin permissions"));
        }
    });
