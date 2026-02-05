/**
 * Convert ANSI escape codes to HTML spans with CSS classes
 * Supports basic 16 colors, bright colors, and reset codes
 */

// ANSI color code to CSS class mapping
const ANSI_COLORS = {
  // Standard colors (30-37 foreground, 40-47 background)
  30: 'ansi-black',
  31: 'ansi-red',
  32: 'ansi-green',
  33: 'ansi-yellow',
  34: 'ansi-blue',
  35: 'ansi-magenta',
  36: 'ansi-cyan',
  37: 'ansi-white',
  // Bright colors (90-97 foreground, 100-107 background)
  90: 'ansi-bright-black',
  91: 'ansi-bright-red',
  92: 'ansi-bright-green',
  93: 'ansi-bright-yellow',
  94: 'ansi-bright-blue',
  95: 'ansi-bright-magenta',
  96: 'ansi-bright-cyan',
  97: 'ansi-bright-white',
};

const ANSI_BG_COLORS = {
  40: 'ansi-bg-black',
  41: 'ansi-bg-red',
  42: 'ansi-bg-green',
  43: 'ansi-bg-yellow',
  44: 'ansi-bg-blue',
  45: 'ansi-bg-magenta',
  46: 'ansi-bg-cyan',
  47: 'ansi-bg-white',
  100: 'ansi-bg-bright-black',
  101: 'ansi-bg-bright-red',
  102: 'ansi-bg-bright-green',
  103: 'ansi-bg-bright-yellow',
  104: 'ansi-bg-bright-blue',
  105: 'ansi-bg-bright-magenta',
  106: 'ansi-bg-bright-cyan',
  107: 'ansi-bg-bright-white',
};

// Escape HTML special characters
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parse ANSI escape codes and convert to HTML
 * @param {string} text - Text containing ANSI escape codes
 * @returns {string} HTML string with spans for colors
 */
export function ansiToHtml(text) {
  if (!text) return '';

  // Match ANSI escape sequences: ESC[ followed by numbers and 'm'
  // ESC can be \x1b, \u001b, or \033
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences require control characters
  const ansiRegex = /\x1b\[([0-9;]*)m/g;

  let result = '';
  let lastIndex = 0;
  let currentClasses = [];

  let match = ansiRegex.exec(text);
  while (match !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      const textBefore = escapeHtml(text.slice(lastIndex, match.index));
      if (currentClasses.length > 0) {
        result += `<span class="${currentClasses.join(' ')}">${textBefore}</span>`;
      } else {
        result += textBefore;
      }
    }

    // Parse the escape codes
    const codes = match[1].split(';').map((c) => Number.parseInt(c, 10) || 0);

    for (const code of codes) {
      if (code === 0) {
        // Reset all
        currentClasses = [];
      } else if (code === 1) {
        // Bold
        currentClasses = currentClasses.filter((c) => c !== 'ansi-bold');
        currentClasses.push('ansi-bold');
      } else if (code === 2) {
        // Dim
        currentClasses = currentClasses.filter((c) => c !== 'ansi-dim');
        currentClasses.push('ansi-dim');
      } else if (code === 3) {
        // Italic
        currentClasses = currentClasses.filter((c) => c !== 'ansi-italic');
        currentClasses.push('ansi-italic');
      } else if (code === 4) {
        // Underline
        currentClasses = currentClasses.filter((c) => c !== 'ansi-underline');
        currentClasses.push('ansi-underline');
      } else if (code === 22) {
        // Normal intensity (not bold, not dim)
        currentClasses = currentClasses.filter(
          (c) => c !== 'ansi-bold' && c !== 'ansi-dim',
        );
      } else if (code === 23) {
        // Not italic
        currentClasses = currentClasses.filter((c) => c !== 'ansi-italic');
      } else if (code === 24) {
        // Not underline
        currentClasses = currentClasses.filter((c) => c !== 'ansi-underline');
      } else if (code === 39) {
        // Default foreground
        currentClasses = currentClasses.filter(
          (c) =>
            !c.startsWith('ansi-') ||
            c.startsWith('ansi-bg-') ||
            ['ansi-bold', 'ansi-dim', 'ansi-italic', 'ansi-underline'].includes(
              c,
            ),
        );
      } else if (code === 49) {
        // Default background
        currentClasses = currentClasses.filter(
          (c) => !c.startsWith('ansi-bg-'),
        );
      } else if (ANSI_COLORS[code]) {
        // Remove any existing foreground color
        currentClasses = currentClasses.filter(
          (c) =>
            !ANSI_COLORS[
              Object.keys(ANSI_COLORS).find((k) => ANSI_COLORS[k] === c)
            ],
        );
        currentClasses.push(ANSI_COLORS[code]);
      } else if (ANSI_BG_COLORS[code]) {
        // Remove any existing background color
        currentClasses = currentClasses.filter(
          (c) => !c.startsWith('ansi-bg-'),
        );
        currentClasses.push(ANSI_BG_COLORS[code]);
      }
    }

    lastIndex = match.index + match[0].length;
    match = ansiRegex.exec(text);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remaining = escapeHtml(text.slice(lastIndex));
    if (currentClasses.length > 0) {
      result += `<span class="${currentClasses.join(' ')}">${remaining}</span>`;
    } else {
      result += remaining;
    }
  }

  return result;
}
