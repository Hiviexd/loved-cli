import { readFile } from "node:fs/promises";
import { join } from "node:path";
import nunjucks from "nunjucks";

/**
 * Service for loading and rendering text templates using Nunjucks
 */
export class TemplateService {
    private env: nunjucks.Environment;

    constructor(private resourcesPath: string = "resources") {
        // Configure nunjucks with autoescape disabled (we handle escaping ourselves)
        this.env = nunjucks.configure(resourcesPath, {
            autoescape: false,
            trimBlocks: true,
            lstripBlocks: true,
        });
    }

    /**
     * Loads a template file from the resources directory
     */
    async loadTemplate(basename: string): Promise<string> {
        return readFile(join(this.resourcesPath, basename), "utf8");
    }

    /**
     * Renders a template string with variable substitution
     *
     * @param template - The template string
     * @param vars - Variables to substitute
     */
    render(template: string, vars: Record<string, unknown>): string {
        return this.env.renderString(template, vars).trim();
    }

    /**
     * Renders a template file with variable substitution
     *
     * @param templateName - The template file name
     * @param vars - Variables to substitute
     */
    renderFile(templateName: string, vars: Record<string, unknown>): string {
        return this.env.render(templateName, vars).trim();
    }
}

// Export singleton instance for convenience
export const templateService = new TemplateService();
