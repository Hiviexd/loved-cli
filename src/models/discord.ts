export interface DiscordAuthor {
    name: string;
    icon_url: string;
    url?: string;
}

export interface DiscordField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface DiscordEmbed {
    title?: string;
    url?: string;
    author?: DiscordAuthor;
    description?: string;
    color: number;
    fields?: DiscordField[];
    image?: {
        url: string;
    };
    thumbnail?: {
        url: string;
    };
    video?: {
        url: string;
    };
    timestamp?: Date;
    footer?: {
        text: string;
        icon_url?: string;
    };
}

export interface WebhookPayload {
    username?: string;
    avatar_url?: string;
    embeds?: DiscordEmbed[];
    content?: string;
}
