# Fuzzy File Picker (Cmd+P)

## Overview

Global fuzzy file search accessible via `Cmd+P` keyboard shortcut, similar to VS Code's Quick Open feature. Allows users to quickly find and open files within the current project without navigating through the file explorer.

## Features

### Search Features
- **Fuzzy matching**: Case-insensitive fuzzy search - matches if all query characters appear in order
- **Glob patterns**: Supports wildcards like `*.md`, `*.js`, `test*.ts`, etc.
- **Folder search**: Includes directories in results, navigate to folders in Files mode
- **Debounced search**: 150ms debounce to avoid excessive server requests
- **Smart filtering**: Automatically skips `node_modules`, `.git`, `dist`, build folders, and hidden files
- **Performance limits**: Max 5 directory levels deep, max 100 results

### User Interface
- **Modal overlay**: Centered modal with blur backdrop (z-index: 1000)
- **Search-as-you-type**: Results update in real-time as user types
- **Keyboard navigation**:
  - `↑` / `↓` Arrow keys to select items
  - `Enter` to open selected file/folder
  - `Esc` to close
- **Visual feedback**:
  - Highlighted matching characters in yellow
  - "Searching..." indicator during active search
  - Folder icon (blue) vs file icon (gray)
  - Relative path shown below item name
  - Glob pattern hint in empty state

### File Editor Modal
- **Simple text editor**: For viewing and editing files
- **Image preview**: Displays images inline (PNG, JPG, etc.)
- **Syntax detection**: Detects file type based on extension
- **Save functionality**: `Cmd+S` to save changes
- **Dirty state tracking**: Warns before closing with unsaved changes
- **File info footer**: Shows file type and size

## Implementation

### Backend

**Event Handler**: `server/events/search-files.js`
- `handleFilesSearch(ws, payload, context)`: WebSocket event handler
- `searchFiles(dirPath, query, maxDepth, maxResults, basePath)`: Recursive search function

**Event Registration**: `server/events/index.js`
- Added `'files:search': handleFilesSearch` to handlers map

**WebSocket Events**:
- Request: `{ type: 'files:search', query: string, projectPath: string }`
- Success: `{ type: 'files:search:result', query, projectPath, results, count }`
- Error: `{ type: 'files:search:error', query, error }`

**Result Format**:
```javascript
{
  name: 'filename.js',
  path: '/full/path/to/filename.js',
  relativePath: 'src/components/filename.js',
  directory: 'src/components'
}
```

### Frontend

**Components**:
1. `FilePicker.vue` - Search modal with fuzzy matching UI

**App.vue Integration**:
- Global keyboard shortcut: `Cmd+P` / `Ctrl+P`
- File picker state management
- Navigation to Files mode with selected file
- Project path extraction from current route
- Provide/inject for selected file path

**ChatView.vue Integration**:
- Query param watcher for `mode` and `file` params
- Automatic mode switching to Files mode
- File loading when navigating from file picker
- URL cleanup after file is loaded

**Keyboard Shortcut**:
```javascript
// Ctrl+P or Cmd+P: Open file picker
if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
  e.preventDefault();
  showFilePicker.value = true;
}
```

**URL Routing**:
- File picker navigates to: `/project/:project/session/:session?mode=files&file=/path/to/file`
- ChatView detects query params, opens file, then cleans URL
- Works from any page within a project/session

## User Flow

1. User presses `Cmd+P` from anywhere in the app
2. File picker modal opens with focus on search input
3. User types search query (e.g., "appv" to find "App.vue")
4. Backend performs fuzzy search in current project
5. Results update in real-time with highlighted matches
6. User navigates with arrow keys or mouse hover
7. User presses `Enter` or clicks to select file
8. App navigates to Files mode with query params
9. ChatView detects query params and loads file content
10. File opens in existing Files mode editor (FileEditor.vue)
11. User can edit, save, or navigate away

## Security

- **Path validation**: Uses existing `validatePath` from `files.js`
- **Project scope**: Search limited to current project path only
- **Directory traversal protection**: Resolves symlinks and validates paths
- **File size limits**: Inherits 10MB limit from `files:read` handler
- **Binary file protection**: Cannot edit binary files (from existing handler)

## Performance Considerations

- **Debounced search**: Prevents excessive server requests
- **Max results**: Limited to 100 files to avoid UI lag
- **Max depth**: Limited to 5 directory levels
- **Skip common dirs**: Avoids searching `node_modules`, `.git`, etc.
- **Early termination**: Search stops once max results reached

## Skipped Directories

The following directories are automatically excluded from search:
- `node_modules`
- `.git`
- `.next`
- `.nuxt`
- `dist`
- `build`
- `coverage`
- `.cache`
- `.DS_Store`
- `__pycache__`
- `.pytest_cache`
- `.venv`
- `venv`
- `.env`

## Search Algorithms

### Fuzzy Matching
Simple character-order matching:
1. Convert query and filename to lowercase
2. Iterate through filename characters
3. Match each query character in order
4. If all query characters matched, include in results

**Example**:
- Query: "appv"
- Matches: "App.vue", "application.vue", "AppView.vue"
- No match: "View.js", "Project.vue"

