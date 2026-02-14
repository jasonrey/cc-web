/**
 * Shared restart utility for server restarts and upgrades
 */

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { logger } from './logger.js';

/**
 * Restart server with inverted spawn strategy
 * New process starts first, then old process exits
 *
 * @param {string} reason - Reason for restart (e.g., "upgrade", "restart")
 * @param {string} [newVersion] - New version being installed (for upgrades)
 * @returns {Promise<string>} Token for the new process
 */
export async function restartWithInvertedSpawn(reason, newVersion = null) {
  // Generate unique restart token
  const restartToken = randomBytes(16).toString('hex');

  // Spawn new server process (detached, will outlive this process)
  const newProc = spawn(process.execPath, process.argv.slice(1), {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      RESTART_TOKEN: restartToken,
      IS_RESTART: 'true',
      UPGRADE_RETRY_BIND: 'true',
      UPGRADE_MAX_RETRIES: process.env.UPGRADE_MAX_RETRIES || '20',
      UPGRADE_RETRY_INTERVAL: process.env.UPGRADE_RETRY_INTERVAL || '1000',
    },
  });

  newProc.unref(); // Allow this process to exit independently

  logger.log(
    `New server process spawned (PID: ${newProc.pid}, reason: ${reason}${newVersion ? `, version: ${newVersion}` : ''})`,
  );

  // Update PID file if it exists (for daemon mode)
  const pidFile = getPidFile();
  if (pidFile && existsSync(pidFile)) {
    try {
      writeFileSync(pidFile, newProc.pid.toString(), 'utf8');
      logger.log(`Updated PID file: ${pidFile} -> ${newProc.pid}`);
    } catch (err) {
      logger.log(`Warning: Failed to update PID file: ${err.message}`);
    }
  }

  // Wait for new server to be ready (verify it started)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Verify new process is still running
  try {
    // Send signal 0 to check if process exists (doesn't actually signal it)
    process.kill(newProc.pid, 0);
    logger.log(`Verified new server process is running (PID: ${newProc.pid})`);
  } catch (_err) {
    throw new Error(`New server process failed to start (PID: ${newProc.pid})`);
  }

  return restartToken;
}

/**
 * Get PID file path (matches CLI logic)
 * @returns {string|null} PID file path or null if not in daemon mode
 */
function getPidFile() {
  // Check environment variable (set by CLI)
  if (process.env.PID_FILE) {
    return resolve(process.env.PID_FILE);
  }

  // Check default location only if we think we're in daemon mode
  // (heuristic: if we were started with detached stdio, likely daemon)
  const defaultPidFile = join(homedir(), '.tofucode', 'tofucode.pid');
  if (existsSync(defaultPidFile)) {
    return defaultPidFile;
  }

  return null;
}
