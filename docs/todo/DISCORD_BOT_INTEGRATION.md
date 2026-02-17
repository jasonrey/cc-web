# Discord Bot Integration - Architecture Exploration

## Current System Architecture

### Tech Stack
- **Backend**: Express 5 + WebSocket (ws library)
- **AI**: Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- **Deployment**: NPX (global install) or Docker
- **Frontend**: Vue 3 SPA (optional - can work standalone)

### Core Communication Flow
```
User (Browser) → WebSocket → Express Server → Claude Agent SDK → Anthropic API
                     ↓
              Session Storage (~/.claude/projects/)
```

### Key Components
1. **WebSocket Event Router** (`server/websocket.js`)
   - Routes events: `prompt`, `get-sessions`, `select-project`, `terminal`, `files`, etc.
   - Per-connection context (currentProjectPath, currentSessionId)
   - Session watching/broadcasting for multi-client support

2. **Prompt Handler** (`server/events/prompt.js`)
   - Receives user messages
   - Calls `query()` from Claude Agent SDK
   - Streams responses back (text, tool_use, tool_result, result)
   - Manages task lifecycle (running/cancelled/completed/error)
   - Session persistence in `~/.claude/projects/{project-slug}/`

3. **Session Management**
   - Sessions stored as JSONL files (Claude's native format)
   - Session titles in `.session-titles.json`
   - Multi-session support (concurrent sessions, switching)
   - Project-based organization

4. **Authentication**
   - Password-based auth (bcrypt) with session tokens
   - Optional bypass token for automation
   - Can be disabled with `--no-auth`

---

## Discord Bot Integration Options

### Option 1: Generic Bot (Anthropic-Hosted Identity)

**Architecture:**
```
Discord User → Discord Bot (Your Server) → tofucode Backend → Claude Agent SDK
                    ↓
             User's VM/Domain (via WebSocket or REST API)
```

**Pros:**
- ✅ Single bot for all users (easier for users - just invite & configure)
- ✅ Centralized management (you control the bot identity)
- ✅ Better UX (no bot creation needed by users)
- ✅ Can provide hosted service with usage tiers

**Cons:**
- ❌ Security concerns: Your server proxies all requests
- ❌ Users must expose their tofucode instance (domain/port) to your server
- ❌ API key management complexity (where do keys live?)
- ❌ Scalability issues (your server becomes bottleneck)
- ❌ Trust required (users give you access to their systems)

**Configuration Flow:**
1. User invites your bot to their Discord server
2. User runs `/setup` command in Discord
3. Bot DMs user to configure:
   - Their tofucode instance URL (e.g., `https://code.example.com`)
   - Auth credentials (session token or bypass token)
   - Optionally: project path, permission mode
4. Your bot server stores mapping: `discord_server_id -> tofucode_instance_url`
5. When user sends message, bot proxies to their tofucode instance

**Challenges:**
- **Security**: Users must expose their tofucode instance to internet OR you need OAuth-like flow
- **API Keys**: Users still need their own Anthropic API keys (can't share yours)
- **State Management**: Your bot needs to track which Discord user → which session
- **Isolation**: Need to ensure Discord Server A can't access Server B's data

---

### Option 2: User-Hosted Bot (BYOB - Bring Your Own Bot)

**Architecture:**
```
Discord User → User's Discord Bot → User's tofucode Instance → Claude Agent SDK
                         ↓
                  (All on user's VM)
```

**Pros:**
- ✅ Full user control (their bot, their server, their API key)
- ✅ No trust issues (all runs locally)
- ✅ Simpler security model (no external access needed)
- ✅ Direct connection (low latency)
- ✅ Natural isolation (each user's bot is separate)

**Cons:**
- ❌ Higher barrier to entry (users must create Discord bot)
- ❌ More setup steps for users
- ❌ Each user manages their own bot instance

**Configuration Flow:**
1. User creates Discord bot in Discord Developer Portal
2. User installs tofucode: `npx tofucode --discord-bot`
3. tofucode prompts for:
   - Discord bot token
   - Discord guild ID (server) to restrict to
   - Project paths to expose
   - Permission modes
4. tofucode starts HTTP/WebSocket server + Discord bot listener
5. User invites their bot to their Discord server
6. Users send messages in Discord → bot forwards to local tofucode → Claude responds

**Implementation Requirements:**
- Add `discord.js` dependency
- New module: `server/discord/bot.js`
- Discord event handlers: `message`, `interaction`, `ready`
- Mapping Discord channels/threads → tofucode sessions
- Configuration via `.env.example`:
  ```bash
  # Discord Bot Configuration
  DISCORD_BOT_TOKEN=your_bot_token_here
  DISCORD_GUILD_ID=your_server_id (optional, for access restriction)
  DISCORD_ENABLED=true
  ```

---

### Option 3: Hybrid Approach (Recommended)

**Best of Both Worlds:**

**Phase 1: BYOB (User-Hosted)**
- Start with Option 2 (user-hosted bots)
- Document setup process thoroughly
- Provide CLI flags: `tofucode --discord-bot`
- Include in Docker image for easy deployment

**Phase 2: Optional Hosted Service**
- Offer hosted bot as paid service (for non-technical users)
- Users grant OAuth access to their Discord server
- Your hosted bot → user's exposed tofucode instance
- Freemium model: Free tier (limited), paid tier (unlimited)

---

## Is It Viable to Wrap as Discord Bot?

### YES - Discord Bot is Viable ✅

**Reasons:**

1. **Architecture Compatibility**
   - tofucode already has stateless WebSocket handlers
   - Discord messages can map 1:1 to tofucode prompt events
   - Streaming responses work with Discord (chunked messages or embeds)

2. **Session Management**
   - Discord threads can map to tofucode sessions
   - Each thread = one conversation session
   - Thread persistence matches session persistence

3. **Authentication**
   - Discord user ID provides identity
   - Can use Discord roles for access control
   - Bot token secures the connection

4. **Real-World Use Cases**
   - DevOps: "Check server status", "Deploy to staging"
   - Code Review: "Analyze this PR", "Explain this function"
   - Team Collaboration: Multiple devs interact with same codebase
   - Education: Teacher deploys bot for classroom coding assistance

### Key Challenges to Address

1. **Discord Message Limits**
   - Max 2000 chars per message
   - Solution: Chunk long responses, use embeds, or send files

2. **Rate Limits**
   - Discord API has rate limits (50 messages/sec per guild)
   - Solution: Queue responses, debounce, use edit instead of new messages

3. **Streaming UX**
   - WebSocket streams are instant, Discord messages are discrete
   - Solution: Edit message in-place as chunks arrive (GitHub Copilot style)

4. **Tool Output Display**
   - Terminal output, file diffs, etc. need special formatting
   - Solution: Use code blocks, embeds, or link to web UI

5. **Permissions**
   - Discord permissions ≠ tofucode permissions
   - Solution: Map Discord roles → tofucode permission modes

6. **Multi-User Concurrency**
   - Multiple Discord users sending prompts simultaneously
   - Solution: Per-user sessions or queue system

---

## Recommended Approach

### Start with Option 2 (User-Hosted BYOB)

**Why:**
- Simplest to implement securely
- No infrastructure costs for you
- Users maintain full control
- Natural fit for self-hosted tofucode

**Implementation Plan:**

1. **Core Discord Integration** (Phase 1)
   ```bash
   npx tofucode --discord-bot
   ```
   - Add `discord.js` dependency
   - Create `server/discord/bot.js` module
   - Handle Discord events → map to tofucode WebSocket events
   - Document setup process (create bot, get token, invite)

2. **Session Mapping** (Phase 1)
   - Discord Thread ID → tofucode Session ID
   - Store mapping in `~/.tofucode/discord-sessions.json`
   - Support `/new` command to start fresh session
   - Support `/switch <session>` to resume sessions

3. **Rich Formatting** (Phase 2)
   - Tool outputs as Discord embeds
   - Code blocks for file diffs
   - Buttons for actions (approve/reject in plan mode)

4. **Multi-User Support** (Phase 3)
   - Per-user project workspaces
   - Role-based access control (map Discord roles → tofucode projects)
   - Concurrent session support (already supported by tofucode)

5. **Optional Web UI Link** (Phase 4)
   - Bot responses include "View in Web UI" link
   - Opens to exact session in browser for rich interaction

---

## Configuration Design

### Environment Variables (`.env.example`)

```bash
# Discord Bot Configuration
# -------------------------

# Enable Discord bot integration
# DISCORD_ENABLED=true

# Discord bot token (from Discord Developer Portal)
# Required when DISCORD_ENABLED=true
# Get token: https://discord.com/developers/applications
# DISCORD_BOT_TOKEN=your_bot_token_here

# Restrict bot to specific Discord server (optional)
# If set, bot will only respond in this guild
# DISCORD_GUILD_ID=123456789012345678

# Discord command prefix (default: /)
# DISCORD_COMMAND_PREFIX=/

# Discord bot status message
# DISCORD_STATUS=Coding with Claude

# Discord message chunk size (default: 1900)
# Max message length before splitting into chunks
# DISCORD_MAX_MESSAGE_LENGTH=1900

# Discord streaming mode (default: edit)
# - edit: Edit message in-place as response streams (GitHub Copilot style)
# - append: Send new messages as chunks arrive
# DISCORD_STREAMING_MODE=edit
```

### CLI Arguments

```bash
# Enable Discord bot
tofucode --discord-bot

# With specific bot token
tofucode --discord-bot --discord-token YOUR_TOKEN

# Restrict to guild
tofucode --discord-bot --discord-guild 123456789012345678

# Combined with other options
tofucode --discord-bot --port 3000 --no-auth --root /home/user/projects
```

---

## User Setup Flow (Option 2 - BYOB)

### Step 1: Create Discord Bot
```
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it (e.g., "My Claude Code Bot")
4. Go to "Bot" tab → "Add Bot"
5. Copy bot token (keep secret!)
6. Enable "Message Content Intent" (required to read messages)
7. Go to "OAuth2" → "URL Generator"
   - Scopes: bot
   - Permissions: Send Messages, Read Message History, Use Slash Commands
8. Copy URL and open in browser to invite bot to your server
```

### Step 2: Configure tofucode
```bash
# Create .env file
echo "DISCORD_ENABLED=true" >> .env
echo "DISCORD_BOT_TOKEN=your_token_here" >> .env
echo "DISCORD_GUILD_ID=your_server_id" >> .env

# Start tofucode with Discord bot
npx tofucode --discord-bot
```

### Step 3: Use Bot in Discord
```
# In Discord channel:
/code help me write a function to check if a number is prime

# Bot responds with:
[Claude Avatar] Claude Code
Sure! Let me write a function that checks...

[Embed: Tool Use]
🔧 Write
File: /workspace/is_prime.py
Content: [collapsed]

[Embed: Result]
✅ Task completed in 3.2s
Cost: $0.001
```

---

## Technical Implementation Notes

### Discord Message → tofucode Prompt

```javascript
// server/discord/bot.js
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Ignore messages outside configured guild
  if (config.discordGuildId && message.guild.id !== config.discordGuildId) {
    return;
  }

  // Map Discord thread to session
  const channelId = message.channel.id;
  const sessionId = await getOrCreateSession(channelId, message.author.id);

  // Execute prompt (reuse existing logic)
  const stream = query({
    prompt: message.content,
    options: {
      resume: sessionId,
      cwd: config.rootPath || process.cwd(),
      permissionMode: config.permissionMode,
    }
  });

  // Stream response back to Discord
  let currentMessage = await message.reply('Thinking...');
  let responseText = '';

  for await (const chunk of stream) {
    if (chunk.type === 'assistant' && chunk.message?.content) {
      for (const block of chunk.message.content) {
        if ('text' in block) {
          responseText += block.text;
          // Edit message in-place (Discord Copilot style)
          await currentMessage.edit(responseText.substring(0, 2000));
        } else if ('name' in block) {
          // Send tool use as embed
          await message.channel.send({
            embeds: [createToolUseEmbed(block)]
          });
        }
      }
    }
  }

  // Final edit with complete response
  await currentMessage.edit(responseText);
});
```

### Session Management

```javascript
// Map Discord thread/channel to tofucode session
const discordSessions = new Map();

async function getOrCreateSession(channelId, userId) {
  const key = `${channelId}-${userId}`;

  if (discordSessions.has(key)) {
    return discordSessions.get(key);
  }

  // Create new session (reuse existing tofucode logic)
  const sessionId = `discord-${channelId}-${Date.now()}`;
  discordSessions.set(key, sessionId);

  return sessionId;
}
```

---

## Security Considerations

### User-Hosted Bot (Option 2)
- ✅ Bot token stays on user's machine
- ✅ Anthropic API key stays on user's machine
- ✅ Discord guild ID restriction prevents abuse
- ⚠️ Users must secure their VM (firewall, SSH, etc.)
- ⚠️ Bot has full file system access (same as tofucode)

### Mitigation Strategies
1. **Guild Restriction**: Require `DISCORD_GUILD_ID` to prevent bot invite spam
2. **Role-Based Access**: Map Discord roles to tofucode permission modes
3. **Rate Limiting**: Limit prompts per user per minute
4. **Audit Logging**: Log all Discord user actions to `~/.tofucode/discord-audit.log`

---

## Next Steps

### Minimal Viable Discord Bot (MVP)

**Scope:**
1. ✅ Discord message → tofucode prompt (text only)
2. ✅ Response streaming (edit-in-place)
3. ✅ Session per Discord channel
4. ✅ Basic error handling
5. ✅ Configuration via ENV vars

**Out of Scope (Future):**
- Slash commands
- Rich embeds for tool outputs
- Multi-user support
- Role-based access control
- Web UI integration

**Estimated Effort:** 2-3 days for MVP

---

## Questions to Answer

Before implementation, clarify:

1. **Primary Use Case**
   - Personal assistant (single user)?
   - Team collaboration (multiple devs)?
   - Public service (open to anyone)?

2. **Deployment Target**
   - User's local machine?
   - Cloud VM (AWS, GCP, Azure)?
   - Docker container?

3. **User Profile**
   - Technical users (comfortable with bot setup)?
   - Non-technical users (need hosted service)?

4. **Feature Priority**
   - Simple text chat (MVP)?
   - Rich formatting (embeds, buttons)?
   - Web UI integration?

5. **Business Model**
   - Free open-source tool?
   - Hosted service with freemium tiers?
   - Enterprise offering?

---

## Conclusion

**Verdict: Discord bot integration is VIABLE and RECOMMENDED**

**Best Approach:**
- Start with **Option 2 (User-Hosted BYOB)**
- Implement MVP in 2-3 days
- Gather user feedback
- Iterate on features (embeds, slash commands, multi-user)
- Optionally add hosted service later (Option 1) as paid offering

**Key Advantages:**
- Low barrier to entry (users already have Discord)
- Natural fit for team collaboration
- Leverages existing tofucode architecture
- Secure (user-controlled)
- Extensible (can add rich features later)

**Killer Feature:**
Discord becomes a **mobile interface** for Claude Code - use your phone to run code on your server!
