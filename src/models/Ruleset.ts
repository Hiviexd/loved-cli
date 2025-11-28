const linkNames = ["osu", "taiko", "fruits", "mania"] as const;
const longNames = ["osu!", "osu!taiko", "osu!catch", "osu!mania"] as const;
const shortNames = ["osu", "taiko", "catch", "mania"] as const;

export type RulesetId = 0 | 1 | 2 | 3;

/**
 * Represents an osu! game mode (ruleset)
 */
export default class Ruleset {
    readonly #id: RulesetId;

    /**
     * Returns all four rulesets
     */
    static all(): Ruleset[] {
        return ([0, 1, 2, 3] as const).map((m) => new Ruleset(m));
    }

    /**
     * Creates a Ruleset from an ID or name
     * @param rulesetId - Numeric ID (0-3) or string name
     */
    constructor(rulesetId: number | string) {
        if (typeof rulesetId === "number" && Number.isInteger(rulesetId) && rulesetId >= 0 && rulesetId <= 3) {
            this.#id = rulesetId as RulesetId;
        } else if (typeof rulesetId === "string") {
            const normalized = rulesetId.toLowerCase().trim();
            switch (normalized) {
                case "0":
                case "osu":
                case "osu!":
                case "osu!standard":
                case "osu!std":
                case "standard":
                case "std":
                    this.#id = 0;
                    break;
                case "1":
                case "osu!taiko":
                case "taiko":
                    this.#id = 1;
                    break;
                case "2":
                case "catch":
                case "catch the beat":
                case "ctb":
                case "fruits":
                case "osu!catch":
                case "osu!ctb":
                    this.#id = 2;
                    break;
                case "3":
                case "mania":
                case "osu!mania":
                    this.#id = 3;
                    break;
                default:
                    throw new RangeError(`The provided mode "${rulesetId}" is not valid`);
            }
        } else {
            throw new TypeError("The provided mode is neither an integer nor a string");
        }
    }

    /**
     * Numeric ID of the ruleset (0-3)
     */
    get id(): RulesetId {
        return this.#id;
    }

    /**
     * Link name used in osu! URLs (osu, taiko, fruits, mania)
     */
    get linkName(): string {
        return linkNames[this.#id];
    }

    /**
     * Full display name (osu!, osu!taiko, osu!catch, osu!mania)
     */
    get longName(): string {
        return longNames[this.#id];
    }

    /**
     * Short name (osu, taiko, catch, mania)
     */
    get shortName(): string {
        return shortNames[this.#id];
    }
}
