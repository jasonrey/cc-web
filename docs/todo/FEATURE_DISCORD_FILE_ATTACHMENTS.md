# Discord File Attachment Support

## Requirements

- **Inbound**: User attaches a file to a Discord thread message → bot reads the file content and includes it in the Claude prompt
- **Outbound**: When Claude produces a file output (e.g. exports a CSV, generates an image, writes a report), the bot attaches it to the Discord reply instead of dumping the content inline

## Context

- Discord supports file attachments on messages up to 25MB (default tier)
- Attachments are accessible via `message.attachments` (a `Collection<string, Attachment>`)
- Each attachment has: `url`, `name`, `size`, `contentType`
- Outbound: discord.js sends files via `{ files: [{ attachment: Buffer|path, name: 'file.csv' }] }` on `thread.send()`
- Claude writes files to disk under the project working directory — outbound attachment means detecting a newly written file and attaching it

## Scope

### Inbound (user → Claude)
- On message receipt in `messageCreate.js`, check `message.attachments`
- For each attachment: fetch URL content (text files), append to prompt as fenced block with filename as label
- Respect size limit — skip files > 500KB with a warning, suggest user paste inline
- Supported types: text/*, application/json, application/yaml, and common code MIME types
- Binary/image files: skip with a note (Claude can't process binary via text)

### Outbound (Claude → Discord)
- Detect when Claude's response references a file it wrote (via `tool_result` for `Write` tool)
- After task completes, check if written files exist on disk and are "small enough" to attach (< 8MB)
- Attach file alongside the final message using `thread.send({ files: [...] })`
- Configurable: opt-in via config flag `discordAttachOutputFiles: true` (default off, since not all writes are intended as deliverables)
- Alternative trigger: user can say "attach the file" or "send me the csv" — Claude uses Bash/Read to output content, bot detects and attaches

## Plan

### Phase 1 — Inbound
1. In `messageCreate.js` → `handleThreadMessage()`, after reading `message.content`, check `message.attachments`
2. Fetch each text attachment, append to prompt string as:
   ```
   [Attached file: filename.csv]
   ```csv
   <content>
   ```
   ```
3. Add size/type guards

### Phase 2 — Outbound
1. Track `Write` tool events in `messageCreate.js` → store written file paths
2. After `result` event, filter paths that exist and are small enough
3. Send as `thread.send({ files: [...] })` after the main reply
4. Add `discordAttachOutputFiles` config flag to `discordConfig`

## Issues

- Need to distinguish "intermediate" writes (e.g. tmp files, build artifacts) from "deliverable" writes (e.g. exports, reports) — no clean heuristic; outbound should be opt-in or user-triggered
- Rate limits: large files may time out during Discord upload
- Binary outbound files (images, PDFs) need different handling than text
