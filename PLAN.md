# Claude Web - Project Plan & Roadmap

High-level task tracking and project architecture overview.

**Purpose:** This document tracks what to do next, upcoming features, and provides architectural context for development planning.

## Tech Stack

- **Frontend**: Vue 3 + Vite + Vue Router (history mode)
- **Backend**: Express 5 + WebSocket (ws library)
- **AI**: Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ ProjectsView│  │SessionsView │  │  ChatView   │          │
│  │  (landing)  │──│  (sessions) │──│   (chat)    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          │                                   │
│              ┌───────────▼───────────┐                       │
│              │   useWebSocket.js     │                       │
│              │  (shared state/comms) │                       │
│              └───────────┬───────────┘                       │
└──────────────────────────┼──────────────────────────────────┘
                           │ WebSocket
┌──────────────────────────┼──────────────────────────────────┐
│                          ▼                                   │
│              ┌───────────────────────┐                       │
│              │    websocket.js       │                       │
│              │   (event router)      │                       │
│              └───────────┬───────────┘                       │
│                          │                                   │
│     ┌────────────────────┼────────────────────┐              │
│     ▼                    ▼                    ▼              │
│ ┌─────────┐      ┌─────────────┐      ┌───────────┐         │
│ │ events/ │      │    lib/     │      │  config   │         │
│ │handlers │      │  utilities  │      │           │         │
│ └─────────┘      └─────────────┘      └───────────┘         │
│                          │                                   │
│              ┌───────────▼───────────┐                       │
│              │  Claude Agent SDK     │                       │
│              │  ~/.claude/projects/  │                       │
│              └───────────────────────┘                       │
└──────────────────────────────────────────────────────────────┘
```

## File Structure

```
claude-web/
├── server/
│   ├── index.js              # Express server entry point
│   ├── websocket.js          # WebSocket router (thin layer)
│   ├── config.js             # Configuration & path utilities
│   ├── events/               # Event handlers (self-documenting)
│   │   ├── index.js          # Handler registry
│   │   ├── get-projects.js   # List projects from ~/.claude/projects/
│   │   ├── get-recent-sessions.js  # Sessions across all projects
│   │   ├── get-sessions.js   # Sessions for current project
│   │   ├── get-project-status.js   # Git branch & file changes
│   │   ├── select-project.js # Set current project context
│   │   ├── select-session.js # Load session history
│   │   ├── new-session.js    # Create new session
│   │   ├── browse-folder.js  # Folder browser
│   │   ├── prompt.js         # Execute prompts via Claude SDK
│   │   └── terminal.js       # Terminal command execution
│   └── lib/                  # Shared utilities
│       ├── ws.js             # WebSocket helpers (send, broadcast, session watchers)
│       ├── tasks.js          # Task state management
│       ├── projects.js       # Project listing
│       ├── sessions.js       # Session loading/parsing JSONL
│       ├── folders.js        # Folder browser
│       └── processManager.js # Terminal process management
├── src/
│   ├── main.js               # Vue app entry
│   ├── App.vue               # Root component
│   ├── router/
│   │   └── index.js          # Vue Router config
│   ├── composables/
│   │   └── useWebSocket.js   # Centralized WebSocket state
│   ├── views/
│   │   ├── ProjectsView.vue  # Landing page (3 tabs)
│   │   ├── SessionsView.vue  # Session list for a project
│   │   └── ChatView.vue      # Chat interface (with terminal mode)
│   ├── components/
│   │   ├── AppHeader.vue     # Common header with connection status
│   │   ├── Sidebar.vue       # Navigation sidebar (ChatView)
│   │   ├── MessageItem.vue   # Message rendering
│   │   └── TerminalOutput.vue # Terminal output display
│   ├── assets/
│   │   └── main.css          # Global styles & CSS variables
│   └── utils/
│       └── markdown.js       # Markdown renderer (marked v17 + hljs)
├── package.json
├── vite.config.js
├── nodemon.json              # Dev server with logging to dev.log
└── nodemon-manual.json       # Manual restart mode (no file watching)
```

## Routes

| Path | View | Description |
|------|------|-------------|
| `/` | ProjectsView | Landing with 3 tabs |
| `/project/:project` | SessionsView | Session list for project |
| `/project/:project/session/:session` | ChatView | Chat interface |

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `get_projects` | - | List all projects |
| `get_recent_sessions` | `{ limit? }` | Sessions across all projects |
| `select_project` | `{ path }` | Set project context |
| `get_sessions` | - | Sessions for current project |
| `select_session` | `{ sessionId }` | Load session |
| `new_session` | `{ dangerouslySkipPermissions? }` | Create session |
| `get_project_status` | - | Git branch & file changes |
| `browse_folder` | `{ path }` | Browse filesystem |
| `prompt` | `{ prompt, permissionMode?, dangerouslySkipPermissions? }` | Send prompt |
| `terminal:exec` | `{ command, cwd? }` | Execute shell command |
| `terminal:kill` | `{ processId, signal? }` | Kill running process |
| `terminal:list` | - | List all processes |
| `terminal:clear` | `{ processId? }` | Clear process history |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | - | Connection established |
| `projects_list` | `{ projects }` | Project list |
| `recent_sessions` | `{ sessions }` | Sessions across projects |
| `project_selected` | `{ project, sessions }` | Project context set |
| `sessions_list` | `{ sessions }` | Session list |
| `session_selected` | `{ sessionId, isActiveElsewhere }` | Session loaded |
| `session_active_elsewhere` | `{ isActiveElsewhere }` | Multi-tab notification |
| `session_history` | `{ messages }` | Historical messages from JSONL |
| `session_info` | `{ sessionId, projectPath, isNew }` | New session ID (for URL update) |
| `project_status` | `{ cwd, gitBranch, gitChanges }` | Git info |
| `folder_contents` | `{ path, contents }` | Folder listing |
| `task_status` | `{ status }` | idle/running/completed/error |
| `text` | `{ content }` | Claude text response |
| `tool_use` | `{ tool, input }` | Tool invocation |
| `tool_result` | `{ content }` | Tool output |
| `result` | `{ subtype, result, cost?, duration? }` | Final result |
| `error` | `{ message }` | Error message |
| `terminal:processes` | `{ processes }` | Full process list |
| `terminal:started` | `{ process }` | New process started |
| `terminal:output` | `{ processId, stream, data }` | Process output chunk |
| `terminal:exit` | `{ processId, code, signal, status }` | Process exited |

## Key Implementation Details

### Slug ↔ Path Conversion

Claude stores projects in `~/.claude/projects/{slug}/` where slug is path with `/` → `-`.

**Challenge**: Both `/` and `-` become `-`, making conversion lossy.

**Solution**: Recursive filesystem probing in `slugToPath()` (server/config.js):
```javascript
// -home-ts-projects-anime-service could be:
// /home/ts/projects/anime/service  OR
// /home/ts/projects/anime-service
// We recursively check which paths actually exist
```

### Multi-Tab Support

Each WebSocket connection maintains its own context:
```javascript
const context = {
  currentProjectPath: null,
  currentSessionId: null
}
```

- Use `send(ws, ...)` for connection-specific data
- Use `broadcast()` only for global updates (avoided for session data)

### Session Watcher (server/lib/ws.js)

Tracks which WebSocket clients are watching each session:
- `watchSession(sessionId, ws)` - Register client as watching, notify others
- `unwatchSession(sessionId, ws)` - Unregister client, notify remaining if now single-user
- `unwatchAllSessions(ws)` - Cleanup on disconnect
- `getSessionWatcherCount(sessionId, excludeWs)` - Check watcher count

Used to warn users when same session is open in multiple tabs.

### Session History Loading (server/lib/sessions.js)

Sessions stored as JSONL files. `loadSessionHistory()` parses:
- `type: 'user'` → user messages (from message.content array)
- `type: 'assistant'` → text blocks and tool_use blocks
- `type: 'tool_result'` → tool outputs
- `type: 'summary'` → context summarization markers

### Process Manager (server/lib/processManager.js)

Manages terminal processes with:
- Spawn with output streaming (stdout/stderr)
- Kill with signal support
- History persistence to `/tmp/claude-web-processes.json`
- Ring buffer for output (1000 chunks in memory, 100 in file)
- Graceful handling of server restarts (marks running as killed)

### Markdown Rendering (src/utils/markdown.js)

Uses marked v17 with custom renderers:
- **Code blocks**: highlight.js syntax highlighting
- **Links**: Open in new tab with `target="_blank"`

### Git Status (server/events/get-project-status.js)

Returns:
- `cwd`: Resolved filesystem path
- `gitBranch`: From `git rev-parse --abbrev-ref HEAD`
- `gitChanges`: Parsed from `git status --porcelain`

Includes failsafe for non-git directories (returns null for git fields).

### SDK Permission Modes

Valid SDK permission modes: `'default'`, `'acceptEdits'`, `'bypassPermissions'`, `'plan'`, `'delegate'`, `'dontAsk'`

For `bypassPermissions`, must also set `allowDangerouslySkipPermissions: true`.

## Development

```bash
# Install dependencies
npm install

