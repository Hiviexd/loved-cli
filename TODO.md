# Project Loved CLI - TODO

This document tracks all pending tasks, incomplete implementations, potential refactors, and unaccounted features in the Project Loved CLI.

## 🔴 Critical - Dummy Implementations

### DiscordService
- [ ] **Implement actual Discord webhook integration** (`src/services/DiscordService.ts`)
  - Currently logs to console instead of posting to Discord
  - Need to implement HTTP POST to Discord webhook URLs
  - Should handle rate limiting and error responses
  - Should use `splitMessage()` and `splitEmbeds()` methods when content exceeds limits

### OsuApiService Dummy Methods
- [ ] **Implement `storeTopicCover()`** (`src/services/OsuApiService.ts`)
  - Currently returns dummy cover ID (0)
  - Required for uploading topic cover images in `news` command
  - Needs internal osu! website access or API endpoint

- [ ] **Implement `watchTopic()`** (`src/services/OsuApiService.ts`)
  - Currently just logs to console
  - Required for managing topic watches in `results` command
  - Needs internal osu! website access or API endpoint

- [ ] **Implement `getModeTopics()`** (`src/services/OsuApiService.ts`)
  - Currently returns empty object `{}`
  - **CRITICAL**: Used in `results` command to get main topic IDs
  - Requires HTML scraping from osu! website or API endpoint
  - Used for validation: `await osuApi.getModeTopics(120).catch(logAndExit)`

## 🟡 High Priority - Missing Features

### News Command
- [ ] **Implement `--discord-only` flag** (`src/commands/news.ts`)
  - Flag is defined but implementation was removed
  - Should post Discord announcements for nominations only
  - Should skip all other operations (banners, threads, news post)
  - Reference implementation in `results` command's `--discord-only` flag

### Discord Message Splitting
- [ ] **Use `DiscordService.splitMessage()` and `splitEmbeds()`** (`src/services/DiscordService.ts`)
  - Methods are defined but never used
  - Should split messages/embeds when they exceed Discord limits
  - Currently only warns about exceeding limits but doesn't split
  - Apply to both `postDiscordResults()` and future `postDiscordNominations()`

## 🟠 Medium Priority - Refactors & Improvements

### Configuration
- [ ] **Make Discord messages configurable** (`src/config.ts`)
  - Currently hardcoded in `defaultMessages`
  - Should allow users to customize `discordPost` and `discordResults` messages
  - Could add to `config.json` or separate messages config file
  - Consider template variables like `{{MAP_COUNT}}` for flexibility

### Pack URL Calculation
- [ ] **Review and fix `packUrl()` calculation** (`src/commands/news.ts`)
  - TODO comment: "This calculation may need adjustment for skipped modes/rounds"
  - Current formula: `(roundId - 109 + 1) * 4 - ruleset.id`
  - Verify accuracy with actual pack numbering scheme
  - Handle edge cases for skipped rounds/modes

### Error Handling
- [ ] **Improve error handling for dummy methods**
  - `getModeTopics()` failure causes `results` command to fail
  - Consider graceful degradation or better error messages
  - Document which features require internal osu! access

### Code Organization
- [ ] **Extract Discord posting logic** (`src/commands/results.ts`, `src/commands/news.ts`)
  - `postDiscordResults()` is defined in `results.ts`
  - Should create `postDiscordNominations()` for `news.ts` (currently missing)
  - Consider shared utility or service for Discord operations
  - Both functions have similar structure - could be refactored

## 🟢 Low Priority - Enhancements

### Validation & Safety
- [ ] **Add validation for conflicting flags**
  - `--banners-only` and `--skip-banners` can be used together (conflicting)
  - `--discord-only` and `--skip-discord` can be used together (conflicting)
  - `--lock-only` and `--skip-lock` can be used together (conflicting)
  - Add validation to prevent conflicting options

- [ ] **Add validation for required config when using specific flags**
  - `--discord-only` doesn't require `osuWikiPath` but current code checks it
  - `--banners-only` doesn't require `osuWikiPath` but should validate banner paths exist

### Documentation
- [ ] **Update README.md with `--discord-only` flag**
  - Document the flag in the `news` command section
  - Add example usage
  - Note that it requires Discord webhooks to be configured

- [ ] **Document which features require internal osu! access**
  - `storeTopicCover()`, `watchTopic()`, `getModeTopics()` need internal access
  - Document workarounds or alternative methods if available

### Testing & Edge Cases
- [ ] **Handle edge cases in Discord posting**
  - What happens if webhook URL is invalid?
  - What happens if Discord API is down?
  - Should implement retry logic for transient failures

- [ ] **Test pack URL calculation with various round IDs**
  - Verify formula works for all historical rounds
  - Test with skipped rounds/modes

### Code Quality
- [ ] **Remove unused code or implement it**
  - `DiscordService.splitMessage()` and `splitEmbeds()` are unused
  - Either use them or remove if not needed

- [ ] **Consistent error handling patterns**
  - Some places use `logAndExit()`, others use `throw new NoTraceError()`
  - Standardize error handling approach

## 📝 Notes

### Dependencies on Internal Access
The following features require internal osu! website access and cannot be implemented with public APIs:
- Topic cover image uploads
- Topic watching/unwatching
- Getting pinned topic IDs from forum (requires HTML scraping)

### Discord Integration Status
- Discord webhook posting is fully implemented as a dummy (console logging)
- Message/embed splitting utilities exist but are unused
- Need to implement actual HTTP POST to Discord webhooks

### Command Option Completeness
All command options are defined, but some implementations are missing:
- ✅ `setup` - Complete
- ✅ `maps download` - Complete
- ✅ `maps open` - Complete
- ✅ `messages` - Complete
- ⚠️ `news` - Missing `--discord-only` implementation
- ✅ `results` - Complete (but depends on dummy `getModeTopics()`)

