# Feature: Terminal Mode

## Overview

Terminal mode for executing shell commands with real-time output streaming in the chat interface. This feature adds a terminal toggle that switches between chat and command execution modes.

**Status:** ✅ **IMPLEMENTED** (v1.0.0)

---

## Implementation Summary

The terminal feature allows users to:
- Execute shell commands with real-time output streaming
- Run multiple concurrent processes
- View active and historical command outputs
- Kill running processes
- Persist process state across browser refreshes
- Access command history with up/down arrow keys

---

## Architecture

### Backend Components

#### Process Manager (`server/lib/processManager.js`)
**Status:** ✅ Implemented

Manages spawned processes per project with the following capabilities:
- Process spawning with `spawn(shell, ['-i', '-c', command])`
- Interactive shell mode with rc file loading (`.zshrc`, `.bashrc`)
- Process tracking (running, completed, error, killed)
- Output ring buffer (1000 chunks in memory, 100 in file)
- Process state persistence to `/tmp/claude-web-processes.json`
- Graceful handling of server restarts (marks running as killed)

**Key Features:**
```javascript
export function spawn(projectSlug, { id, command, cwd })
export function kill(processId, signal = 'SIGTERM')
export function getProcessById(processId)
export function listProcesses(projectSlug)
export function clearHistory(projectSlug)
export function saveState()        // Persist to disk
export function restoreState()     // Load from disk
```

#### WebSocket Event Handler (`server/events/terminal.js`)
**Status:** ✅ Implemented

Handles terminal-related WebSocket events:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `terminal:exec` | Client→Server | `{ command, cwd? }` | Execute command |
| `terminal:kill` | Client→Server | `{ processId, signal? }` | Kill process (SIGTERM/SIGKILL) |
| `terminal:list` | Client→Server | `{}` | Request process list |
| `terminal:clear` | Client→Server | `{}` | Clear completed processes |
| `terminal:processes` | Server→Client | `{ processes: [...] }` | Process list response |
| `terminal:started` | Server→Client | `{ processId, command, pid, cwd }` | Process started |
| `terminal:output` | Server→Client | `{ processId, stream, data }` | Output chunk (stdout/stderr) |
| `terminal:exit` | Server→Client | `{ processId, code, signal }` | Process exited |

**Actions:**
- `exec` - Spawn command, stream output
- `kill` - Send signal (SIGTERM/SIGKILL) to process
- `list` - Return all processes for project
- `clear` - Remove completed process history

---

### Frontend Components

#### WebSocket State (`src/composables/useWebSocket.js`)
**Status:** ✅ Implemented

Terminal state management in scoped chat WebSocket:

```javascript
// State
const terminalProcesses = ref([])  // Process list with output

// Actions
function execTerminalCommand(command)
function killProcess(processId, signal)
function listProcesses()
function clearProcessHistory()

// Message handlers
case 'terminal:started':   // Add new process
case 'terminal:output':    // Append output chunk
case 'terminal:exit':      // Update status
case 'terminal:processes': // Load process list (on reconnect)
```

#### Chat View Integration (`src/views/ChatView.vue`)
**Status:** ✅ Implemented

**Mode Toggle:**
- Mode tabs above textarea: "Chat" and "Terminal"
- Badge on Terminal tab shows running process count
- Switches between chat messages and terminal output
- Permission tabs hidden in terminal mode
- Input switches from TinyMDE to simple textarea

**Terminal Sections:**
- **Active Tab**: Shows only running processes with kill buttons
- **History Tab**: Shows all processes chronologically (newest at bottom)
- Auto-expand latest history item
- Manual expand/collapse with persistent state

