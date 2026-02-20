/**
 * Watch Manager
 *
 * Manages server-side watch loops for bookmarked commands.
 * Each watch runs a command repeatedly at a configured interval,
 * replacing the output each time (not appending).
 *
 * Uses self-scheduling setTimeout (not setInterval) so the next tick
 * only fires after the previous process exits — preventing tick overlap
 * and runaway heap growth if commands hang.
 *
 * Watch state is persisted in bookmark entries (watch.enabled = true).
 * Project-scoped bookmarks resume automatically on server restart.
 * Global bookmarks require an explicit projectSlug and must be re-enabled
 * by the client after connecting (we don't store which project they run under).
 */

import { logger } from './logger.js';
import processManager from './processManager.js';
import { broadcast } from './ws.js';

// Default timeout (ms) for a single watch tick before it is killed.
// Prevents a hanging command from blocking all future ticks indefinitely.
const DEFAULT_TICK_TIMEOUT_MS = 30_000;

class WatchManager {
  // Map<bookmarkId, WatchState>
  // WatchState = { timer, tickTimeoutTimer, projectSlug, bookmark, currentProcessId, currentExitListener, stopped }
  watches = new Map();

  /**
   * Start a watch for a bookmark.
   * Runs immediately on the first tick, then self-schedules after each run completes.
   * Replaces any existing watch for this bookmark.
   *
   * @param {string} projectSlug
   * @param {Object} bookmark - { id, command, cwd, watch: { interval, mode, timeout? } }
   */
  startWatch(projectSlug, bookmark) {
    // Stop any existing watch first (cleans up listeners and timers)
    this.stopWatch(bookmark.id);

    const state = {
      timer: null, // setTimeout for next scheduled tick
      tickTimeoutTimer: null, // setTimeout for per-tick kill timeout
      projectSlug,
      bookmark,
      currentProcessId: null,
      currentExitListener: null, // reference so we can remove it on stopWatch
      stopped: false,
    };

    this.watches.set(bookmark.id, state);
    logger.log(
      `[watch] start bookmarkId=${bookmark.id} cmd="${bookmark.command}" interval=${bookmark.watch?.interval ?? 10}s`,
    );

    // Run immediately (first tick, no delay)
    this._runTick(projectSlug, bookmark, state);
  }

  /**
   * Stop a watch by bookmark ID.
   * Cleans up timers, exit listeners, and kills the current process.
   *
   * @param {string} bookmarkId
   */
  stopWatch(bookmarkId) {
    const watch = this.watches.get(bookmarkId);
    if (!watch) return;

    // Mark stopped so any in-flight callback won't reschedule
    watch.stopped = true;

    // Cancel the pending next-tick timer
    if (watch.timer) {
      clearTimeout(watch.timer);
      watch.timer = null;
    }

    // Cancel the per-tick kill timeout
    if (watch.tickTimeoutTimer) {
      clearTimeout(watch.tickTimeoutTimer);
      watch.tickTimeoutTimer = null;
    }

    // Remove the exit listener from the current process to prevent stale broadcasts
    if (watch.currentProcessId && watch.currentExitListener) {
      const proc = processManager.getProcess(
        watch.projectSlug,
        watch.currentProcessId,
      );
      if (proc?.proc) {
        proc.proc.removeListener('exit', watch.currentExitListener);
      }
      watch.currentExitListener = null;
    }

    // Kill the currently running process
    if (watch.currentProcessId) {
      processManager.kill(watch.projectSlug, watch.currentProcessId, 'SIGKILL');
    }

    this.watches.delete(bookmarkId);
    logger.log(`[watch] stop bookmarkId=${bookmarkId}`);
  }

  /**
   * Stop all watches for a project.
   * @param {string} projectSlug
   */
  stopAllForProject(projectSlug) {
    for (const [bookmarkId, watch] of this.watches) {
      if (watch.projectSlug === projectSlug) {
        this.stopWatch(bookmarkId);
      }
    }
  }

  /**
   * Return the list of currently active watch bookmark IDs.
   * @returns {string[]}
   */
  getActiveWatchIds() {
    return Array.from(this.watches.keys());
  }

  /**
   * Called on server start — resume project-scoped watches that have watch.enabled = true.
   *
   * Global bookmarks are intentionally skipped: they require a projectSlug to run
   * but we don't persist which project they were last used under. They will resume
   * when the client explicitly sends terminal:watch:update after connecting.
   *
   * @param {{ global: Array, projects: Object }} allBookmarks
   */
  loadFromBookmarks(allBookmarks) {
    let resumed = 0;
    for (const [slug, bookmarks] of Object.entries(
      allBookmarks.projects ?? {},
    )) {
      for (const b of bookmarks) {
        if (b.watch?.enabled) {
          this.startWatch(slug, b);
          resumed++;
        }
      }
    }
    if (resumed > 0) {
      logger.log(
        `[watch] resumed ${resumed} project-scoped watch(es) from disk`,
      );
    }
  }

