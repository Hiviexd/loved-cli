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
 * Topic information
 */
export interface TopicInfo {
    topic_id: number;
    post_id: number;
    created_at: string;
}

/**
 * Response data for topics operations
 */
export interface TopicsResponseData {
    round_id: number;
    topics: Record<string, TopicInfo>;
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

/**
 * Typed response for /rounds/:roundId/topics endpoint
 */
export type TopicsResponse = AdminApiResponse<TopicsResponseData>;
