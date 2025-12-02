#!/usr/bin/env node

/**
 * Multi-platform packaging script for Project Loved CLI
 *
 * Creates platform-specific distributable archives containing:
 * - dist/index.js (bundled CLI - all code bundled except native modules)
 * - resources/
 * - config/ (with example config)
 * - package.json (minimal - only native dependencies)
 * - node_modules/ (only native dependencies: sharp, canvas, and their deps)
 * - Platform-specific launcher script
 *
 * Packages are ready to run out of the box - no installation required!
 * All JavaScript dependencies are bundled, only native modules are external.
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

    // Copy bundled dist/index.js (and sourcemap if present)
    console.log("  Copying bundled dist/...");
    if (!fs.existsSync(join(rootDir, "dist", "index.js"))) {
        throw new Error("dist/index.js not found. Run 'pnpm build' first.");
    }
    fs.mkdirSync(join(buildDir, "dist"), { recursive: true });
    fs.copyFileSync(join(rootDir, "dist", "index.js"), join(buildDir, "dist", "index.js"));

    // Copy sourcemap if it exists
    if (fs.existsSync(join(rootDir, "dist", "index.js.map"))) {
        fs.copyFileSync(join(rootDir, "dist", "index.js.map"), join(buildDir, "dist", "index.js.map"));
    }

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

    // Create minimal package.json with only native dependencies
    console.log("  Creating minimal package.json...");
    const rootPackageJson = JSON.parse(fs.readFileSync(join(rootDir, "package.json"), "utf8"));
    const minimalPackageJson = {
        name: rootPackageJson.name,
        version: rootPackageJson.version,
        description: rootPackageJson.description,
        main: "dist/index.js",
        bin: {
            loved: "dist/index.js",
        },
        engines: rootPackageJson.engines,
        dependencies: {
            // Only include native dependencies that are excluded from bundling
            sharp: rootPackageJson.dependencies.sharp,
            canvas: rootPackageJson.dependencies.canvas,
        },
        // Note: We use npm for installation, so pnpm config is not needed
    };
    fs.writeFileSync(join(buildDir, "package.json"), JSON.stringify(minimalPackageJson, null, 2) + "\n");

    // Install only native dependencies (sharp, canvas) and their transitive deps
    // Use npm instead of pnpm to avoid .pnpm symlink issues in packaged distributions
    // npm creates a flat node_modules structure that works reliably when extracted
    console.log("  Installing native dependencies (sharp, canvas)...");
    try {
        execSync("npm install --production", {
            cwd: buildDir,
            stdio: "inherit",
            env: { ...process.env, CI: "true" }, // Set CI to avoid interactive prompts
        });
        console.log("  ✓ Native dependencies installed");
    } catch (error) {
        throw new Error(`Failed to install native dependencies: ${error.message}`);
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

    // Step 1: Build and bundle with tsup
    console.log("📦 Bundling with tsup...");
    try {
        execSync("pnpm build", { cwd: rootDir, stdio: "inherit" });
        console.log("✓ Bundle completed\n");
    } catch (error) {
        console.error("✗ Bundle failed");
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
