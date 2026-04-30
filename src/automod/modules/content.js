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
  const { blockedWords } = config;
  for (const word of blockedWords) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(content)) {
      return 'Blocked Word';
    }
  }

  // Blocked Words (Partial/Substring)
  const { partialBlockedWords } = config;
  if (partialBlockedWords && Array.isArray(partialBlockedWords)) {
    for (const word of partialBlockedWords) {
      if (lowerContent.includes(word.toLowerCase())) {
        return 'Blocked Word (Partial)';
      }
    }
  }

  // Caps Limit
  if (content.length > 10) {
    const capsCount = content.replace(/[^A-Z]/g, '').length;
    const capsPercentage = (capsCount / content.length) * 100;
    if (capsPercentage > config.capsLimit) {
      return 'Excessive Caps';
    }
  }

  // Line Limit
  const lineCount = content.split('\n').length;
  if (lineCount > (config.lineLimit || 10)) {
    return 'Excessive Lines';
  }

  // Mass Mention
  if (message.mentions.users.size > 5 || message.mentions.roles.size > 5) {
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
