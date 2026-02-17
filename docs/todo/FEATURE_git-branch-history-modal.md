# FEATURE: Git Branch History Modal

**Status:** 💡 Ideation
**Date:** 2026-02-17
**Priority:** TBD

## Overview

Add an interactive Git history viewer when clicking on the branch indicator in the project status bar. This modal would show commit history and diffs for the current branch, providing quick access to recent changes without leaving the chat interface.

## User Story

As a developer working in tofucode, I want to click on the branch indicator (e.g., "AOB-165/anime-primary-genres") to see recent commits and their diffs, so I can quickly review what changed without switching to my terminal or Git client.

## Current Behavior

- Branch name displayed in footer status bar (e.g., "🔀 AOB-165/anime-primary-genres")
- Clicking does nothing - it's just a display
- Users must use terminal mode or external tools to view Git history
- Git diff modal exists but requires manual invocation

## Proposed Behavior

### Trigger
- Click on branch indicator in footer
- Keyboard shortcut (TBD - maybe `Ctrl+G` or `Cmd+G`)

### Modal Content
1. **Header**
   - Current branch name
   - Commit count ahead/behind remote (if available)
   - Close button

2. **Commit List** (scrollable)
   - Shows last N commits (default: 20, configurable)
   - Each commit shows:
     - Short hash (clickable)
     - Author name
     - Relative timestamp (e.g., "2 hours ago")
     - Commit message (first line)
     - Changed files count (e.g., "+3 -1 files")
   - Highlight uncommitted changes at top (if any)

3. **Diff Viewer** (side panel or expandable)
   - Clicking a commit shows its diff
   - Syntax highlighted
   - File-by-file navigation
   - Expand/collapse hunks
   - Line numbers

### Visual Design Ideas

**Option A: Split View**
```
┌─────────────────────────────────────────┐
│  Branch: feature/xyz            [Close] │
├──────────────┬──────────────────────────┤
│ Commit List  │  Diff Viewer             │
│ (40% width)  │  (60% width)             │
│              │                          │
│ • abc123     │  src/file.js             │
│   feat: add  │  @@ -10,5 +10,8 @@      │
│   2h ago     │  - old line              │
│              │  + new line              │
│ • def456     │                          │
│   fix: bug   │                          │
│   5h ago     │                          │
└──────────────┴──────────────────────────┘
```

**Option B: Expandable List**
```
┌─────────────────────────────────────────┐
│  Branch: feature/xyz            [Close] │
├─────────────────────────────────────────┤
│ • abc123  feat: add feature    [View]   │
│   author • 2h ago • 3 files changed     │
│                                         │
│   ▼ Expanded Diff:                      │
│   ┌───────────────────────────────────┐ │
│   │ src/file.js                       │ │
│   │ @@ -10,5 +10,8 @@                │ │
│   │ - old line                        │ │
│   │ + new line                        │ │
│   └───────────────────────────────────┘ │
│                                         │
│ • def456  fix: bug                      │
│   author • 5h ago • 1 file changed      │
└─────────────────────────────────────────┘
```

**Option C: Tabs**
```
┌─────────────────────────────────────────┐
│  Branch: feature/xyz            [Close] │
├─────────────────────────────────────────┤
│ [History] [Changes] [Branches]          │
├─────────────────────────────────────────┤
│                                         │
│ • abc123  feat: add feature             │
│   author • 2h ago • 3 files changed     │
│   [View Diff]                           │
│                                         │
│ • def456  fix: bug                      │
│   author • 5h ago • 1 file changed      │
│   [View Diff]                           │
└─────────────────────────────────────────┘
```

## Technical Implementation

### Backend (WebSocket Events)

**New Events:**
```javascript
// Request git log
{
  type: 'git:log',
  limit: 20,  // Number of commits
  branch: 'current' | 'branch-name',
}

// Response
{
  type: 'git:log:result',
  commits: [
    {
      hash: 'abc123...',
      shortHash: 'abc123',
      author: 'John Doe',
      email: 'john@example.com',
      timestamp: '2026-02-17T10:30:00Z',
      message: 'feat: add feature',
      filesChanged: 3,
      insertions: 15,
      deletions: 8,
    },
    // ...
  ],
}

// Request commit diff
{
  type: 'git:diff',
  commit: 'abc123',  // Can be commit hash, 'HEAD', etc.
}

// Response
{
  type: 'git:diff:result',
  commit: 'abc123',
  diff: '...',  // Full diff text
  files: [
    {
      path: 'src/file.js',
      status: 'modified' | 'added' | 'deleted',
      additions: 10,
      deletions: 5,
      diff: '...',  // Per-file diff
    },
  ],
}
```

