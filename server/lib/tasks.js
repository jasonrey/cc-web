/**
 * Task management - tracks running/completed tasks per session
 */

// Tasks per session (sessionId -> task)
export const tasks = new Map();

// Max results to keep in memory per task (prevents unbounded growth)
const MAX_RESULTS_PER_TASK = 500;

/**
 * Get or create task for session
 * @param {string} sessionId
 * @returns {Object} task object
 */
export function getOrCreateTask(sessionId) {
  if (!tasks.has(sessionId)) {
    tasks.set(sessionId, {
      id: null,
      status: 'idle',
      results: [],
      error: null,
      startTime: null,
      abortController: null,
    });
  }
  return tasks.get(sessionId);
}

/**
 * Add result to task with memory limit
 * @param {Object} task
 * @param {Object} result
 */
export function addTaskResult(task, result) {
  task.results.push(result);
  // Trim oldest results if over limit (keep recent context)
  if (task.results.length > MAX_RESULTS_PER_TASK) {
    task.results = task.results.slice(-MAX_RESULTS_PER_TASK);
  }
}

/**
 * Clear completed tasks older than specified age
 * @param {number} maxAgeMs - Max age in milliseconds
 * @returns {number} Number of tasks cleared
 */
export function clearOldTasks(maxAgeMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  let cleared = 0;

  for (const [sessionId, task] of tasks) {
    if (
      task.status !== 'running' &&
      task.startTime &&
      now - task.startTime > maxAgeMs
    ) {
      tasks.delete(sessionId);
      cleared++;
    }
  }

  return cleared;
}

/**
 * Clear a completed/error task when user has viewed it
 * Helps prevent memory buildup by immediately clearing tasks once acknowledged
 * @param {string} sessionId
 * @returns {boolean} Whether task was cleared
 */
export function clearCompletedTask(sessionId) {
  const task = tasks.get(sessionId);
  if (task && (task.status === 'completed' || task.status === 'error')) {
    tasks.delete(sessionId);
    return true;
  }
  return false;
}

/**
 * Cancel a running task
 * @param {string} sessionId
 * @returns {boolean} Whether cancellation was successful
 */
export function cancelTask(sessionId) {
  const task = tasks.get(sessionId);
  if (task && task.status === 'running' && task.abortController) {
    task.abortController.abort();
    return true;
  }
  return false;
}
