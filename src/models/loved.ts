import type { User, Beatmap, Beatmapset, Poll } from "./osu";
import type Ruleset from "./Ruleset.js";

/**
 * Nomination for the Loved category
 */
export interface Nomination {
    id: number;
    beatmapset_id: number;
    beatmapset: Beatmapset;
    beatmaps: Beatmap[];
    beatmapset_creators: User[];
    nominators: User[];
    description: string | null;
    description_author: User | null;
    description_state: number;
    game_mode: Ruleset;
    overwrite_artist?: string;
    overwrite_title?: string;
    parent_id: number | null;
    poll?: Poll;
}

/**
 * Extra information for a game mode in a round
 */
export interface GameModeExtraInfo {
    descriptionAuthors: User[];
    nominators: User[];
    threshold: number;
    thresholdFormatted: string;
    video: string | null;
}

/**
 * Round information from loved.sh
 */
export interface RoundInfo {
    allNominations: Nomination[];
    discordWebhooks: string[];
    extraGameModeInfo: Record<number, GameModeExtraInfo>;
    intro: string;
    introPreview: string;
    name: string;
    newsAuthorName: string;
    newsAuthorId: number;
    nominations: Nomination[];
    outro: string;
    postTime: Date;
    resultsPostIds: Record<number, number>;
    title: string;
    video: string | null;
    // Added during processing
    postDateString?: string;
    postTimeString?: string;
    postYear?: string;
    newsDirname?: string;
}
