// Export config types
export type { Config } from "../config";

// Export osu! game data types
export type { User, Beatmap, Beatmapset, Poll } from "./osu";

// Export loved.sh API types
export type { Nomination, GameModeExtraInfo, RoundInfo } from "./loved";

// Export Discord types
export type { DiscordEmbed, DiscordAuthor, DiscordField } from "./discord";

// Export admin.loved.sh API types
export type {
    AdminApiResponse,
    MessageData,
    ChatChannel,
    ChatAnnouncementActionData,
    ForumEditPostActionData,
    ForumEditTopicTitleActionData,
    ForumPinThreadActionData,
    ActionMetadata,
    AdminAction,
    MessageResponseData,
    PollStartResponseData,
    PollEndForumResponseData,
    PollEndChatResponseData,
    TopicInfo,
    TopicsResponseData,
    MessageResponse,
    PollStartResponse,
    PollEndForumResponse,
    PollEndChatResponse,
    TopicsResponse,
    AdminPermissionGrantResponse,
    AdminPermissionGrantResponseData,
} from "./admin-api";
