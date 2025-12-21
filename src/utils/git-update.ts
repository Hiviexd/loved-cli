import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { platform } from "node:process";
import { Logger } from "./logger";
import { loadConfig } from "../config";

const log = new Logger("git-update");

const updateCachePath = "config/update-cache";

/**
 * Checks for git updates and applies them if available
 * @param force - Force check even if recently checked
 */
export async function tryUpdate(): Promise<void> {
    const config = await loadConfig();

    if (!config.updates) {
        log.dim().info("Skipping update check: disabled in config");
        return;
    }

    // Don't check for updates more than once every 6 hours
    // This was ported from the original CLI, but this is stupid
    /*
    if (!force) {
        const updateCache = await readFile(updateCachePath, "utf8").catch(() => "0");
        const lastUpdateTime = Number.parseInt(updateCache, 10);

        if (!Number.isNaN(lastUpdateTime) && Date.now() - lastUpdateTime < 1000 * 60 * 60 * 6) {
            return;
        }
    }
        */

    // Check execute permission for git and npm
    if (
        spawnSync("git", ["--version"]).error != null ||
        spawnSync("pnpm", ["--version"], { shell: platform === "win32" }).error != null
    ) {
        log.warning("Skipping update check: missing git or pnpm");
        return;
    }

    // Check repository status
    if (spawnSync("git", ["symbolic-ref", "--short", "HEAD"]).stdout.toString().trim() !== "main") {
        log.warning("Skipping update check: branch not set to main");
        return;
    }

    if (spawnSync("git", ["diff", "--quiet"]).status !== 0) {
        log.warning("Skipping update check: working directory not clean");
        return;
    }

    // Check for and apply updates
    log.info("Checking for updates...");

    spawnSync("git", ["fetch", "--quiet"]);
    const update = spawnSync("git", ["diff", "--quiet", "..FETCH_HEAD"]).status === 1;

    if (update) {
        spawnSync("git", ["merge", "--ff-only", "--quiet", "FETCH_HEAD"]);

        const commitHash = spawnSync("git", ["show", "--format=%h", "--no-patch", "HEAD"]).stdout.toString().trim();
        log.success(`Updated to ${commitHash}`);

        spawnSync("pnpm", ["install"], { shell: platform === "win32", stdio: "ignore" });
        log.success("Installed/upgraded node packages");
    } else {
        log.info("No update found");
    }

    // Save last update time
    await writeFile(updateCachePath, `${Date.now()}\n`);

    // Restart program if updated
    if (update) {
        log.warning("Restarting...\n");
        spawnSync(process.argv[0], process.argv.slice(1), { stdio: "inherit" });
        process.exit();
    }
}
