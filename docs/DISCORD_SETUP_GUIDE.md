# Discord Bot Setup Guide

tofucode supports a Discord bot integration using the bring-your-own-bot (BYOB) model. You create and host your own Discord bot — tofucode connects to it using your bot token.

---

## Part 1: Create a Discord Bot

### Step 1: Go to Discord Developer Portal

Visit: https://discord.com/developers/applications

Click **"New Application"** (top right), name it (e.g. "tofucode"), agree to terms, click **"Create"**.

### Step 2: Configure Bot Settings

1. In the left sidebar, click **"Bot"**
2. Under **"Token"**, click **"Reset Token"** → **"Yes, do it!"**
3. **Copy the token** — save it securely, you'll need it for configuration

   ⚠️ Keep this secret. Never commit it to git or share it publicly.

4. Scroll down to **"Privileged Gateway Intents"**:
   - ✅ Enable **"Message Content Intent"** (required to read message text)
   - Save changes

### Step 3: Generate Invite URL

1. In left sidebar, click **"OAuth2"** → **"URL Generator"**
   _(Ignore the Installation tab — use URL Generator directly)_
2. Under **"Scopes"**, select: ✅ `bot` and ✅ `applications.commands`
3. Under **"Bot Permissions"**, select the minimum required:

   | Permission | Purpose |
   |---|---|
   | Send Messages | Reply to users |
   | Send Messages in Threads | Respond inside threads |
   | Create Public Threads | Start new session threads |
   | Read Message History | Fetch last message for cancel feedback |
   | Use Slash Commands | Register and respond to `/` commands |
   | Manage Threads | Rename threads from first message |
   | Attach Files | _(future: file attachment support)_ |

   > **Personal use shortcut:** Grant permission value `8515702525261888` for all message permissions.

4. Copy the **Generated URL** at the bottom

### Step 4: Add Bot to Your Server

1. Open the generated URL in your browser
2. Select your server from the dropdown
3. Click **"Continue"** → **"Authorize"**

The bot will appear offline in your server until tofucode starts.

---

## Part 2: Get Your Guild ID

1. Open Discord **User Settings** → **"Advanced"** → Enable **"Developer Mode"**
2. Right-click your server icon → **"Copy Server ID"**

---

## Part 3: Configure tofucode

**Option A — Config file** (`config.json`):

```json
{
  "discord": true,
  "discordToken": "YOUR_BOT_TOKEN_HERE",
  "discordGuildId": "YOUR_GUILD_ID_HERE",
  "discordStatus": "Coding with Claude"
}
```

```bash
npx tofucode --config config.json
```

**Option B — Environment variables:**

```bash
DISCORD_ENABLED=true \
DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN_HERE \
DISCORD_GUILD_ID=YOUR_GUILD_ID_HERE \
npx tofucode
```

---

## Part 4: Start & Verify

```bash
npx tofucode --config config.json
```

Expected log output:
```
tofucode v1.1.0 running on http://localhost:3001
Discord bot integration enabled
[Discord] Bot logged in as YourBot#1234
[Discord] Registered 6 slash commands for guild 1234567890123456789
[Discord] Web UI bridge started
```

The bot should appear **online** (green) in your Discord server.

---

## Part 5: Usage

### Channel Setup

Each Discord channel maps to one tofucode project. Run in the channel you want to configure:

```
/setup project:/home/user/projects/myapp
```

### Starting a Session

Create a thread in the configured channel. Each thread is an isolated Claude Code session. Just type your message — the bot will respond.

> Sessions are also accessible from the Web UI. Conversations started in Discord appear in tofucode's session list, and vice versa.

---

## Slash Command Reference

| Command | Where | Description |
|---|---|---|
| `/setup project:<path>` | Channel | Map this channel to a project directory |
| `/session` | Channel | List recent sessions for this channel's project |
| `/session` | Thread | Show current session info (ID, status, message count) |
| `/resume` | Channel | Resume a previous session in a new thread |
| `/cancel` | Thread | Cancel the currently running task |
| `/list path:<path>` | Anywhere | List subdirectories at a path (for finding projects) |
| `/status` | Anywhere | Show bot config, active tasks, and server info |

### `/setup`

Links a Discord channel to a project folder. All threads in this channel will run Claude Code sessions against that project.

- If the channel is already mapped, shows a confirmation prompt before overriding
- Changing the project path does not affect existing threads (they retain their session IDs)

```
/setup project:/home/user/projects/myapp
```

### `/session`

**In a channel:** Lists the 10 most recent sessions with message counts and active status (🟡 = currently running).

**In a thread:** Shows the current session's ID, project, message count, status, and start time.

### `/resume`

Shows a dropdown of recent sessions. Select one to create a new thread that resumes that conversation, with the last 3 turns of history shown as context.

If the original thread was deleted, a new thread is created automatically.

### `/cancel`

Cancels the running Claude task in the current thread. The last bot message is updated with a `⛔ Cancelled` footer.

### `/list`

Lists subdirectories at an absolute path — useful for finding your project folder path to use in `/setup`.

```
/list path:/home/user/projects
```

Respects the `--root` restriction if configured. Results are ephemeral (only visible to you).

### `/status`

Shows:
- **Channel config** — mapped project, configured by, thread count
- **Active tasks** — threads with currently running Claude tasks
- **Bot stats** — total mapped channels and threads
- **Server config** — root path, permission mode, model versions

---

## Troubleshooting

**Bot stays offline**
- Check `DISCORD_BOT_TOKEN` is correct (reset and copy again if unsure)
- Check bot has been added to server via the OAuth2 URL Generator link
- Check console for error messages

**"Used disallowed intents" error**
- Enable **Message Content Intent** in the Bot tab of the Developer Portal
- Re-authorize the bot using the OAuth2 URL Generator link (not the Installation tab)

**Slash commands don't appear**
- Wait 1 minute — guild-specific commands may take a moment to propagate
- Check `DISCORD_GUILD_ID` matches your server ID
- Restart Discord app

**`/setup` says "Access denied"**
- Check the project path exists and is absolute
- If `--root` is configured, the path must be within that root

**Bot doesn't respond to messages**
- Confirm Message Content Intent is enabled in the Bot tab
- Check the bot has permission to send messages in that channel
- Check server logs for errors

**Sessions not found for a project with dots in the name (e.g. `myapp.com`)**
- Fixed in v1.1.0 — dots in project paths are now correctly converted to hyphens in slugs
- If you set up the channel before v1.1.0, re-run `/setup` to regenerate the correct slug

---

## Storage

tofucode stores Discord mappings in `~/.tofucode/`:

| File | Contents |
|---|---|
| `discord-channels.json` | Channel → project mappings (set via `/setup`) |
| `discord-sessions.json` | Thread → session mappings (created per thread) |

Claude session history (JSONL) is shared with the Web UI at `~/.claude/projects/`.