### Glob Pattern Matching
When query contains `*` or `?`, switches to glob mode:
1. Convert glob pattern to regex
2. Match against filename (case-insensitive)
3. Supports standard glob syntax

**Examples**:
- `*.md` - All Markdown files
- `*.{js,ts}` - JavaScript and TypeScript files
- `test*.spec.js` - Test files starting with "test"
- `src/**/*.vue` - (Note: currently only matches filename, not path)

### Folder Results
- Folders matching the search query are included
- Folder icon shown in blue
- Selecting a folder navigates to Files mode at that location
- Searching still recurses into all directories

## Future Enhancements

Potential improvements for future versions:
- **Ranking algorithm**: Score results by match quality
- **Recent files**: Show recently opened files at top
- **File content search**: Search within file contents (like Cmd+Shift+F)
- **Multiple projects**: Search across all projects, not just current
- **File preview**: Show file preview on hover
- **Syntax highlighting**: Add Monaco Editor or similar for code files
- **File operations**: Create, rename, delete files from picker

## Architecture Benefits

**Why URL Routing Instead of Modal Editor:**
1. **Consistent UX**: Uses the same FileEditor component as Files mode (Cmd+3)
2. **Browser integration**: Files get proper URL, enabling browser back/forward
3. **Deep linking**: Can share links to specific files
4. **Session persistence**: File stays open when refreshing page
5. **Code reuse**: No duplicate editor implementation needed

**Navigation Flow:**
```
Cmd+P → FilePicker Modal
  ↓ (select file)
Router.push({ query: { mode: 'files', file: '/path' } })
  ↓
ChatView watcher detects query params
  ↓
currentMode.value = 'files'
openedFile.value = { path, loading: true }
send({ type: 'files:read', path })
  ↓
FileEditor renders with content
  ↓
Router.replace({}) // Clean up query params
```

## Related Features

- File Explorer (`Cmd+3` in Chat View) - Full file tree navigation
- Command Palette (`Cmd+K`) - Session and project navigation
- File Editor - Used in Chat View Files mode and Memo
- Quick Access Memo (`Cmd+M`) - Fast TODO.md editing

## Testing

Manual testing checklist:
- [ ] `Cmd+P` opens file picker
- [ ] Search input is auto-focused
- [ ] Typing triggers debounced search
- [ ] Results update in real-time
- [ ] Arrow keys navigate results
- [ ] Enter opens selected file
- [ ] File content loads correctly
- [ ] Editor modal displays content
- [ ] `Cmd+S` saves changes
- [ ] Dirty state warning works
- [ ] `Esc` closes modals
- [ ] Images display correctly
- [ ] Binary files rejected
- [ ] Search limited to current project
- [ ] Common directories skipped

## Critical Bug Fixes

### Bug #1: File Selection Not Opening Files
**Symptom**: Clicking a file in the picker closed the modal but didn't open the file in the editor.

**Root Cause**: Query param cleanup was removing the `file` param before the file could load:
```javascript
// WRONG - Removes file param immediately in nextTick
if (query.file && query.mode === 'files') {
  openedFile.value = { path: query.file, content: '', loading: true };
  send({ type: 'files:read', path: query.file });

  nextTick(() => {
    router.replace({ query: { mode: 'files' } }); // ❌ Removes file param too soon!
  });
}
```

**Fix**: Keep query params in URL (no cleanup):
```javascript
// CORRECT - Keep file param in URL
if (query.file && query.mode === 'files') {
  openedFile.value = { path: query.file, content: '', loading: true };
  send({ type: 'files:read', path: query.file });
  // Note: Keep file param in URL so it stays after refresh
}
```

### Bug #2: Initial Directory Listing Not Showing
**Symptom**: File picker showed empty state until user started typing.

**Root Cause**: No initial browse request was being sent.

**Fix**: Send `files:browse` when picker opens:
```javascript
watch(
  () => props.show,
  (isVisible) => {
    if (isVisible) {
      send({
        type: 'files:browse',
        path: route.params.project, // Send project slug, backend converts
      });
    }
  },
);
```

### Bug #3: Backend Couldn't Handle Project Slugs
**Symptom**: `files:browse` failed with path errors when given project slug.

**Root Cause**: Backend expected filesystem paths, not slugs like `-home-ts-projects-cc-web`.

**Fix**: Convert slugs to paths in backend:
```javascript
// server/events/files.js - handleFilesBrowse
if (folderPath?.startsWith('-')) {
  folderPath = slugToPath(folderPath);
}
```

## Testing Results

End-to-end Playwright testing verified:

✅ **Cmd+P opens file picker** from Chat, Terminal, and Files tabs
✅ **Initial directory listing** shows 30+ files/folders before typing
✅ **File selection** navigates to Files mode and opens in editor
✅ **Folder selection** navigates to Files mode and browses folder
✅ **Escape closes modal** from any state
✅ **URL includes file params** for shareability: `?mode=files&file=/path`
✅ **File editor displays content** correctly
✅ **Global shortcut works** from all views

## Version

- **Added in**: v1.0.4
- **Status**: ✅ Completed and tested
- **Testing**: End-to-end Playwright tests passing
