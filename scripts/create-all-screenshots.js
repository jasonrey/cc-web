#!/usr/bin/env node
/**
 * Create all showcase screenshots with sample data
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const samplesDir = join(__dirname, '..', 'samples');

const commonStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0a0a0a;
    color: #e5e5e5;
  }
  .app { display: flex; min-height: 100vh; }
  .sidebar {
    width: 280px;
    background: #1a1a1a;
    border-right: 1px solid #2a2a2a;
    display: flex;
    flex-direction: column;
  }
  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid #2a2a2a;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 18px;
    font-weight: 600;
  }
  .app-main { flex: 1; display: flex; flex-direction: column; }
`;

async function createScreenshot(name, htmlContent, cssContent) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await page.goto('about:blank');
    await page.setContent(htmlContent);
    await page.addStyleTag({ content: commonStyles + '\n' + cssContent });
    await page.screenshot({
      path: join(samplesDir, `${name}.png`),
      fullPage: false,
    });
    console.log(`✅ ${name} screenshot saved`);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🚀 Creating showcase screenshots...\n');

  // 2. Chat View
  await createScreenshot('chat-view', `
    <div class="app sidebar-open">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <svg viewBox="0 0 100 100" width="32" height="32">
              <rect width="100" height="100" fill="#f59e0b" rx="20"/>
            </svg>
            <span>tofucode</span>
          </div>
        </div>
        <div class="sidebar-content-minimal">
          <div class="breadcrumb">web-app</div>
        </div>
      </aside>

      <main class="app-main">
        <div class="chat-view">
          <div class="chat-header">
            <div class="breadcrumb-path">web-app / Add authentication</div>
          </div>

          <div class="chat-messages">
            <div class="message user-message">
              <div class="message-avatar">👤</div>
              <div class="message-content">
                <p>Help me add user authentication to the app. We need login, signup, and password reset functionality.</p>
              </div>
            </div>

            <div class="message assistant-message">
              <div class="message-avatar">🤖</div>
              <div class="message-content">
                <p>I'll help you implement user authentication. Let me create the necessary files and components.</p>

                <div class="tool-output">
                  <div class="tool-header">
                    <span class="tool-icon">📝</span>
                    <span class="tool-name">Write</span>
                    <span class="tool-file">src/auth/AuthService.js</span>
                  </div>
                  <div class="code-block">
                    <pre><code>export class AuthService {
  async login(email, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }

  async signup(email, password) {
    // Implementation...
  }
}</code></pre>
                  </div>
                </div>

                <p>I've created the authentication service. The class handles login, signup, and token management.</p>
              </div>
            </div>
          </div>

          <div class="mode-tabs">
            <button class="mode-tab active">Chat</button>
            <button class="mode-tab">Terminal</button>
            <button class="mode-tab">Files</button>
          </div>

          <div class="chat-input-container">
            <div class="chat-input">
              <div class="input-placeholder">Type your message...</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `, `
    .sidebar-content-minimal { padding: 20px; }
    .breadcrumb {
      font-size: 13px;
      color: #666;
      padding: 8px 12px;
      background: #1a1a1a;
      border-radius: 6px;
    }
    .chat-view { display: flex; flex-direction: column; height: 100vh; }
    .chat-header {
      padding: 16px 24px;
      border-bottom: 1px solid #2a2a2a;
    }
    .breadcrumb-path { font-size: 14px; color: #888; }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    .message {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }
    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .message-content {
      flex: 1;
      font-size: 14px;
      line-height: 1.6;
    }
    .message-content p { margin-bottom: 16px; }
    .tool-output {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      margin: 16px 0;
      overflow: hidden;
    }
    .tool-header {
      padding: 12px 16px;
      background: #151515;
      border-bottom: 1px solid #2a2a2a;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .tool-file { color: #666; }
    .code-block {
      padding: 16px;
      overflow-x: auto;
    }
    .code-block code {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
      line-height: 1.5;
      color: #d4d4d4;
    }
    .mode-tabs {
      display: flex;
      gap: 4px;
      padding: 8px 16px;
      border-top: 1px solid #2a2a2a;
      border-bottom: 1px solid #2a2a2a;
    }
    .mode-tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: #666;
      font-size: 13px;
      cursor: pointer;
    }
    .mode-tab.active {
      background: #2a2a2a;
      color: #e5e5e5;
    }
    .chat-input-container {
      padding: 16px 24px;
      border-top: 1px solid #2a2a2a;
    }
    .chat-input {
      padding: 12px 16px;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      min-height: 60px;
    }
    .input-placeholder { color: #666; font-size: 14px; }
  `);

  // 3. Terminal View
  await createScreenshot('terminal-view', `
    <div class="app sidebar-open">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <svg viewBox="0 0 100 100" width="32" height="32">
              <rect width="100" height="100" fill="#f59e0b" rx="20"/>
            </svg>
            <span>tofucode</span>
          </div>
        </div>
        <div class="sidebar-content-minimal">
          <div class="breadcrumb">web-app</div>
        </div>
      </aside>

      <main class="app-main">
        <div class="chat-view">
          <div class="chat-header">
            <div class="breadcrumb-path">web-app / Build and deploy</div>
          </div>

          <div class="terminal-content">
            <div class="terminal-header">
              <span>Terminal</span>
              <span class="active-indicator">● Active</span>
            </div>

            <div class="terminal-output">
              <div class="process-group">
                <div class="process-header">
                  <span class="process-command">$ npm run build</span>
                  <span class="process-status completed">✓ Completed</span>
                </div>
                <div class="output-lines">
                  <div class="output-line">vite v6.4.1 building for production...</div>
                  <div class="output-line">transforming...</div>
                  <div class="output-line success">✓ 149 modules transformed.</div>
                  <div class="output-line">rendering chunks...</div>
                  <div class="output-line">computing gzip size...</div>
                  <div class="output-line">dist/index.html                  1.00 kB │ gzip: 0.53 kB</div>
                  <div class="output-line">dist/assets/index.js           937.98 kB │ gzip: 264.73 kB</div>
                  <div class="output-line success">✓ built in 13.62s</div>
                </div>
              </div>

              <div class="process-group">
                <div class="process-header">
                  <span class="process-command">$ npm test</span>
                  <span class="process-status running">⏵ Running</span>
                </div>
                <div class="output-lines">
                  <div class="output-line">PASS  tests/auth.test.js</div>
                  <div class="output-line success">  ✓ should login with valid credentials (45ms)</div>
                  <div class="output-line success">  ✓ should reject invalid credentials (12ms)</div>
                  <div class="output-line">PASS  tests/api.test.js</div>
                  <div class="output-line success">  ✓ should fetch user data (23ms)</div>
                  <div class="output-line dim">  Running remaining tests...</div>
                </div>
              </div>
            </div>
          </div>

          <div class="mode-tabs">
            <button class="mode-tab">Chat</button>
            <button class="mode-tab active">Terminal <span class="badge">2</span></button>
            <button class="mode-tab">Files</button>
          </div>

          <div class="terminal-input-container">
            <div class="terminal-input-group">
              <span class="terminal-prompt">$</span>
              <input class="terminal-input" placeholder="Enter command..." />
            </div>
            <div class="terminal-cwd">/home/user/web-app</div>
          </div>
        </div>
      </main>
    </div>
  `, `
    .sidebar-content-minimal { padding: 20px; }
    .breadcrumb {
      font-size: 13px;
      color: #666;
      padding: 8px 12px;
      background: #1a1a1a;
      border-radius: 6px;
    }
    .chat-view { display: flex; flex-direction: column; height: 100vh; }
    .chat-header {
      padding: 16px 24px;
      border-bottom: 1px solid #2a2a2a;
    }
    .breadcrumb-path { font-size: 14px; color: #888; }
    .terminal-content { flex: 1; overflow-y: auto; padding: 24px; }
    .terminal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      font-size: 13px;
      font-weight: 600;
    }
    .active-indicator {
      color: #10b981;
      font-size: 12px;
    }
    .terminal-output { }
    .process-group {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .process-header {
      padding: 12px 16px;
      background: #151515;
      border-bottom: 1px solid #2a2a2a;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .process-command {
      font-family: 'SF Mono', Monaco, monospace;
      color: #e5e5e5;
    }
    .process-status {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .process-status.completed {
      background: #10b98120;
      color: #10b981;
    }
    .process-status.running {
      background: #3b82f620;
      color: #3b82f6;
    }
    .output-lines {
      padding: 12px 16px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    .output-line { color: #d4d4d4; }
    .output-line.success { color: #10b981; }
    .output-line.dim { color: #666; }
    .mode-tabs {
      display: flex;
      gap: 4px;
      padding: 8px 16px;
      border-top: 1px solid #2a2a2a;
      border-bottom: 1px solid #2a2a2a;
    }
    .mode-tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: #666;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mode-tab.active {
      background: #2a2a2a;
      color: #e5e5e5;
    }
    .badge {
      background: #f59e0b;
      color: #000;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
    }
    .terminal-input-container {
      padding: 16px 24px;
      border-top: 1px solid #2a2a2a;
    }
    .terminal-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .terminal-prompt {
      font-family: 'SF Mono', Monaco, monospace;
      color: #10b981;
      font-weight: 600;
    }
    .terminal-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #e5e5e5;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 14px;
    }
    .terminal-cwd {
      font-size: 12px;
      color: #666;
      padding-left: 16px;
    }
  `);

  // 4. Files View
  await createScreenshot('files-view', `
    <div class="app sidebar-open">
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <svg viewBox="0 0 100 100" width="32" height="32">
              <rect width="100" height="100" fill="#f59e0b" rx="20"/>
            </svg>
            <span>tofucode</span>
          </div>
        </div>
        <div class="sidebar-content-minimal">
          <div class="breadcrumb">web-app</div>
        </div>
      </aside>

      <main class="app-main">
        <div class="files-view">
          <div class="files-header">
            <div class="breadcrumb-path">web-app / src</div>
            <div class="files-actions">
              <button class="icon-btn">+ File</button>
              <button class="icon-btn">+ Folder</button>
            </div>
          </div>

          <div class="files-container">
            <div class="files-explorer">
              <div class="files-toolbar">
                <input class="files-search" placeholder="Search files..." />
              </div>

              <div class="files-tree">
                <div class="file-item folder open">
                  <span class="file-icon">📁</span>
                  <span class="file-name">src</span>
                </div>
                <div class="file-item folder indent-1 open">
                  <span class="file-icon">📁</span>
                  <span class="file-name">components</span>
                </div>
                <div class="file-item file indent-2 active">
                  <span class="file-icon">📄</span>
                  <span class="file-name">LoginForm.jsx</span>
                </div>
                <div class="file-item file indent-2">
                  <span class="file-icon">📄</span>
                  <span class="file-name">SignupForm.jsx</span>
                </div>
                <div class="file-item file indent-2">
                  <span class="file-icon">📄</span>
                  <span class="file-name">PasswordReset.jsx</span>
                </div>
                <div class="file-item folder indent-1">
                  <span class="file-icon">📁</span>
                  <span class="file-name">auth</span>
                </div>
                <div class="file-item folder indent-1">
                  <span class="file-icon">📁</span>
                  <span class="file-name">utils</span>
                </div>
                <div class="file-item file indent-1">
                  <span class="file-icon">📄</span>
                  <span class="file-name">App.jsx</span>
                </div>
                <div class="file-item file">
                  <span class="file-icon">📄</span>
                  <span class="file-name">package.json</span>
                </div>
                <div class="file-item file">
                  <span class="file-icon">📄</span>
                  <span class="file-name">README.md</span>
                </div>
              </div>
            </div>

            <div class="file-editor">
              <div class="editor-header">
                <span class="editor-filename">LoginForm.jsx</span>
                <span class="editor-stats">24 lines · 689 chars</span>
              </div>

              <div class="editor-content">
                <pre><code><span class="line-number">1</span>  <span class="keyword">import</span> React, { useState } from <span class="string">'react'</span>;
<span class="line-number">2</span>  <span class="keyword">import</span> { AuthService } from <span class="string">'../auth/AuthService'</span>;
<span class="line-number">3</span>
<span class="line-number">4</span>  <span class="keyword">export</span> <span class="keyword">function</span> <span class="function">LoginForm</span>() {
<span class="line-number">5</span>    <span class="keyword">const</span> [email, setEmail] = <span class="function">useState</span>(<span class="string">''</span>);
<span class="line-number">6</span>    <span class="keyword">const</span> [password, setPassword] = <span class="function">useState</span>(<span class="string">''</span>);
<span class="line-number">7</span>
<span class="line-number">8</span>    <span class="keyword">const</span> <span class="function">handleSubmit</span> = <span class="keyword">async</span> (e) => {
<span class="line-number">9</span>      e.<span class="function">preventDefault</span>();
<span class="line-number">10</span>      <span class="keyword">const</span> result = <span class="keyword">await</span> AuthService.<span class="function">login</span>(email, password);
<span class="line-number">11</span>      <span class="comment">// Handle result...</span>
<span class="line-number">12</span>    };
<span class="line-number">13</span>
<span class="line-number">14</span>    <span class="keyword">return</span> (
<span class="line-number">15</span>      <span class="tag">&lt;form</span> <span class="attr">onSubmit</span>={handleSubmit}<span class="tag">&gt;</span>
<span class="line-number">16</span>        <span class="tag">&lt;input</span> <span class="attr">type</span>=<span class="string">"email"</span> <span class="attr">value</span>={email} <span class="tag">/&gt;</span>
<span class="line-number">17</span>        <span class="tag">&lt;input</span> <span class="attr">type</span>=<span class="string">"password"</span> <span class="attr">value</span>={password} <span class="tag">/&gt;</span>
<span class="line-number">18</span>        <span class="tag">&lt;button</span> <span class="attr">type</span>=<span class="string">"submit"</span><span class="tag">&gt;</span>Login<span class="tag">&lt;/button&gt;</span>
<span class="line-number">19</span>      <span class="tag">&lt;/form&gt;</span>
<span class="line-number">20</span>    );
<span class="line-number">21</span>  }</code></pre>
              </div>
            </div>
          </div>

          <div class="mode-tabs">
            <button class="mode-tab">Chat</button>
            <button class="mode-tab">Terminal</button>
            <button class="mode-tab active">Files</button>
          </div>
        </div>
      </main>
    </div>
  `, `
    .sidebar-content-minimal { padding: 20px; }
    .breadcrumb {
      font-size: 13px;
      color: #666;
      padding: 8px 12px;
      background: #1a1a1a;
      border-radius: 6px;
    }
    .files-view { display: flex; flex-direction: column; height: 100vh; }
    .files-header {
      padding: 16px 24px;
      border-bottom: 1px solid #2a2a2a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .breadcrumb-path { font-size: 14px; color: #888; }
    .files-actions {
      display: flex;
      gap: 8px;
    }
    .icon-btn {
      padding: 6px 12px;
      background: #2a2a2a;
      border: 1px solid #3a3a3a;
      border-radius: 6px;
      color: #e5e5e5;
      font-size: 13px;
      cursor: pointer;
    }
    .files-container {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
    .files-explorer {
      width: 300px;
      border-right: 1px solid #2a2a2a;
      display: flex;
      flex-direction: column;
    }
    .files-toolbar {
      padding: 12px;
      border-bottom: 1px solid #2a2a2a;
    }
    .files-search {
      width: 100%;
      padding: 8px 12px;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      color: #e5e5e5;
      font-size: 13px;
      outline: none;
    }
    .files-tree {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .file-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      margin-bottom: 2px;
    }
    .file-item:hover {
      background: #1a1a1a;
    }
    .file-item.active {
      background: #2a2a2a;
      color: #e5e5e5;
    }
    .file-item.indent-1 { padding-left: 24px; }
    .file-item.indent-2 { padding-left: 40px; }
    .file-icon { font-size: 14px; flex-shrink: 0; }
    .file-name { flex: 1; }
    .file-editor {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .editor-header {
      padding: 12px 24px;
      border-bottom: 1px solid #2a2a2a;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #151515;
    }
    .editor-filename {
      font-size: 13px;
      font-weight: 600;
    }
    .editor-stats {
      font-size: 12px;
      color: #666;
    }
    .editor-content {
      flex: 1;
      overflow: auto;
      padding: 16px 24px;
      background: #0a0a0a;
    }
    .editor-content pre {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    .line-number {
      display: inline-block;
      width: 40px;
      color: #444;
      text-align: right;
      padding-right: 16px;
      user-select: none;
    }
    .keyword { color: #c792ea; }
    .string { color: #c3e88d; }
    .function { color: #82aaff; }
    .comment { color: #546e7a; }
    .tag { color: #f07178; }
    .attr { color: #c792ea; }
    .mode-tabs {
      display: flex;
      gap: 4px;
      padding: 8px 16px;
      border-top: 1px solid #2a2a2a;
    }
    .mode-tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: #666;
      font-size: 13px;
      cursor: pointer;
    }
    .mode-tab.active {
      background: #2a2a2a;
      color: #e5e5e5;
    }
  `);

  console.log('\n🎉 All screenshots created successfully!');
  console.log(`📁 Saved to: ${samplesDir}`);
}

main().catch(console.error);
