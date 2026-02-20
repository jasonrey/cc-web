/**
 * Git Clone WebSocket Event Handler
 *
 * Clones a remote git repository into a local directory.
 * Streams real-time output to the client.
 */

import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { config, pathToSlug } from '../config.js';
import processManager from '../lib/processManager.js';
import { send } from '../lib/ws.js';

// Characters that could be used for shell injection
const UNSAFE_CHARS = /[;&|`$()><\n\r]/;

/**
 * Expand a leading ~ to the user's home directory.
 * Node.js does not expand tildes natively.
 * @param {string} p
 * @returns {string}
 */
function expandTilde(p) {
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(homedir(), p.slice(1));
  }
  return p;
}

/**
 * Extract the repository name from a git remote URL.
 * Handles SSH, HTTPS, and plain path formats.
 * @param {string} repoUrl
 * @returns {string}
 */
function extractRepoName(repoUrl) {
  // Get last path segment, strip .git suffix
  const lastSegment = repoUrl.split('/').pop() || '';
  return lastSegment.replace(/\.git$/, '') || 'repo';
}

/**
 * Event: git_clone
 *
 * Clone a remote git repository into a local directory.
 *
 * @event git_clone
 * @param {Object} message - { repoUrl: string, targetDir: string, sshKeyPath?: string }
 * @returns {void} Sends: git_clone:started, git_clone:output (streamed), git_clone:done | git_clone:error
 */
export async function handler(ws, message) {
  const { repoUrl, targetDir, sshKeyPath } = message;

  // Validate repoUrl
  if (!repoUrl || typeof repoUrl !== 'string' || !repoUrl.trim()) {
    send(ws, {
      type: 'git_clone:error',
      message: 'Repository URL is required',
    });
    return;
  }

  const trimmedUrl = repoUrl.trim();
  if (UNSAFE_CHARS.test(trimmedUrl)) {
    send(ws, {
      type: 'git_clone:error',
      message: 'Repository URL contains invalid characters',
    });
    return;
  }

  // Validate targetDir
  if (!targetDir || typeof targetDir !== 'string' || !targetDir.trim()) {
    send(ws, {
      type: 'git_clone:error',
      message: 'Target directory is required',
    });
    return;
  }

  const trimmedTargetDir = path.resolve(expandTilde(targetDir.trim()));

  if (!existsSync(trimmedTargetDir)) {
    send(ws, {
      type: 'git_clone:error',
      message: `Target directory does not exist: ${trimmedTargetDir}`,
    });
    return;
  }

  if (!statSync(trimmedTargetDir).isDirectory()) {
    send(ws, {
      type: 'git_clone:error',
      message: `Target path is not a directory: ${trimmedTargetDir}`,
    });
    return;
  }

  // Security: validate targetDir is within rootPath if set
  if (config.rootPath) {
    const resolvedRoot = path.resolve(config.rootPath);
    const relativePath = path.relative(resolvedRoot, trimmedTargetDir);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      send(ws, {
        type: 'git_clone:error',
        message: `Access denied: target directory is outside root (${config.rootPath})`,
      });
      return;
    }
  }

  // Validate sshKeyPath if provided
  let trimmedSshKeyPath = null;
  if (sshKeyPath && typeof sshKeyPath === 'string' && sshKeyPath.trim()) {
    const rawSshKeyPath = sshKeyPath.trim();

    // Reject paths with quotes, spaces, or unsafe chars (path is embedded in a quoted string)
    if (
      rawSshKeyPath.includes('"') ||
      rawSshKeyPath.includes("'") ||
      rawSshKeyPath.includes(' ') ||
      UNSAFE_CHARS.test(rawSshKeyPath)
    ) {
      send(ws, {
        type: 'git_clone:error',
        message: 'SSH key path contains invalid characters',
      });
      return;
    }

    // Expand tilde and resolve to absolute path
    trimmedSshKeyPath = path.resolve(expandTilde(rawSshKeyPath));

    if (!existsSync(trimmedSshKeyPath)) {
      send(ws, {
        type: 'git_clone:error',
        message: `SSH key file does not exist: ${trimmedSshKeyPath}`,
      });
      return;
    }
  }

  // Compute destination path: targetDir/<repoName>
  const repoName = extractRepoName(trimmedUrl);

  // Explicit safety check: repo name must not contain path traversal components
  if (repoName.includes('/') || repoName.includes('\\') || repoName === '..') {
    send(ws, {
      type: 'git_clone:error',
      message: 'Invalid repository name derived from URL',
    });
    return;
  }

  const clonedPath = path.join(trimmedTargetDir, repoName);

  // Build the git clone command
  // Use -- to separate options from the URL (prevents URL being parsed as a flag)
  const quotedUrl = JSON.stringify(trimmedUrl);
  const quotedDest = JSON.stringify(clonedPath);

  let command;
  if (trimmedSshKeyPath) {
    // trimmedSshKeyPath is already resolved and validated (no spaces/quotes)
    command = `GIT_SSH_COMMAND="ssh -i ${trimmedSshKeyPath} -o StrictHostKeyChecking=accept-new" git clone -- ${quotedUrl} ${quotedDest}`;
  } else {
    command = `git clone -- ${quotedUrl} ${quotedDest}`;
  }

  // Spawn the clone process (use a fixed project key since no project exists yet)
  const entry = processManager.spawn('__git_clone__', {
    command,
    cwd: trimmedTargetDir,
  });

  // Notify client that clone started
  send(ws, {
    type: 'git_clone:started',
    processId: entry.id,
    repoUrl: trimmedUrl,
    targetDir: trimmedTargetDir,
    clonedPath,
  });

  // Stream stdout
  entry.proc.stdout.on('data', (data) => {
    const text = data.toString();
    processManager.addOutput(entry, 'stdout', text);
    send(ws, {
      type: 'git_clone:output',
      processId: entry.id,
      stream: 'stdout',
      data: text,
    });
  });

  // Stream stderr (git clone writes progress to stderr by default)
  entry.proc.stderr.on('data', (data) => {
    const text = data.toString();
    processManager.addOutput(entry, 'stderr', text);
    send(ws, {
      type: 'git_clone:output',
      processId: entry.id,
      stream: 'stderr',
      data: text,
    });
  });

  // Handle spawn errors (e.g. git not installed, permission denied on exec)
  entry.proc.on('error', (err) => {
    send(ws, {
      type: 'git_clone:error',
      processId: entry.id,
      message: `Failed to start git: ${err.message}`,
    });
  });

  // Handle process exit
  entry.proc.on('exit', (code) => {
    if (code === 0) {
      const projectSlug = pathToSlug(clonedPath);
      send(ws, {
        type: 'git_clone:done',
        processId: entry.id,
        projectPath: clonedPath,
        projectSlug,
        projectName: repoName,
      });
    } else {
      send(ws, {
        type: 'git_clone:error',
        processId: entry.id,
        message: `git clone failed (exit code ${code})`,
      });
    }
  });
}
