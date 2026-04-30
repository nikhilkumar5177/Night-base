// Precompiled regex cache (per-guild, invalidated on config change)
const regexCache = new Map();

// Zalgo regex — compiled once, reused forever
const ZALGO_REGEX = /[\u0300-\u036f\u0483-\u0489\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;

/**
 * Get or build compiled regex arrays for a guild's content config.
 * @param {object} config
 * @returns {{ wholeWord: RegExp[], partialWords: string[] }}
 */
function getCompiledPatterns(config) {
  // Use a simple fingerprint to detect config changes
  const fingerprint = `${(config.blockedWords || []).join(',')}|${(config.partialBlockedWords || []).join(',')}`;
  
  if (regexCache.has(fingerprint)) return regexCache.get(fingerprint);

  const wholeWord = (config.blockedWords || []).map(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i');
  });

  const partialWords = (config.partialBlockedWords || []).map(w => w.toLowerCase());

  const compiled = { wholeWord, partialWords };
  regexCache.set(fingerprint, compiled);

  // Prevent unbounded cache growth
  if (regexCache.size > 500) {
    const first = regexCache.keys().next().value;
    regexCache.delete(first);
  }

  return compiled;
}

/**
 * Handle content filtering (blocked words, caps, lines, mentions, zalgo).
 * @param {object} message 
 * @param {object} config 
 * @returns {string|boolean} Violation type or false
 */
function checkContent(message, config) {
  if (!config.enabled) return false;

  const content = message.content;
  // Compute once, reuse everywhere
  const lower = content.toLowerCase();
  const len = content.length;

  // Blocked Words (Whole Word) — precompiled regex
  const { wholeWord, partialWords } = getCompiledPatterns(config);

  for (const regex of wholeWord) {
    if (regex.test(content)) return 'Blocked Word';
  }

  // Blocked Words (Partial/Substring) — precomputed lowercase
  for (const word of partialWords) {
    if (lower.includes(word)) return 'Blocked Word (Partial)';
  }

  // Caps Limit
  if (len > 10) {
    let capsCount = 0;
    for (let i = 0; i < len; i++) {
      const c = content.charCodeAt(i);
      if (c >= 65 && c <= 90) capsCount++;
    }
    if ((capsCount / len) * 100 > config.capsLimit) return 'Excessive Caps';
  }

  // Line Limit — count newlines without split (avoids array allocation)
  let lineCount = 1;
  for (let i = 0; i < len; i++) {
    if (content.charCodeAt(i) === 10) lineCount++;
  }
  if (lineCount > (config.lineLimit || 10)) return 'Excessive Lines';

  // Mass Mention
  if (message.mentions.users.size > 5 || message.mentions.roles.size > 5) {
    return 'Mass Mention';
  }

  // Zalgo Detection — reuse precompiled regex
  const zalgoMatches = content.match(ZALGO_REGEX);
  if (zalgoMatches && zalgoMatches.length > 30) return 'Zalgo/Glitch Text';

  return false;
}

module.exports = { checkContent };