# Development server (manual restart mode for resilience)
npm run dev
# Logs streamed to dev.log
# Press `rs` + Enter to restart after code changes

# Build frontend (run separately or use dev:client for watch mode)
npm run build
npm run dev:client  # Watch mode

# Production
npm run start
```

## Completed Features

### Core
- Multi-session/tab support with per-tab WebSocket isolation
- Session-level broadcasting for same-session sync across tabs
- Context compaction handling (load only recent messages, option to load full history)
- Visual separator for compaction points
- URL update after new session creation

### Authentication
- Password-based auth with argon2 hashing
- Session tokens with configurable expiry (default 3 days)
- First-time setup flow (create password)
- WebSocket auth via session cookie
- `.auth.json` file stores credentials (delete to reset password)
- `AUTH_DISABLED=true` env var to bypass auth

### Chat Interface
- Mode tabs (Chat/Terminal) above textarea - VSCode-style toggle
- Chat bubble icon in input with permission-based colors
- Model selector (H/S/O/P buttons for Haiku/Sonnet/Opus/Opus-Plan)
- Model selection persisted in localStorage
- Permission mode selector (4 icon buttons in toolbar)
- Permission mode persisted per session in localStorage
- Permission mode sync when Claude uses EnterPlanMode/ExitPlanMode
- Toolbar below input with git branch, file activity, model, permissions
- Git branch and file changes display
- "No git" indicator for non-git folders
- Stop/cancel button for running requests (AbortController)
- Keyboard shortcuts: `Ctrl+K` session switcher, `Escape` blur, `Ctrl+L` scroll bottom
- Auto-scroll to bottom on session load/switch
- "Jump to bottom" button appears when scrolled up (150px threshold, slide-up animation)
- Resizable textarea (drag handle, 60px-400px)
- Inline markdown editor (TinyMDE) with real-time formatting preview
- User messages rendered as markdown with permission indicators (colored right border, icon in footer)

### Quick Session Switcher
- `Ctrl+K` opens command palette from anywhere
- Search/filter sessions by title or project name
- Keyboard navigation (up/down arrows, Enter to select, Escape to close)
- Shows recent sessions across all projects with timestamps

### Sidebar & Navigation
- Sidebar with tabs: Recent Sessions, Recent Projects
- Hamburger toggle with responsive behavior (overlay on mobile)
- Breadcrumb navigation: [Project Name] / [Session Title]
- Quick "New" session button on project items
- Session status indicators in sidebar:
  - Real-time task status (running/completed/error)
  - Animated spinner for running tasks
  - Green checkmark for completed (cleared when opened)
  - Red X for errors (cleared when opened)
  - Cross-tab synchronization via global WebSocket broadcasts
  - Status persists until session is opened

### Message Display
- Full markdown rendering with syntax highlighting
- Copy button on code blocks
- Collapsible tool use/results (grouped, collapsed by default)
- Message timestamps with relative time on hover
- File activity indicator (shows current file operation)

### Session Management
- Session titles/rename with `.session-titles.json` per project
- Editable in SessionsView and ChatView
- Accurate timestamps (JSONL file mtime, refreshed on task complete)
- Session active elsewhere warning (multi-tab detection)

### Terminal Mode
- Shell command execution with output streaming
- Uses user's default shell (`$SHELL -i`) to load rc files (.zshrc, .bashrc)
- Active/History sub-tabs (VSCode-style layout)
  - Active: Running processes only with kill button
  - History: All processes sorted chronologically (oldest first, newest at bottom)
- Natural terminal input: Enter submits (unless line ends with `\` for multiline)
- Command history with up/down arrows (per-project, stored in localStorage)
- `Ctrl+L` clears input (matches real terminal behavior)
- Copy output button on process blocks
- Multiline textarea with resizable height (matches chat input)
- Process state persistence across server restarts
- Chat input persistence: Input preserved when switching between Chat/Terminal tabs and across sessions (per-session localStorage)

### Styling
- Dark theme with CSS variables
- Reduced border radius globally (4px/6px/8px)
- Monospace font for code, paths, input
- Permission mode border colors (green/yellow/orange)

### npm Package
- Published as `claude-web` on npm
- CLI entry point with `--port`, `--host`, `--no-auth` options
- Auth data stored in `~/.claude-web/.auth.json` (works with npx)
- Frontend pre-built in `dist/` folder

## TODO / Future Improvements

### High Priority
- [x] Better text editor for chat input - TinyMDE (inline markdown preview)
- [ ] File diff viewer (for changed files in git repo)

### Medium Priority
- [ ] Session deletion
- [ ] Export session as markdown
- [ ] File tree view in chat sidebar
- [ ] Message actions (copy, retry, edit & resend)

### Low Priority
- [ ] Mobile responsive design improvements
- [ ] Image/file upload support
- [ ] Notification sound/badge when response completes
- [ ] Docker containerization