**Input Features:**
- Natural terminal input behavior:
  - Enter submits command (unless line ends with `\`)
  - `\` at end of line for multiline continuation
- Command history with up/down arrows (per-project localStorage)
- `Ctrl+L` clears input (matches real terminal behavior)
- Multiline textarea with resizable height

#### Terminal Output Component (`src/components/TerminalOutput.vue`)
**Status:** ✅ Implemented

Displays individual process output:

**Process Header:**
- Command prompt: `$ command`
- Working directory (shortened)
- Status indicator:
  - Running: Animated spinner + PID + Kill button
  - Completed: Exit code + Copy button
  - Error: Exit code (red) + Copy button
  - Killed: Signal name + Copy button

**Output Display:**
- ANSI color code rendering (16 colors + bright variants)
- Stdout/stderr differentiation (stderr in red when no ANSI colors)
- Collapsible sections for completed processes
- Copy output button (copies raw text without ANSI codes)
- Support for bold, dim, italic, underline text styles

**Features:**
- Output buffering with ring buffer
- Efficient rendering of large outputs
- Auto-scroll for active processes
- Manual scroll lock detection

---

## Current Capabilities

### ✅ What Works

1. **Command Execution**
   - One-shot commands: `ls`, `cat`, `grep`, `git status`
   - Long-running processes: `npm run dev`, `python script.py`
   - Multiple concurrent processes
   - Commands with arguments and pipes

2. **Output Streaming**
   - Real-time stdout/stderr streaming
   - Differentiated display (stderr in red)
   - Large output handling (ring buffer)
   - ANSI escape code rendering (colors, bold, dim, italic, underline)

3. **Process Management**
   - Kill running processes (SIGTERM/SIGKILL)
   - View active and completed processes
   - Clear completed process history
   - Process persistence across server restarts

4. **Interactive Shell**
   - Loads user shell rc files (`.zshrc`, `.bashrc`)
   - `$SHELL` environment variable respected
   - Color output enabled (`FORCE_COLOR=1`)
   - Working directory per command

5. **UX Features**
   - Command history (localStorage, per-project)
   - Up/down arrow navigation
   - Multiline input with `\` continuation
   - `Ctrl+L` clear input
   - Copy output button
   - Auto-expand latest history item
   - Manual expand/collapse state persistence

### ❌ What Doesn't Work (By Design)

1. **No stdin Input**
   - Cannot send input to running processes
   - Interactive programs don't work: `nano`, `vim`, `less`, `top`
   - Password prompts hang: `sudo`, `ssh`
   - Confirmation prompts hang: `apt install`, `rm -i`
   - **Note:** This is covered by separate feature plan (FEATURE_TERMINAL_INTERACTIVE.md)

2. **No Job Control**
   - Cannot background/foreground processes (`bg`, `fg`)
   - No `Ctrl+Z` suspend
   - No process groups

3. **No Shell State**
   - Each command runs independently
   - No `cd` persistence (use `cwd` parameter instead)
   - No environment variable persistence
   - No shell aliases/functions

4. **No PTY**
   - Not a real terminal (no TTY)
   - Programs that check `isatty()` may behave differently
   - Limited terminal control sequence support

---

## File Structure

```
server/
├── lib/
│   └── processManager.js          # ✅ Process lifecycle management
└── events/
    └── terminal.js                # ✅ WebSocket event handlers

src/
├── composables/
│   └── useWebSocket.js            # ✅ Terminal state/methods added
├── views/
│   └── ChatView.vue               # ✅ Terminal mode integration
├── components/
│   └── TerminalOutput.vue         # ✅ Output display component
└── utils/
    └── ansi.js                    # ✅ ANSI escape code to HTML converter
```

---

## Implementation Timeline

**Phase 1: Backend** (Completed)
- ✅ ProcessManager with spawn/kill/list
- ✅ Output ring buffer
- ✅ State persistence to disk
- ✅ WebSocket event handlers

**Phase 2: Frontend Core** (Completed)
- ✅ useWebSocket terminal state
- ✅ ChatView mode toggle
- ✅ TerminalOutput component
- ✅ Basic input/output flow

**Phase 3: UX Polish** (Completed)
- ✅ Command history with arrows
- ✅ Multiline input with `\` continuation
- ✅ `Ctrl+L` clear input
- ✅ Copy output button
- ✅ Active/History tab separation
- ✅ Auto-expand latest history
- ✅ Process state persistence

**Phase 4: Enhancements** (Completed)
- ✅ ANSI escape code rendering (16 colors, bright variants, text styles)
- ✅ Resizable terminal area
- ✅ Process kill with signal selection (SIGTERM/SIGKILL)
- ✅ Scroll lock detection

---

## Usage Examples

### Simple Commands
```bash
# List files
ls -la

# Check git status
git status

# View file
cat package.json
```

### Long-running Processes
```bash
# Start dev server
npm run dev

# Run tests in watch mode
npm test -- --watch

# Monitor logs
tail -f /var/log/app.log
```

### Multiple Processes
- Run multiple commands concurrently
- Each appears in Active tab while running
- Moves to History tab when completed

### Command History
- Type command and press Enter
- Press Up to recall previous commands
- Press Down to move forward in history
- History persisted per project in localStorage

---

## Testing Coverage

### ✅ Tested Scenarios

1. **Basic Execution**
   - [x] Simple commands (ls, pwd, echo)
   - [x] Commands with arguments
   - [x] Commands with pipes (`ls | grep`)
   - [x] Commands with redirects (`echo > file`)

2. **Long-running Processes**
   - [x] npm run dev (stays running)
   - [x] tail -f (continuous output)
   - [x] python script with loops

3. **Process Management**
   - [x] Kill running process (SIGTERM)
   - [x] Kill unresponsive process (SIGKILL)
   - [x] Multiple concurrent processes
   - [x] Clear completed processes

4. **State Persistence**
   - [x] Browser refresh - processes persist
   - [x] Server restart - running processes marked as killed
   - [x] Reconnect - see output history

5. **Error Handling**
   - [x] Invalid command (command not found)
   - [x] Command exits with error code
   - [x] Large output (truncation/buffer)

6. **UI/UX**
   - [x] Switch between Chat/Terminal modes
   - [x] Command history (up/down arrows)
   - [x] Multiline input with `\`
   - [x] Copy output
   - [x] Scroll behavior

### ❌ Known Limitations (Tested & Documented)

1. **Interactive Programs**
   - [x] nano - doesn't work (no stdin)
   - [x] vim - doesn't work (no stdin)
   - [x] python REPL - doesn't work (no stdin)
   - [x] sudo password - hangs (no stdin)

---

## Future Enhancements

Potential improvements not yet implemented:

### Terminal Interactivity (Separate Feature)
- [ ] stdin input support (FEATURE_TERMINAL_INTERACTIVE.md)
- [ ] PTY support for full terminal emulation
- [ ] Interactive program support (nano, vim)

### UX Improvements
- [ ] Terminal themes (light/dark variants)
- [ ] Custom syntax highlighting rules
- [ ] Output search/filter
- [ ] Process naming/labeling
- [ ] Sound notification on process exit
- [ ] Keyboard shortcut to toggle terminal (Ctrl+`)
- [ ] Split view (chat + terminal simultaneously)

