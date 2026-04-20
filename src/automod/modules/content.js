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

  // Emoji Limit
  const emojiRegex = /<a?:.+?:\d+>|[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2194-\u2199]/g;
  const emojiCount = (content.match(emojiRegex) || []).length;
  if (emojiCount > config.emojiLimit) {
    return 'Excessive Emojis';
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
