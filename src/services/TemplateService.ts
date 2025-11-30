import { readFile } from "node:fs/promises";
import { join } from "node:path";
import nunjucks from "nunjucks";

/**
 * Service for loading and rendering text templates using Nunjucks
 */
export class TemplateService {
    private static readonly RESOURCES_PATH = "resources";
    private static env: nunjucks.Environment | null = null;

    /**
     * Initializes the nunjucks environment
     */
    private static initEnv(): void {
        if (this.env === null) {
            // Configure nunjucks with autoescape disabled (we handle escaping ourselves)
            this.env = nunjucks.configure(this.RESOURCES_PATH, {
                autoescape: false,
                trimBlocks: true,
                lstripBlocks: true,
            });
        }
    }

    /**
     * Loads a template file from the resources directory
     */
    public static async loadTemplate(basename: string): Promise<string> {
        return readFile(join(this.RESOURCES_PATH, basename), "utf8");
    }

    /**
     * Renders a template string with variable substitution
     *
     * @param template - The template string
     * @param vars - Variables to substitute
     */
    public static render(template: string, vars: Record<string, unknown>): string {
        this.initEnv();
        return this.env!.renderString(template, vars).trim();
    }

    /**
     * Renders a template file with variable substitution
     *
     * @param templateName - The template file name
     * @param vars - Variables to substitute
     */
    public static renderFile(templateName: string, vars: Record<string, unknown>): string {
        this.initEnv();
        return this.env!.render(templateName, vars).trim();
    }
}