### Advanced Features
- [ ] Shell session persistence (maintain cwd, env)
- [ ] Job control (bg, fg, Ctrl+Z)
- [ ] Terminal recording/playback
- [ ] Export output to file
- [ ] Process resource monitoring (CPU, memory)

---

## Related Documentation

- **[FEATURE_TERMINAL_INTERACTIVE.md](./FEATURE_TERMINAL_INTERACTIVE.md)** - Planned stdin input support
- **[CHANGELOG.md](../CHANGELOG.md)** - Terminal feature release notes
- **[CLAUDE.md](../CLAUDE.md)** - Development workflow

---

## Success Criteria

All original goals achieved:

- ✅ Execute shell commands from web UI
- ✅ Stream stdout/stderr in real-time
- ✅ Run multiple concurrent processes
- ✅ Kill running processes
- ✅ Persist state across refreshes
- ✅ Command history with keyboard navigation
- ✅ User-friendly output display
- ✅ Integrate seamlessly with chat interface
- ✅ Handle long-running processes
- ✅ Error handling and edge cases

---

## Conclusion

The terminal feature is **fully implemented and stable** as of v1.0.0. It provides a robust command execution environment within the chat interface, with excellent UX for non-interactive commands.

For interactive program support (stdin input), see the separate feature plan: **[FEATURE_TERMINAL_INTERACTIVE.md](./FEATURE_TERMINAL_INTERACTIVE.md)**
