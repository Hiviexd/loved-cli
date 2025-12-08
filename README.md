# Project Loved CLI

A command-line tool for managing [Project Loved](https://osu.ppy.sh/wiki/en/Community/Project_Loved) operations including news generation, forum thread management, mapper notifications, and voting results processing.

This project is the successor to clayton's [Project Loved CLI](https://github.com/cl8n/project-loved), rewritten with safety, flexibility, and code readability in mind.

## Requirements

- Node.js >= 18 (developed with 22.19.0)
- pnpm (npm install -g pnpm)

### Recommended

- Node Version Manager (nvm) or nvm-windows

## Installation

```bash
pnpm install
```

## Configuration

Run the interactive setup to configure the application:

```bash
pnpm loved setup
```

This will prompt you for the following required fields:

- **loved.sh API Key** - API key from loved.sh
- **loved.sh Admin API Key** - API key provided to admins directly (ask Hivie)
- **osu-wiki repository path** - local path to your osu-wiki fork
- **loved round ID** - the current Loved round ID (must update manually every round)
- **Enable automatic Git update checks** - whether to check for script updates automatically

The configuration is stored in `config/config.json`. You can also edit this file directly.

### Configuration Fields

| Field | Description | Required | Default |
|-------|-------------|----------|----------|
| `lovedWebApiKey` | loved.sh API key | ✅ | - |
| `lovedWebBaseUrl` | loved.sh base URL | ✅ | `https://loved.sh` |
| `lovedAdminApiKey` | loved.sh admin API key | ✅ | - |
| `lovedAdminBaseUrl` | loved.sh admin base URL | ✅ | `https://admin.loved.sh` |
| `lovedRoundId` | Current round ID | ✅ | - |
| `osuBaseUrl` | osu! base URL | ✅ | `https://osu.ppy.sh` |
| `osuWikiPath` | Path to osu-wiki repository | ✅ | - |
| `updates` | Enable automatic Git update checks | ✅ | `true` |
| `bannerTitleOverrides` | Custom banner titles by beatmapset ID | ❌ | - |
| `webhookOverrides` | Custom webhook URLs by mode | ❌ | - |

`bannerTitleOverrides` is an object of key-value pairs, where the key is the beatmapset ID and the value is the banner title.

```json
{
    "524026": "Custom Banner Title",
    "396221": "Another Custom Title"
}
```

`webhookOverrides` is an array of objects, where each object has a `mode` property (one of `osu`, `taiko`, `catch`, `mania`) and a `url` property. (see `config/config.example.json` for an example)

## Usage

```bash
pnpm loved <command> [options]
```

### Global options

- `-h, --help` Show help for a command
- `-r, --round <id>` Override the round ID from config
- `--skip-update` Skip automatic Git update check

## Commands

### setup

`pnpm loved setup`

Interactive wizard that writes `config/config.json`. Prompts for API keys, wiki path, round ID, and whether to enable automatic Git update checks.

---

### maps

Beatmapset commands.

- `pnpm loved maps download [options]` — download beatmapset backgrounds to `backgrounds/{roundId}/`.
  - `-r, --round <id>` Override round ID
  - `--skip-update` Skip Git update check
- `pnpm loved maps open [options]` — open all nominated beatmapsets in your browser.
  - `-r, --round <id>` Override round ID
  - `--skip-update` Skip Git update check

---

### messages

`pnpm loved messages [options]`

Send chat announcements to nominated mappers.

- `-r, --round <id>` Override round ID
- `--poll-start <guess>` Provide poll start time and skip the prompt
- `--dry-run` Preview without sending (outputs the operation logs in `logs/YYYY-MM-DD/HH-MM-SS-messages.json`)
- `--skip-update` Skip Git update check

---

### news

`pnpm loved news [options]`

Generate banners, news post, and optionally create forum threads / Discord announcements.

- `-r, --round <id>` Override round ID
- `--threads` Create forum threads and post Discord announcements
- `--banners-only` Only generate banners
- `--discord-only` Only post Discord announcements
- `--skip-banners` Skip banner generation
- `--skip-discord` Skip Discord announcements
- `--dry-run` Preview thread creation (requires `--threads`) (outputs the operation logs in `logs/YYYY-MM-DD/HH-MM-SS-poll-start.json`)
- `--skip-update` Skip Git update check

---

### results

`pnpm loved results [options]`

Process voting results (forum, chat, Discord, and loved.sh state).

- `-r, --round <id>` Override round ID
- `--force` Allow concluding polls despite timers (forum/chat only)
- `--skip-discord` Skip Discord announcements
- `--skip-threads` Skip forum operations
- `--skip-messages` Skip chat announcements
- `--discord-only` Only post Discord results
- `--threads-only` Only perform forum operations
- `--messages-only` Only send chat announcements
- `--dry-run` Preview without making changes (outputs the operation logs in `logs/YYYY-MM-DD/HH-MM-SS-poll-end.json`)
- `--skip-update` Skip Git update check
