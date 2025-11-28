import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas, loadImage, registerFont, type Image } from "canvas";
import sharp from "sharp";
import { logWarning } from "../utils/logger.js";
import { formatPercent } from "../utils/formatting.js";

// Canvas dimensions
const UNSCALED_WIDTH = 670;
const UNSCALED_HEIGHT = 200;
const SCALES = [1, 2] as const;

/**
 * Service for creating voting banners with canvas and sharp
 */
export class BannerService {
    private cache: Set<string> = new Set();
    private cacheLoaded = false;
    private overlayImages: Record<number, Image> = {};

    constructor(private resourcesPath: string = "resources", private cachePath: string = "config/banner-cache") {}

    /**
     * Initializes the font for banner text
     */
    private initFont(): void {
        try {
            registerFont(join(this.resourcesPath, "Torus-Regular.otf"), { family: "Torus" });
        } catch {
            // Font may already be registered
        }
    }

    /**
     * Loads the banner cache from disk
     */
    private async loadCache(): Promise<void> {
        if (this.cacheLoaded) return;

        try {
            const contents = await readFile(this.cachePath, "utf8");
            this.cache = new Set(contents.split("\n").filter(Boolean));
        } catch {
            this.cache = new Set();
        }
        this.cacheLoaded = true;
    }

    /**
     * Saves the banner cache to disk
     */
    private async saveCache(): Promise<void> {
        await writeFile(this.cachePath, [...this.cache.values()].join("\n"));
    }

    /**
     * Loads an overlay image at the specified scale
     */
    private async loadOverlayImage(scale: number): Promise<Image> {
        if (!this.overlayImages[scale]) {
            const filename = `voting-overlay${scale > 1 ? `@${scale}x` : ""}.png`;
            this.overlayImages[scale] = await loadImage(join(this.resourcesPath, filename));
        }
        return this.overlayImages[scale];
    }

    /**
     * Creates voting banners for a beatmapset
     *
     * @param backgroundPath - Path to the background image
     * @param outputPath - Output path without extension (will create .jpg and @2x.jpg)
     * @param title - Title text to render on the banner
     * @returns true if banners were created, false if using cached
     */
    async createBanner(backgroundPath: string | null, outputPath: string, title: string): Promise<boolean> {
        if (!backgroundPath) {
            backgroundPath = join(this.resourcesPath, "voting-default-background.jpg");
        }

        if (!outputPath) {
            throw new Error("Output path not set");
        }

        this.initFont();
        await this.loadCache();

        // Check cache
        const backgroundBuffer = await readFile(backgroundPath);
        const cacheKey = createHash("md5")
            .update("4") // version identifier for image creation algorithm
            .update(backgroundBuffer)
            .update(title)
            .digest("hex");

        if (this.cache.has(cacheKey) && existsSync(`${outputPath}.jpg`) && existsSync(`${outputPath}@2x.jpg`)) {
            return false;
        }

        const backgroundImage = await loadImage(backgroundBuffer);

        // Position background to cover canvas
        const backgroundImageRatio = backgroundImage.width / backgroundImage.height;
        const canvasRatio = UNSCALED_WIDTH / UNSCALED_HEIGHT;
        let unscaledBackgroundImageWidth = UNSCALED_WIDTH;
        let unscaledBackgroundImageHeight = UNSCALED_HEIGHT;

        if (backgroundImageRatio < canvasRatio) {
            unscaledBackgroundImageHeight = UNSCALED_WIDTH / backgroundImageRatio;
        } else {
            unscaledBackgroundImageWidth = UNSCALED_HEIGHT * backgroundImageRatio;
        }

        const unscaledBackgroundImageX = (UNSCALED_WIDTH - unscaledBackgroundImageWidth) / 2;
        const unscaledBackgroundImageY = (UNSCALED_HEIGHT - unscaledBackgroundImageHeight) / 2;

        // Check and truncate title if needed (using 1x scale for measurement)
        const tempCanvas = createCanvas(UNSCALED_WIDTH, UNSCALED_HEIGHT);
        const tempContext = tempCanvas.getContext("2d");
        tempContext.font = "21px Torus";
        const titleMaxWidth = UNSCALED_WIDTH - 2 * 16;
        let displayTitle = title;

        const titleWidth = tempContext.measureText(title).width;
        if (titleWidth > titleMaxWidth) {
            const overflowPercent = formatPercent(titleWidth / titleMaxWidth - 1);
            logWarning(`Title is ${overflowPercent} wider than the available space. Truncating title: "${title}"`);

            // Truncate title to fit, adding ellipsis if needed
            let truncatedTitle = title;
            while (tempContext.measureText(truncatedTitle + "...").width > titleMaxWidth && truncatedTitle.length > 0) {
                truncatedTitle = truncatedTitle.slice(0, -1);
            }
            displayTitle = truncatedTitle.length < title.length ? truncatedTitle + "..." : truncatedTitle;
        }

        // Generate banners at each scale
        for (const scale of SCALES) {
            const width = UNSCALED_WIDTH * scale;
            const height = UNSCALED_HEIGHT * scale;
            const canvas = createCanvas(width, height);
            const context = canvas.getContext("2d");
            context.quality = "best";

            // Draw background
            context.drawImage(
                backgroundImage,
                unscaledBackgroundImageX * scale,
                unscaledBackgroundImageY * scale,
                unscaledBackgroundImageWidth * scale,
                unscaledBackgroundImageHeight * scale
            );

            // Draw overlay
            const overlayImage = await this.loadOverlayImage(scale);
            context.drawImage(overlayImage, 0, 0);

            // Draw title text
            context.fillStyle = "#fff";
            context.font = `${21 * scale}px Torus`;
            context.shadowBlur = 3 * scale;
            context.shadowColor = "rgba(0, 0, 0, 0.4)";
            context.shadowOffsetY = 3 * scale;
            context.textAlign = "right";
            context.textBaseline = "bottom";
            context.fillText(displayTitle, width - 16 * scale, height - 31 * scale);

            // Render to JPEG
            const buffer = canvas.toBuffer("image/jpeg", { quality: 1 });
            const outputFile = `${outputPath}${scale > 1 ? `@${scale}x` : ""}.jpg`;

            await sharp(buffer)
                .jpeg({
                    quality: 80,
                    mozjpeg: true, // Use mozjpeg for better compression
                })
                .toFile(outputFile);
        }

        this.cache.add(cacheKey);
        await this.saveCache();
        return true;
    }

    /**
     * Gets the default background path
     */
    getDefaultBackgroundPath(): string {
        return join(this.resourcesPath, "voting-default-background.jpg");
    }
}
