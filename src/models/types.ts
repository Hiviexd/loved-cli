// Config types are now defined in src/config.ts via zod schema
// Re-export them for convenience
export type { Config, Messages, LoadedConfig } from "../config";

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
    yesRatio?: number;
    passed?: boolean;
}

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
    game_mode: import("./Ruleset.js").default;
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
    discordWebhooks: Record<number, string>;
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

/**
 * Discord embed structure
 */
export interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
    url?: string;
}

/**
 * Token cache for API authentication
 */
export interface TokenCache {
    token: string;
    expiresAt: Date | null;
}

// Admin API Response Types

/**
 * Base response structure for admin API endpoints
 */
export interface AdminApiResponse<T = unknown> {
    success: boolean;
    data: T;
}

/**
 * Message data for notifications to mappers
 */
export interface MessageData {
    id: number;
    beatmapset_id: number;
    messages: string[];
    recipients: number[];
}

/**
 * Channel information for chat announcements
 */
export interface ChatChannel {
    name: string;
    description: string;
}

/**
 * Chat announcement action data
 */
export interface ChatAnnouncementActionData {
    channel: ChatChannel;
    recipients: number[];
    messages: string[];
}

/**
 * Forum edit post action data
 */
export interface ForumEditPostActionData {
    post_id: number;
    content: string;
}

/**
 * Forum edit topic title action data
 */
export interface ForumEditTopicTitleActionData {
    topic_id: number;
    title: string;
}

/**
 * Forum pin thread action data
 */
export interface ForumPinThreadActionData {
    topic_id: number;
    pin: boolean;
}

/**
 * Action metadata for admin operations
 */
export interface ActionMetadata {
    nomination_id?: number;
    beatmapset_id?: number;
    mode?: number;
    modes?: number[];
    is_main_thread?: boolean;
    child_count?: number;
}

/**
 * Admin action structure
 */
export interface AdminAction {
    type: "chat.createAnnouncementChannel" | "forum.editPost" | "forum.editTopicTitle" | "forum.pinThread";
    data:
        | ChatAnnouncementActionData
        | ForumEditPostActionData
        | ForumEditTopicTitleActionData
        | ForumPinThreadActionData;
    metadata: ActionMetadata;
}

/**
 * Response data for message operations
 */
export interface MessageResponseData {
    messages: MessageData[];
    actions: AdminAction[];
}

/**
 * Response data for poll start operations
 */
export interface PollStartResponseData {
    actions: AdminAction[];
}

/**
 * Response data for poll end forum operations
 */
export interface PollEndForumResponseData {
    messages: MessageData[];
    actions: AdminAction[];
}

/**
 * Response data for poll end chat operations
 */
export interface PollEndChatResponseData {
    messages: MessageData[];
    actions: AdminAction[];
}

/**
 * Typed response for /rounds/:roundId/messages endpoint
 */
export type MessageResponse = AdminApiResponse<MessageResponseData>;

/**
 * Typed response for /polls/:roundId/start endpoint
 */
export type PollStartResponse = AdminApiResponse<PollStartResponseData>;

/**
 * Typed response for /polls/:roundId/end/forum endpoint
 */
export type PollEndForumResponse = AdminApiResponse<PollEndForumResponseData>;

/**
 * Typed response for /polls/:roundId/end/chat endpoint
 */
export type PollEndChatResponse = AdminApiResponse<PollEndChatResponseData>;
