/**
 * Handle content filtering (blocked words, caps, emojis, mentions).
 * @param {object} message 
 * @param {object} config 
 * @returns {string|boolean} Violation type or false
 */
async function checkContent(message, config) {
  if (!config.enabled) return false;

  const content = message.content;
  const lowerContent = content.toLowerCase();

  // Blocked Words (Whole Word)
  const blockedWords = Array.isArray(config.blockedWords) ? config.blockedWords : [];
  for (const word of blockedWords) {
    if (!word || typeof word !== 'string') continue;
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(content)) {
      return 'Blocked Word';
    }
  }

  // Blocked Words (Partial/Substring)
  const partialBlockedWords = Array.isArray(config.partialBlockedWords) ? config.partialBlockedWords : [];
  for (const word of partialBlockedWords) {
    if (!word || typeof word !== 'string') continue;
    if (lowerContent.includes(word.toLowerCase())) {
      return 'Blocked Word (Partial)';
    }
  }

  // Clean content of links, mentions, and custom emojis before checking caps/length
  const strippedForCaps = content
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '') // Custom discord emojis
    .replace(/<@!?\d+>/g, '') // User mentions
    .replace(/<@&\d+>/g, '') // Role mentions
    .replace(/<#\d+>/g, '') // Channel mentions
    .trim();

  // Caps Lock / Excessive Caps Detection
  // Only evaluate alphabetic letters so spaces, digits, and punctuation don't distort percentage
  const alphaChars = strippedForCaps.replace(/[^a-zA-Z]/g, '');
  const capsLimit = config.capsLimit !== undefined ? config.capsLimit : 70;
  if (alphaChars.length >= 6) {
    const capsCount = alphaChars.replace(/[^A-Z]/g, '').length;
    const capsPercentage = (capsCount / alphaChars.length) * 100;
    if (capsPercentage >= capsLimit) {
      return 'Excessive Caps';
    }
  }

  // Emoji Limit
  const customEmojiCount = (content.match(/<a?:[a-zA-Z0-9_]+:\d+>/g) || []).length;
  const unicodeEmojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const unicodeEmojiCount = (content.match(unicodeEmojiRegex) || []).length;
  const totalEmojis = customEmojiCount + unicodeEmojiCount;
  if (config.emojiLimit && totalEmojis > config.emojiLimit) {
    return 'Excessive Emojis';
  }

  // Line Limit
  const lineCount = content.split('\n').length;
  if (lineCount > (config.lineLimit || 10)) {
    return 'Excessive Lines';
  }

  // Mass Mention
  if ((message.mentions?.users?.size || 0) > 5 || (message.mentions?.roles?.size || 0) > 5) {
    return 'Mass Mention';
  }

  // Zalgo Detection (Glitch Text)
  const zalgoRegex = /[\u0300-\u036f\u0483-\u0489\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
  const zalgoCount = (content.match(zalgoRegex) || []).length;
  if (zalgoCount > 30) { // Threshold for zalgo
    return 'Zalgo/Glitch Text';
  }

  return false;
}

module.exports = { checkContent };
