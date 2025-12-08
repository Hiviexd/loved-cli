# How to Project Loved (CLI Edition)

This guide covers all CLI operations necessary to successfully run a Project Loved round.

> [!NOTE]
> This guide does not cover every command flag, see the [usage guide](README.md#usage) in the README for all options for each command.

## Setup

See the README [Requirements](README.md#requirements) and [Configuration](README.md#configuration) sections for setup instructions.

Make sure the round ID is always updated in the config whenever operating a new round.

## Messages

After picks are locked and beatmap creators are checked, run `pnpm loved messages` to send messages to the nominated mappers.

The command will prompt you for the poll start time. which you may either input there, or skip with the `--poll-start <guess>` flag.

### Debugging

You can use the `--dry-run` flag to preview the **message operations** without actually sending them. The operation logs will be outputted in `logs/YYYY-MM-DD/HH-MM-SS-messages.json`.

## News

> [!WARNING]
> This section assumes basic familiarity with git, GitHub, and the `osu-wiki` repository. You may ask any Project Loved coodinator for additional guidance.

First, make sure `osuWikiPath` is set in the config. In addition, make sure your `osu-wiki` fork is up to date.

Run `pnpm loved maps download` to download all beatmapset backgrounds to `backgrounds/{roundId}/`.

Then, run `pnpm loved news` to generate the news post and banners, which will be automatically added to your `osu-wiki` fork. You will need to commit the changes to your fork and PR it to the main `osu-wiki` repository.

When you're ready to finalize the news post release, run `pnpm loved news --threads` to create the forum threads, post the Discord announcements, and update your local `osu-wiki` fork with the necessary changes. You will need to re-commit the changes to your fork so the PR is updated.

### Debugging

You can use the `--dry-run` flag to preview the **forum thread creation** without actually making any changes. The operation logs will be outputted in `logs/YYYY-MM-DD/HH-MM-SS-poll-start.json`.

You may use the following flags to either skip certain parts of the process, or run them exclusively:

- `--banners-only` Only generate banners
- `--discord-only` Only post Discord announcements
- `--skip-banners` Skip banner generation
- `--skip-discord` Skip Discord announcements

You can skip forum thread creation by not using the `--threads` flag.

You can update the forum threads without triggering the Discord announcements by using `--threads --skip-discord` flags.

## Results

After 10 days have passed and the polls have closed, run `pnpm loved results` to process the voting results. This will update the forum threads with results, lock them, send chat announcements to the passing mappers, and post the Discord announcements.

### Debugging

You can use the `--dry-run` flag to preview the **poll end and results message operations** without actually making any changes. The operation logs will be outputted in `logs/YYYY-MM-DD/HH-MM-SS-poll-end.json`.

You may use the following flags to either skip certain parts of the process, or run them exclusively:

- `--force` Allow concluding polls despite timers
- `--skip-discord` Skip Discord announcements
- `--skip-threads` Skip forum operations
- `--skip-messages` Skip chat announcements to mappers
- `--discord-only` Only post Discord results
- `--threads-only` Only perform forum operations
- `--messages-only` Only send chat announcements to mappers
