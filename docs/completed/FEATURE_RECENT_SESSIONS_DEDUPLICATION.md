# Recent Sessions Deduplication

## Requirements

- Deduplicate sessions across multiple projects when the same session ID exists in different project slugs
- Show only the most recently updated version of each session
- Maintain accurate timestamps and project associations

## Context

Sessions can appear in multiple project directories when:
1. Projects are accessed from different working directories (e.g., `/home/user/project` vs `/home/user`)
2. Symbolic links create multiple paths to the same project
3. Project is moved/renamed but old session directories remain

This resulted in duplicate entries in the Recent Sessions view, showing the same session multiple times with potentially stale data.

## Issues

- `get-recent-sessions.js` was collecting all sessions from all project directories without checking for duplicate session IDs
- Sessions with identical IDs from different project paths would all appear in the list
- No mechanism to determine which version was most recent or authoritative

## Plan

1. Track sessions globally using a Map keyed by session ID
2. For duplicate session IDs, keep only the version with the most recent `lastModified` timestamp
3. Ensure session object includes all necessary fields (sessionId, projectPath, title, lastModified, messageCount)
4. Sort final results by timestamp (most recent first)

## Implementation

### Changes to `get-recent-sessions.js`

- Replaced simple array accumulation with Map-based deduplication
- Changed from `const allSessions = []` to `const globalSessions = new Map()`
- For each session found:
  - Check if session ID already exists in map
  - If new or more recent, store in map
  - If older, skip
- Convert Map values to array for final sorting and limiting

### Algorithm

```javascript
// Track all sessions globally - use Map to keep most recent version
const globalSessions = new Map(); // sessionId -> session object

// For each project directory
for (const entry of entries) {
  // ... load sessions for project

  for (const session of sessions) {
    const existing = globalSessions.get(session.sessionId);

    // Keep this version if it's newer or doesn't exist yet
    if (!existing || session.lastModified > existing.lastModified) {
      globalSessions.set(session.sessionId, {
        ...session,
        projectPath // Override with current project path
      });
    }
  }
}

// Convert to array and sort by timestamp
const allSessions = Array.from(globalSessions.values());
```

## Testing

Manual testing confirmed:
1. Duplicate sessions (same ID across different project paths) now appear only once
2. Most recent version is preserved based on JSONL file modification time
3. Session data (title, message count, project path) is accurate
4. Recent Sessions view displays clean, deduplicated list

## Status

✅ **Completed** - Recent sessions are now properly deduplicated, showing only the most recent version of each unique session.