**Git Commands:**
```bash
# Get commit log
git log --pretty=format:'%H|%h|%an|%ae|%aI|%s' -n 20

# Get commit stats
git log --pretty=format:'%H' --shortstat -n 20

# Get commit diff
git show <commit-hash>

# Get file list for commit
git show --name-status --pretty=format:'' <commit-hash>
```

### Frontend Components

**New Components:**
- `GitHistoryModal.vue` - Main modal container
- `CommitList.vue` - List of commits
- `CommitItem.vue` - Single commit display
- `DiffViewer.vue` - Diff display (or reuse existing GitDiffModal logic)

**State Management:**
- Load commits on modal open
- Cache commit list (invalidate on new commits)
- Lazy-load diffs (only when requested)
- Virtual scrolling for large commit lists

### Code Organization

```
src/
  components/
    GitHistoryModal.vue       # New
    CommitList.vue            # New
    CommitItem.vue            # New
    GitDiffViewer.vue         # Refactor from GitDiffModal

server/
  events/
    git-log.js                # New
    git-diff.js               # Enhance existing?
  lib/
    git.js                    # Shared Git utilities
```

## Edge Cases & Considerations

### Edge Cases
1. **No Git repository** - Disable branch click, show message
2. **Empty commit history** - Show "No commits yet" message
3. **Very long commit messages** - Truncate with "..." and expand on hover/click
4. **Large diffs** - Paginate or warn user before loading
5. **Merge commits** - Show merged branches, parent commits
6. **Uncommitted changes** - Show working tree status at top
7. **Detached HEAD** - Show warning indicator
8. **Network operations** - Handle fetch/pull status
9. **Binary files in diff** - Show "Binary file changed" message
10. **Permission errors** - Handle git command failures gracefully

### Performance
- **Commit list loading** - Limit to 20-50 commits initially
- **Diff caching** - Cache diffs in memory (clear on modal close)
- **Virtual scrolling** - For commit lists > 50 items
- **Syntax highlighting** - Use async worker for large diffs
- **Debounce** - Search/filter operations

### Security
- **Path validation** - Ensure git commands run in project directory only
- **Command injection** - Sanitize commit hashes (validate hex format)
- **File access** - Respect --root restrictions

### UX Considerations
- **Loading states** - Show skeleton loaders for commits/diffs
- **Error states** - Clear error messages for git failures
- **Empty states** - Helpful messages for new repos
- **Responsive** - Work on smaller screens (collapse to single column)
- **Keyboard navigation** - Arrow keys to navigate commits, Enter to view diff
- **Search/Filter** - Search commits by message, author, or file
- **Copy actions** - Copy commit hash, copy diff

## Future Enhancements (Out of Scope for V1)

- **Branch switching** - Switch branches from modal
- **Branch comparison** - Compare current branch with main/master
- **Commit actions** - Cherry-pick, revert, reset (dangerous!)
- **File history** - Show history for specific file
- **Blame view** - Show line-by-line blame
- **Graph view** - Visual branch/merge graph
- **Remote branches** - List and compare with remote
- **Stash management** - View and apply stashes
- **Interactive rebase** - Too complex, keep in terminal

## Open Questions

1. **Default view preference?**
   - Split view (commit list + diff side-by-side)
   - Expandable list (compact, expand on demand)
   - Tabs (separate views)

2. **Diff viewer placement?**
   - Reuse existing GitDiffModal?
   - Inline in history modal?
   - Separate modal/panel?

3. **Commit limit?**
   - Default to 20? 50? 100?
   - "Load more" button vs infinite scroll?

4. **Caching strategy?**
   - Cache for session duration?
   - Invalidate on new commits (how to detect)?

5. **Integration with existing Git diff modal?**
   - Merge functionality?
   - Keep separate?

6. **Should uncommitted changes show at top?**
   - As a special "Working Changes" item?
   - Or keep separate from history?

## References

- Existing `GitDiffModal.vue` - Diff viewing patterns
- Terminal Git commands - Already integrated
- GitHub/GitLab UI - Inspiration for commit lists

## Related Issues

- Git diff modal already exists but requires manual trigger
- Terminal mode can run git commands but less visual
- No quick way to review recent branch changes

## Success Metrics

- Time to view recent changes reduced
- Fewer context switches to terminal/external tools
- User feedback on usefulness
