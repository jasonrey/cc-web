/**
 * MCP Tool Display: playwright
 *
 * Browser automation tools via Playwright MCP server.
 */

export default {
  browser_navigate: (input) => ({
    icon: '🌐',
    primary: input.url || 'Navigate',
    secondary: null,
    type: 'url',
  }),

  browser_navigate_back: () => ({
    icon: '⬅️',
    primary: 'Go back',
    secondary: null,
    type: 'text',
  }),

  browser_click: (input) => ({
    icon: '👆',
    primary: input.element || 'Click element',
    secondary: input.ref ? `ref: ${input.ref}` : null,
    type: 'text',
  }),

  browser_type: (input, { truncate }) => ({
    icon: '⌨️',
    primary: truncate(input.text, 50) || 'Type text',
    secondary: input.element || null,
    type: 'text',
  }),

  browser_snapshot: () => ({
    icon: '📸',
    primary: 'Capture page snapshot',
    secondary: null,
    type: 'text',
  }),

  browser_take_screenshot: (input) => ({
    icon: '🖼️',
    primary: input.filename || 'Take screenshot',
    secondary: input.fullPage ? 'full page' : null,
    type: 'text',
  }),

  browser_hover: (input) => ({
    icon: '🎯',
    primary: input.element || 'Hover element',
    secondary: input.ref ? `ref: ${input.ref}` : null,
    type: 'text',
  }),

  browser_drag: (input) => ({
    icon: '↔️',
    primary: 'Drag and drop',
    secondary: input.startElement ? `from: ${input.startElement}` : null,
    type: 'text',
  }),

  browser_select_option: (input) => ({
    icon: '📋',
    primary: input.values?.join(', ') || 'Select option',
    secondary: input.element || null,
    type: 'text',
  }),

  browser_press_key: (input) => ({
    icon: '⌨️',
    primary: `Press: ${input.key || 'key'}`,
    secondary: null,
    type: 'text',
  }),

  browser_fill_form: (input) => ({
    icon: '📝',
    primary: `Fill ${input.fields?.length || 0} field(s)`,
    secondary: null,
    type: 'text',
  }),

  browser_file_upload: (input) => ({
    icon: '📤',
    primary: 'Upload file',
    secondary: input.paths?.[0] || null,
    type: 'text',
  }),

  browser_handle_dialog: (input) => ({
    icon: '💬',
    primary: input.accept ? 'Accept dialog' : 'Dismiss dialog',
    secondary: input.promptText || null,
    type: 'text',
  }),

  browser_evaluate: (input, { truncate }) => ({
    icon: '⚡',
    primary: 'Run JavaScript',
    secondary: input.function ? truncate(input.function, 40) : null,
    type: 'text',
  }),

  browser_run_code: (input, { truncate }) => ({
    icon: '🎭',
    primary: 'Run Playwright code',
    secondary: input.code ? truncate(input.code, 40) : null,
    type: 'text',
  }),

  browser_wait_for: (input) => ({
    icon: '⏳',
    primary: input.text
      ? `Wait for: "${input.text}"`
      : input.time
        ? `Wait ${input.time}s`
        : 'Wait',
    secondary: null,
    type: 'text',
  }),

  browser_tabs: (input) => ({
    icon: '📑',
    primary: `Tabs: ${input.action || 'list'}`,
    secondary: input.index !== undefined ? `tab ${input.index}` : null,
    type: 'text',
  }),

  browser_resize: (input) => ({
    icon: '📐',
    primary: `Resize: ${input.width}x${input.height}`,
    secondary: null,
    type: 'text',
  }),

  browser_close: () => ({
    icon: '❌',
    primary: 'Close browser',
    secondary: null,
    type: 'text',
  }),

  browser_install: () => ({
    icon: '📥',
    primary: 'Install browser',
    secondary: null,
    type: 'text',
  }),

  browser_console_messages: (input) => ({
    icon: '📜',
    primary: 'Get console messages',
    secondary: input.level || null,
    type: 'text',
  }),

  browser_network_requests: () => ({
    icon: '🌐',
    primary: 'Get network requests',
    secondary: null,
    type: 'text',
  }),
};
