# Project Loved CLI

A command-line tool for managing [Project Loved](https://osu.ppy.sh/wiki/en/Community/Project_Loved) operations including news generation, forum thread management, mapper notifications, and voting results processing.

## Requirements

- Node.js 18+
- pnpm
- Git (for auto-updates)

## Installation

```bash
cd rewrite
pnpm install
```

## Configuration

Run the interactive setup to configure the application:

```bash
pnpm loved setup
```

This will prompt you for:
- **Bot API Client ID/Secret** - osu! API credentials (ask Hivie)
- **loved.sh API Key** - API key from loved.sh
- **loved.sh Base URL** - defaults to `https://loved.sh`
- **osu-wiki repository path** - local path to your osu-wiki fork

The configuration is stored in `config/config.json`. You can also edit this file directly.

### Configuration Fields

| Field | Description | Required |
|-------|-------------|----------|
| `botApiClient.id` | osu! bot API client ID | Yes |
| `botApiClient.secret` | osu! bot API client secret | Yes |
| `lovedWebApiKey` | loved.sh API key | Yes |
| `lovedWebBaseUrl` | loved.sh base URL | No (default: `https://loved.sh`) |
| `lovedRoundId` | Current round ID | Yes (set manually each round) |
| `osuBaseUrl` | osu! base URL | No (default: `https://osu.ppy.sh`) |
| `osuWikiPath` | Path to osu-wiki repository | Yes (for news generation) |
| `bannerTitleOverrides` | Custom banner titles by beatmapset ID | No |

## Usage

```bash
# Run with pnpm
pnpm loved <command> [options]

# Or after building
pnpm build
node dist/index.js <command> [options]
```

### Global Options

All commands support these options:
- `-r, --round <id>` - Override the round ID from config
- `--skip-update` - Skip checking for Git updates

---

## Commands

### `loved setup`

Initialize and configure the project interactively.

```bash
pnpm loved setup
```

---

### `loved maps download`

Download beatmapset background images from osu! for banner generation.

```bash
pnpm loved maps download [options]
```

Downloads backgrounds to `banners/{roundId}/` directory.

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --round <id>` | Override round ID |
| `--skip-update` | Skip Git update check |

---

### `loved maps open`

Open all nominated beatmapsets in your default browser.

```bash
pnpm loved maps open [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --round <id>` | Override round ID |
| `--skip-update` | Skip Git update check |

---

### `loved messages`

Send chat announcements to nominated mappers via osu! chat.

```bash
pnpm loved messages [options]
```

Prompts interactively for the poll start time (e.g., "next weekend", "soon").

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --round <id>` | Override round ID |
| `--poll-start <guess>` | Poll start time (skips prompt) |
| `--dry-run` | Preview messages without sending |
| `--skip-update` | Skip Git update check |

**Example:**
```bash
# Preview messages
pnpm loved messages --dry-run

# Send with custom poll start
pnpm loved messages --poll-start "this Saturday"
```

---

### `loved news`

Generate the news post markdown file and voting banners.

```bash
pnpm loved news [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --round <id>` | Override round ID |
| `--threads` | Also create forum threads |
| `--banners-only` | Only generate banners |
| `--skip-banners` | Skip banner generation |
| `--skip-discord` | Skip Discord announcements |
| `--dry-run` | Preview without making changes |
| `--skip-update` | Skip Git update check |

**Examples:**
```bash
# Generate news and banners
pnpm loved news

# Only generate banners
pnpm loved news --banners-only

# Generate news, banners, and create forum threads
pnpm loved news --threads

# Preview forum thread creation
pnpm loved news --threads --dry-run
```

**Output:**
- News post: `{osuWikiPath}/news/{year}/{date}-{title}.md`
- Banners: `{osuWikiPath}/wiki/shared/news/{date}-{title}/`

---

### `loved results`

Process voting results after polls close.

```bash
pnpm loved results [options]
```

This command:
1. Locks all voting topics
2. Unpins main topics
3. Saves poll results to loved.sh
4. Posts results to Discord
5. Sends chat notifications to mappers whose maps passed
6. Removes topic watches

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --round <id>` | Override round ID |
| `--skip-lock` | Skip locking topics |
| `--skip-unpin` | Skip unpinning main topics |
| `--skip-discord` | Skip Discord announcements |
| `--skip-chat` | Skip chat notifications to mappers |
| `--skip-unwatch` | Skip removing topic watches |
| `--lock-only` | Only lock topics |
| `--discord-only` | Only post Discord results |
| `--dry-run` | Preview without making changes |
| `--skip-update` | Skip Git update check |

**Examples:**
```bash
# Full results processing
pnpm loved results

# Preview all actions
pnpm loved results --dry-run

# Only lock topics
pnpm loved results --lock-only

# Only post Discord results
pnpm loved results --discord-only

# Skip Discord and chat notifications
pnpm loved results --skip-discord --skip-chat
```

---

## Typical Workflow

1. **Set the round ID** in `config/config.json`

2. **Download backgrounds**
   ```bash
   pnpm loved maps download
   ```

3. **Review maps** (optional)
   ```bash
   pnpm loved maps open
   ```

4. **Send mapper notifications**
   ```bash
   pnpm loved messages
   ```

5. **Generate news and forum threads**
   ```bash
   pnpm loved news --threads
   ```

6. **After voting closes, process results**
   ```bash
   pnpm loved results
   ```

---

## Development

```bash
# Run in development mode (with auto-reload)
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint
pnpm lint:fix
```

## Project Structure

```
rewrite/
├── config/
│   ├── config.example.json
│   └── config.json
├── banners/
│   └── {roundId}/          # Downloaded backgrounds
├── resources/
│   └── (templates, fonts)
├── src/
│   ├── index.ts            # CLI entry point
│   ├── config.ts           # Configuration loading (Zod)
│   ├── commands/           # CLI commands
│   ├── services/           # API services
│   ├── models/             # Types and models
│   └── utils/              # Utility functions
└── dist/                   # Compiled output
```

## License

ISC

