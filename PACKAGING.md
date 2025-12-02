# Packaging Guide

This document explains how to build and test platform-specific packages for Project Loved CLI.

## Overview

The packaging system creates distributable archives for Windows, Linux, and macOS. Each archive contains:
- `dist/` - Compiled TypeScript output
- `resources/` - Template files and assets
- `config/` - Configuration example file
- `package.json` - Project metadata
- `node_modules/` - Production dependencies (platform-specific, ready to use)
- Platform-specific launcher script (`loved.cmd` for Windows, `loved` for Unix)

**Packages are ready to run out of the box** - no installation required! Dependencies are pre-installed with platform-specific native modules.

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- All dependencies installed (`pnpm install`)

## Building Packages

### Build All Platforms

```bash
pnpm package
```

This will create three zip archives in the project root:
- `project-loved-windows.zip`
- `project-loved-linux.zip`
- `project-loved-macos.zip`

### Build Specific Platform

```bash
# Windows only
pnpm package:windows

# Linux only
pnpm package:linux

# macOS only
pnpm package:macos
```

## Local Testing on Windows

Since you're on Windows, you can test the Windows package directly. For Linux/macOS packages, you'll need to test in a VM or CI environment.

### Testing Windows Package

1. **Build the Windows package:**
   ```bash
   pnpm package:windows
   ```

2. **Extract the archive:**
   ```powershell
   Expand-Archive -Path project-loved-windows.zip -DestinationPath test-package -Force
   cd test-package
   ```

3. **Test the launcher (no installation needed!):**
   ```cmd
   loved.cmd --version
   ```

4. **Test a command:**
   ```cmd
   loved.cmd setup
   ```

5. **Verify file structure:**
   ```
   test-package/
   ├── dist/
   ├── resources/
   ├── config/
   │   └── config.example.json
   ├── node_modules/     (pre-installed, ready to use!)
   ├── package.json
   └── loved.cmd
   ```

### Testing Linux Package (on Windows)

To test the Linux package on Windows, you can use WSL (Windows Subsystem for Linux):

1. **Build the Linux package:**
   ```bash
   pnpm package:linux
   ```

2. **In WSL, extract and test:**
   ```bash
   unzip project-loved-linux.zip -d test-package-linux
   cd test-package-linux
   ./loved --version
   ```
   
   Note: Dependencies are already included - no installation needed!

### Testing macOS Package (on Windows)

For macOS testing, you'll need:
- A macOS VM (using VirtualBox/VMware)
- Or rely on GitHub Actions CI for macOS builds

## Testing Checklist

When testing a packaged archive, verify:

- [ ] Launcher script executes correctly
- [ ] `--version` command works
- [ ] `setup` command works (creates config directory)
- [ ] All commands can access `resources/` files
- [ ] Native dependencies (`sharp`, `canvas`) work correctly
- [ ] File paths resolve correctly (relative to package root)

## GitHub Actions

The packaging workflow runs automatically on:
- Push to `main` branch (as PR check)
- Tag push (e.g., `v2.0.0`)
- Manual workflow dispatch

Artifacts are uploaded and available for 30 days. Download them from the Actions tab in GitHub.

## Troubleshooting

### "dist/ directory not found"
- Run `pnpm build` first, or the packaging script will run it automatically

### Native dependencies don't work
- Ensure you're using the correct platform-specific package (native modules are platform-specific)
- Windows packages only work on Windows, Linux packages only on Linux, etc.
- If you extracted a package on the wrong platform, download the correct one

### Launcher script doesn't work
- **Windows**: Ensure `loved.cmd` is in the same directory as `dist/`
- **Linux/macOS**: Ensure `loved` has executable permissions (`chmod +x loved`)

### Path resolution issues
- The launcher scripts use relative paths. Ensure you run them from the package root directory
- Don't move `dist/`, `resources/`, or `config/` directories after extraction

## Package Contents

Each package includes everything needed to run the CLI:

- ✅ `dist/` - Compiled JavaScript (required)
- ✅ `resources/` - Templates and assets (required)
- ✅ `config/config.example.json` - Example configuration (required)
- ✅ `package.json` - Metadata and dependencies (required)
- ✅ `node_modules/` - Production dependencies with platform-specific native modules (pre-installed)
- ✅ Platform launcher - Entry point script (required)
- ❌ `src/` - Source files (not included)
- ❌ `tsconfig.json` - Build config (not needed at runtime)
- ❌ `.git/` - Git metadata (not included)

**No installation required!** Just extract and run. Dependencies are pre-installed with the correct platform-specific native modules (`sharp`, `canvas`, etc.).

