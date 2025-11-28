import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Service for loading and rendering text templates
 */
export class TemplateService {
    constructor(private resourcesPath: string = "resources") {}

    /**
     * Loads a template file from the resources directory
     */
    async loadTemplate(basename: string): Promise<string> {
        return readFile(join(this.resourcesPath, basename), "utf8");
    }

    /**
     * Renders a template with variable substitution and script evaluation
     *
     * Supports two syntaxes:
     * - `{{variable}}` - Simple variable substitution
     * - `<?js code ?>` - JavaScript evaluation (result is inserted)
     *
     * @param template - The template string
     * @param vars - Variables to substitute
     */
    render(template: string, vars: Record<string, unknown>): string {
        return template
            .replace(/<\?(.+?)\?>/gs, (_, script: string) => {
                // vars is accessed by eval'd scripts
                const result = eval(script);
                return result == null ? "" : String(result);
            })
            .replace(/{{(.+?)}}/g, (match, key: string) => {
                const value = vars[key.trim()];
                return value == null ? match : String(value);
            })
            .trim();
    }
}

// Export singleton instance for convenience
export const templateService = new TemplateService();
