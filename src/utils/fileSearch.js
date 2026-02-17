/**
 * Check if query is a glob pattern
 * @param {string} query - Search query
 * @returns {boolean}
 */
export function isGlobPattern(query) {
  return query.includes('*') || query.includes('?');
}

/**
 * Convert glob pattern to regex
 * @param {string} pattern - Glob pattern (e.g., "*.md", "test*.js")
 * @returns {RegExp}
 */
export function globToRegex(pattern) {
  // Escape special regex characters except * and ?
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Check if a filename matches a search query (fuzzy or glob)
 * @param {string} filename - File/folder name to match against
 * @param {string} query - Search query (fuzzy string or glob pattern)
 * @returns {boolean}
 */
export function matchesSearch(filename, query) {
  if (!query) return true;

  const isGlob = isGlobPattern(query);

  if (isGlob) {
    // Glob pattern matching
    const regex = globToRegex(query);
    return regex.test(filename);
  }

  // Fuzzy match: check if all query chars appear in order
  const lowerFilename = filename.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;

  for (const char of lowerFilename) {
    if (char === lowerQuery[queryIndex]) {
      queryIndex++;
      if (queryIndex === lowerQuery.length) {
        return true;
      }
    }
  }

  return queryIndex === lowerQuery.length;
}
