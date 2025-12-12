/**
 * User information from the osu! API
 */
export interface User {
    id: number;
    name: string;
    banned?: boolean;
}

/**
 * Beatmap information
 */
export interface Beatmap {
    id: number;
    version: string;
    game_mode: number;
    star_rating: number;
    bpm: number;
    total_length: number;
    key_mode?: number;
    excluded: boolean | number;
}

/**
 * Beatmapset information
 */
export interface Beatmapset {
    id: number;
    artist: string;
    title: string;
    creator_id: number;
    creator_name: string;
    original_artist?: string;
    original_title?: string;
    bgPath?: string;
}

/**
 * Poll information for a nomination
 */
export interface Poll {
    topic_id: number;
    ended_at: string;
    result_yes?: number;
    result_no?: number;
}
