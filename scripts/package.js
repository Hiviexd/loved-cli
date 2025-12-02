#!/usr/bin/env node

/**
 * Multi-platform packaging script for Project Loved CLI
 *
 * Creates platform-specific distributable archives containing:
 * - dist/ (compiled TypeScript)
 * - resources/
 * - config/ (with example config)
 * - package.json
 * - node_modules/ (production dependencies, platform-specific)
 * - Platform-specific launcher script
 *
 * Packages are ready to run out of the box - no installation required!
 */

const { execSync } = require("child_process");
const fs = require("fs");
const { join, dirname, resolve } = require("path");
const archiver = require("archiver");

const PLATFORMS = {
    windows: {
        name: "windows",
        buildDir: "build/win",
        archiveName: "project-loved-windows.zip",
        launcherName: "loved.cmd",
        launcherContent: `@echo off
node "%~dp0dist\\index.js" %*
`,
    },
    linux: {
        name: "linux",
        buildDir: "build/linux",
        archiveName: "project-loved-linux.zip",
        launcherName: "loved",
        launcherContent: `#!/usr/bin/env node
node "$(dirname "$0")/dist/index.js" "$@"
`,
    },
    macos: {
        name: "macos",
        buildDir: "build/macos",
        archiveName: "project-loved-macos.zip",
        launcherName: "loved",
        launcherContent: `#!/usr/bin/env node
node "$(dirname "$0")/dist/index.js" "$@"
`,
    },
};

/**
 * Recursively copy a directory
 */
function copyDir(src, dest) {
    const stats = fs.statSync(src);
    if (!stats.isDirectory()) {
        throw new Error(`${src} is not a directory`);
    }

    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Create a zip archive
 */
function createZip(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", {
            zlib: { level: 9 },
        });

        output.on("close", () => {
            console.log(`✓ Created ${outputPath} (${archive.pointer()} bytes)`);
            resolve();
        });

        archive.on("error", (err) => {
            reject(err);
        });

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

/**
 * Package for a specific platform
 */
async function packagePlatform(platform) {
    console.log(`\n📦 Packaging for ${platform.name}...`);

    const buildDir = resolve(platform.buildDir);
    const rootDir = resolve(__dirname, "..");

    // Clean and create build directory
    if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(buildDir, { recursive: true });

    // Copy dist/
    console.log("  Copying dist/...");
    if (!fs.existsSync(join(rootDir, "dist"))) {
        throw new Error("dist/ directory not found. Run 'pnpm build' first.");
    }
    copyDir(join(rootDir, "dist"), join(buildDir, "dist"));

    // Copy resources/
    console.log("  Copying resources/...");
    copyDir(join(rootDir, "resources"), join(buildDir, "resources"));

    // Copy config/ (with example config)
    console.log("  Copying config/...");
    fs.mkdirSync(join(buildDir, "config"), { recursive: true });
    if (fs.existsSync(join(rootDir, "config", "config.example.json"))) {
        fs.copyFileSync(
            join(rootDir, "config", "config.example.json"),
            join(buildDir, "config", "config.example.json")
        );
    }

    // Copy package.json
    console.log("  Copying package.json...");
    fs.copyFileSync(join(rootDir, "package.json"), join(buildDir, "package.json"));

    // Copy pnpm-lock.yaml for consistent dependency installation
    if (fs.existsSync(join(rootDir, "pnpm-lock.yaml"))) {
        console.log("  Copying pnpm-lock.yaml...");
        fs.copyFileSync(join(rootDir, "pnpm-lock.yaml"), join(buildDir, "pnpm-lock.yaml"));
    }

    // Install production dependencies (includes platform-specific native modules)
    console.log("  Installing production dependencies...");
    try {
        execSync("pnpm install --prod --frozen-lockfile", {
            cwd: buildDir,
            stdio: "inherit",
            env: { ...process.env, CI: "true" }, // Set CI to avoid interactive prompts
        });
        console.log("  ✓ Dependencies installed");
    } catch (error) {
        throw new Error(`Failed to install dependencies: ${error.message}`);
    }

    // Create launcher script
    console.log(`  Creating launcher script (${platform.launcherName})...`);
    const launcherPath = join(buildDir, platform.launcherName);
    fs.writeFileSync(launcherPath, platform.launcherContent, "utf8");

    // Make launcher executable on Unix-like systems
    if (platform.name !== "windows") {
        try {
            fs.chmodSync(launcherPath, 0o755);
        } catch (err) {
            console.warn(`  Warning: Could not set executable permissions on ${platform.launcherName}`);
        }
    }

    // Create zip archive
    console.log(`  Creating archive ${platform.archiveName}...`);
    const archivePath = join(rootDir, platform.archiveName);
    await createZip(buildDir, archivePath);

    console.log(`✓ Successfully packaged ${platform.name}`);
}

/**
 * Main packaging function
 */
async function main() {
    console.log("🚀 Starting multi-platform packaging...\n");

    const rootDir = resolve(__dirname, "..");

    // Step 1: Build TypeScript
    console.log("📝 Building TypeScript...");
    try {
        execSync("pnpm build", { cwd: rootDir, stdio: "inherit" });
        console.log("✓ TypeScript build completed\n");
    } catch (error) {
        console.error("✗ TypeScript build failed");
        process.exit(1);
    }

    // Step 2: Package for each platform
    const targetPlatform = process.argv[2];
    const platforms = targetPlatform ? [PLATFORMS[targetPlatform]].filter(Boolean) : Object.values(PLATFORMS);

    if (targetPlatform && !PLATFORMS[targetPlatform]) {
        console.error(`✗ Unknown platform: ${targetPlatform}`);
        console.error(`  Available platforms: ${Object.keys(PLATFORMS).join(", ")}`);
        process.exit(1);
    }

    for (const platform of platforms) {
        try {
            await packagePlatform(platform);
        } catch (error) {
            console.error(`✗ Failed to package ${platform.name}:`, error.message);
            process.exit(1);
        }
    }

    console.log("\n✅ All platforms packaged successfully!");
    console.log("\nGenerated archives:");
    for (const platform of platforms) {
        console.log(`  - ${platform.archiveName}`);
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch((error) => {
        console.error("✗ Packaging failed:", error);
        process.exit(1);
    });
}

module.exports = { packagePlatform, PLATFORMS };
