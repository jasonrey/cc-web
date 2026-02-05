// Catch unhandled errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

// Graceful shutdown handler - defined after server is created
let isShuttingDown = false;
let httpServer = null; // Will be set after server creation

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log('Force shutdown...');
    process.exit(1);
  }

  isShuttingDown = true;
  console.log(`\n${signal} received, shutting down gracefully...`);

  try {
    // Cancel all running tasks
    const { tasks } = await import('./lib/tasks.js');
    for (const [sessionId, task] of tasks) {
      if (task.status === 'running' && task.abortController) {
        console.log(`Cancelling task for session ${sessionId}`);
        task.abortController.abort();
      }
    }

    // Close HTTP server
    if (httpServer) {
      httpServer.close(() => {
        console.log('HTTP server closed');
      });
    }

    // Give a moment for cleanup then exit
    setTimeout(() => {
      console.log('Shutdown complete');
      process.exit(0);
    }, 500);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

import { config } from './config.js';
import {
  isAuthDisabled,
  isAuthSetup,
  login,
  logout,
  parseSessionCookie,
  setupPassword,
  validateSession,
} from './lib/auth.js';
import { handleWebSocket } from './websocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Set reference for graceful shutdown
httpServer = server;

// Parse JSON and cookies
app.use(express.json());

// Session duration for cookie (from env or default 3 days)
const SESSION_DURATION_DAYS = Number.parseInt(
  process.env.SESSION_DURATION_DAYS || '3',
  10,
);
// Secure cookie flag (requires HTTPS - enable if behind nginx/caddy with SSL)
const SECURE_COOKIE = process.env.SECURE_COOKIE === 'true';

// ============================================
// Auth API Routes (unauthenticated)
// ============================================

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth status - check if setup is needed
app.get('/api/auth/status', (req, res) => {
  if (isAuthDisabled()) {
    return res.json({ authDisabled: true, authenticated: true });
  }

  const token = parseSessionCookie(req.headers.cookie);
  const authenticated = validateSession(token);
  const needsSetup = !isAuthSetup();

  res.json({ needsSetup, authenticated, authDisabled: false });
});

// Setup password (first time only)
app.post('/api/auth/setup', async (req, res) => {
  if (isAuthDisabled()) {
    return res.status(400).json({ error: 'Auth is disabled' });
  }

  if (isAuthSetup()) {
    return res.status(400).json({ error: 'Password already set up' });
  }

  const { password } = req.body;
  if (!password || password.length < 4) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 4 characters' });
  }

  try {
    const { token, expiresAt } = await setupPassword(password);

    res.cookie('session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: SECURE_COOKIE,
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  if (isAuthDisabled()) {
    return res.status(400).json({ error: 'Auth is disabled' });
  }

  const { password } = req.body;
  const userAgent = req.headers['user-agent'] || '';

  const result = await login(password, userAgent);
  if (!result) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.cookie('session', result.token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: SECURE_COOKIE,
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, expiresAt: result.expiresAt });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const token = parseSessionCookie(req.headers.cookie);
  if (token) {
    logout(token);
  }
  res.clearCookie('session');
  res.json({ success: true });
});

// ============================================
// Serve Vue build with auth protection
// ============================================
const distPath = join(rootDir, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for non-API routes
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api') &&
      !req.path.startsWith('/ws')
    ) {
      res.sendFile(join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

// ============================================
// WebSocket upgrade handler with auth
// ============================================
server.on('upgrade', (request, socket, head) => {
  // Check if this is a WebSocket upgrade to /ws
  if (request.url !== '/ws') {
    socket.destroy();
    return;
  }

  // Check auth (skip if disabled)
  if (!isAuthDisabled()) {
    const token = parseSessionCookie(request.headers.cookie);
    if (!validateSession(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
  }

  // Complete the upgrade
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// WebSocket connection handler
wss.on('connection', handleWebSocket);

// POC: Retry binding logic for upgrade/restart scenarios
// This enables inverted spawn strategy for self-updating
// See: docs/FEATURE_UPDATE_VERSION.md Section 8.1 and 8.3
const isUpgradeRetry = process.env.UPGRADE_RETRY_BIND === 'true';
const maxRetries = Number.parseInt(process.env.UPGRADE_MAX_RETRIES || '20', 10);
const retryInterval = Number.parseInt(
  process.env.UPGRADE_RETRY_INTERVAL || '500',
  10,
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer() {
  if (isUpgradeRetry) {
    console.log(
      `🔄 Upgrade mode: Will retry port binding up to ${maxRetries} times`,
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          server.once('error', reject);
          server.listen(config.port, () => {
            server.removeListener('error', reject);
            resolve();
          });
        });

        console.log(`✅ Bound to port ${config.port} on attempt ${attempt}`);
        onServerReady();
        return;
      } catch (err) {
        if (err.code === 'EADDRINUSE') {
          console.log(
            `⏳ Port ${config.port} in use, retry ${attempt}/${maxRetries}...`,
          );
          await sleep(retryInterval);
        } else {
          throw err;
        }
      }
    }

    console.error(
      `❌ Failed to bind to port ${config.port} after ${maxRetries} attempts`,
    );
    process.exit(1);
  } else {
    // Normal startup
    server.listen(config.port, onServerReady);
  }
}

function onServerReady() {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`WebSocket available at ws://localhost:${config.port}/ws`);
  if (isAuthDisabled()) {
    console.log('⚠️  Authentication is DISABLED');
  } else if (!isAuthSetup()) {
    console.log(
      '🔐 First time setup required - visit the web UI to set password',
    );
  }
  if (isUpgradeRetry) {
    console.log('🎉 Upgrade restart complete!');
  }
}

// Start the server
startServer();