  /**
   * Execute one watch tick: kill previous run, spawn new one, broadcast,
   * then self-schedule the next tick only after this process exits.
   *
   * @private
   */
  _runTick(projectSlug, bookmark, state) {
    // Guard: watch may have been stopped between scheduling and firing
    if (state.stopped) return;

    // Kill and clean up the previous process if still running
    if (state.currentProcessId) {
      // Remove the previous exit listener before removing the process
      // so we don't broadcast a stale update for an already-removed entry
      if (state.currentExitListener) {
        const prev = processManager.getProcess(
          projectSlug,
          state.currentProcessId,
        );
        if (prev?.proc) {
          prev.proc.removeListener('exit', state.currentExitListener);
        }
        state.currentExitListener = null;
      }

      const prev = processManager.getProcess(
        projectSlug,
        state.currentProcessId,
      );
      if (prev?.status === 'running') {
        processManager.kill(projectSlug, state.currentProcessId, 'SIGKILL');
      }
      // Remove from history so it doesn't clutter the history tab
      processManager.remove(projectSlug, state.currentProcessId);
    }

    // Spawn new process tagged as a watch process
    const entry = processManager.spawn(projectSlug, {
      command: bookmark.command,
      cwd: bookmark.cwd || undefined,
      isWatch: true,
      watchBookmarkId: bookmark.id,
      watchBookmarkScope: bookmark._scope ?? 'project',
      watchMode: bookmark.watch.mode || 'stdout',
    });

    state.currentProcessId = entry.id;
    state.bookmark = bookmark; // keep config fresh in case it changed

    logger.log(
      `[watch] tick bookmarkId=${bookmark.id} processId=${entry.id} cmd="${bookmark.command}"`,
    );

    // Stream stdout/stderr and broadcast output to all clients
    entry.proc.stdout.on('data', (data) => {
      const text = data.toString();
      processManager.addOutput(entry, 'stdout', text);
      broadcast({
        type: 'terminal:output',
        projectSlug,
        processId: entry.id,
        stream: 'stdout',
        data: text,
      });
    });

    entry.proc.stderr.on('data', (data) => {
      const text = data.toString();
      processManager.addOutput(entry, 'stderr', text);
      broadcast({
        type: 'terminal:output',
        projectSlug,
        processId: entry.id,
        stream: 'stderr',
        data: text,
      });
    });

    // Broadcast immediately so all clients see the new running process
    broadcast({
      type: 'terminal:watch:tick',
      projectSlug,
      process: processManager.serialize(entry),
    });

    // Per-tick timeout: kill the process if it runs longer than the limit
    const tickTimeoutMs =
      (bookmark.watch?.timeout ?? 0) > 0
        ? bookmark.watch.timeout * 1000
        : DEFAULT_TICK_TIMEOUT_MS;

    state.tickTimeoutTimer = setTimeout(() => {
      state.tickTimeoutTimer = null;
      const current = processManager.getProcess(projectSlug, entry.id);
      if (current?.status === 'running') {
        logger.log(
          `[watch] tick timeout bookmarkId=${bookmark.id} processId=${entry.id} — killing after ${tickTimeoutMs}ms`,
        );
        processManager.kill(projectSlug, entry.id, 'SIGKILL');
      }
    }, tickTimeoutMs);

    // Build the exit listener as a named function so we can remove it later
    const onExit = () => {
      // Clear tick timeout — process exited on its own
      if (state.tickTimeoutTimer) {
        clearTimeout(state.tickTimeoutTimer);
        state.tickTimeoutTimer = null;
      }

      // Clear the listener reference now that it has fired
      state.currentExitListener = null;

      // Only broadcast if this process is still tracked (not already removed by the next tick)
      const still = processManager.getProcess(projectSlug, entry.id);
      if (still) {
        broadcast({
          type: 'terminal:processes:update',
          projectSlug,
          process: processManager.serialize(entry),
        });
      }

      // Only schedule the next tick if the watch is still active
      if (state.stopped) return;

      const intervalMs =
        Math.max(1, state.bookmark.watch?.interval ?? 10) * 1000;
      state.timer = setTimeout(() => {
        state.timer = null;
        this._runTick(projectSlug, state.bookmark, state);
      }, intervalMs);
    };

    state.currentExitListener = onExit;
    entry.proc.on('exit', onExit);
  }

  /**
   * Clean up all watches on shutdown.
   */
  destroy() {
    const ids = Array.from(this.watches.keys());
    for (const bookmarkId of ids) {
      this.stopWatch(bookmarkId);
    }
    logger.log('[watch] all watches stopped');
  }
}

export default new WatchManager();
