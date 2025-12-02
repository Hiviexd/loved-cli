import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs"],
    target: "node18",
    outDir: "dist",
    clean: true,
    bundle: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    dts: true,
    // Exclude native modules from bundling - they must be installed separately
    external: ["sharp", "canvas"],
    // Bundle all other dependencies (don't externalize them)
    // This regex matches all packages except sharp and canvas
    noExternal: [/^(?!sharp|canvas).*$/],
    // Keep shebang in bundled output
    banner: {
        js: "#!/usr/bin/env node",
    },
});
