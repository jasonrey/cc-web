import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BOOKMARKS_DIR = join(homedir(), '.tofucode');
const BOOKMARKS_FILE = join(BOOKMARKS_DIR, 'terminal-bookmarks.json');
const BOOKMARKS_TMP = `${BOOKMARKS_FILE}.tmp`;

/**
 * Load all bookmarks from disk.
 * @returns {{ global: Array, projects: Object }}
 */
export function loadBookmarks() {
  try {
    if (!existsSync(BOOKMARKS_FILE)) {
      return { global: [], projects: {} };
    }
    const data = readFileSync(BOOKMARKS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return {
      global: parsed.global ?? [],
      projects: parsed.projects ?? {},
    };
  } catch (err) {
    console.error(
      `[bookmarks] failed to load ${BOOKMARKS_FILE} — returning empty state. Error: ${err.message}`,
    );
    return { global: [], projects: {} };
  }
}

/**
 * Save all bookmarks to disk atomically.
 * Writes to a temp file first then renames to prevent partial writes
 * corrupting the bookmarks file if the process is killed mid-write.
 * @param {{ global: Array, projects: Object }} data
 */
export function saveBookmarks(data) {
  try {
    if (!existsSync(BOOKMARKS_DIR)) {
      mkdirSync(BOOKMARKS_DIR, { recursive: true });
    }
    // Write to temp file first, then atomically rename into place
    writeFileSync(BOOKMARKS_TMP, JSON.stringify(data, null, 2), 'utf8');
    renameSync(BOOKMARKS_TMP, BOOKMARKS_FILE);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get bookmarks for a project (flat structure for frontend).
 * @param {string} projectSlug
 * @returns {{ global: Array, project: Array }}
 */
export function getBookmarks(projectSlug) {
  const data = loadBookmarks();
  return {
    global: data.global,
    project: data.projects[projectSlug] ?? [],
  };
}

/**
 * Add a bookmark.
 * @param {'global'|'project'} scope
 * @param {string} projectSlug
 * @param {string} command
 * @param {string|null} cwd
 * @returns {{ global: Array, project: Array }}
 */
export function addBookmark(scope, projectSlug, command, cwd) {
  const data = loadBookmarks();
  const entry = {
    id: crypto.randomUUID(),
    command,
    cwd: cwd || null,
    createdAt: new Date().toISOString(),
    watch: null,
  };

  if (scope === 'global') {
    // Avoid duplicate commands
    if (!data.global.some((b) => b.command === command)) {
      data.global.push(entry);
    }
  } else {
    if (!data.projects[projectSlug]) {
      data.projects[projectSlug] = [];
    }
    if (!data.projects[projectSlug].some((b) => b.command === command)) {
      data.projects[projectSlug].push(entry);
    }
  }

  saveBookmarks(data);
  return getBookmarks(projectSlug);
}

/**
 * Remove a bookmark by ID.
 * @param {'global'|'project'} scope
 * @param {string} projectSlug
 * @param {string} id
 * @returns {{ global: Array, project: Array }}
 */
export function removeBookmark(scope, projectSlug, id) {
  const data = loadBookmarks();

  if (scope === 'global') {
    data.global = data.global.filter((b) => b.id !== id);
  } else {
    if (data.projects[projectSlug]) {
      data.projects[projectSlug] = data.projects[projectSlug].filter(
        (b) => b.id !== id,
      );
    }
  }

  saveBookmarks(data);
  return getBookmarks(projectSlug);
}

/**
 * Update the watch config for a specific bookmark.
 * @param {'global'|'project'} scope
 * @param {string} projectSlug
 * @param {string} bookmarkId
 * @param {{ enabled: boolean, interval: number, mode: string } | null} watchConfig
 * @returns {{ global: Array, project: Array }}
 */
export function updateBookmarkWatch(
  scope,
  projectSlug,
  bookmarkId,
  watchConfig,
) {
  const data = loadBookmarks();

  const list =
    scope === 'global' ? data.global : (data.projects[projectSlug] ?? []);
  const bookmark = list.find((b) => b.id === bookmarkId);
  if (bookmark) {
    bookmark.watch = watchConfig;
  }

  if (scope !== 'global') {
    data.projects[projectSlug] = list;
  }

  saveBookmarks(data);
  return getBookmarks(projectSlug);
}
