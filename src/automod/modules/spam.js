const userMessages = new Map();
const userLastMsg = new Map();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of userMessages.entries()) {
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 60000) {
      userMessages.delete(key);
    }
  }
  for (const [key, data] of userLastMsg.entries()) {
    if (now - data.ts > 60000) {
      userLastMsg.delete(key);
    }
  }
}, 600000); // Cleanup every 10 minutes

/**
 * Handle message spam and duplicate detection.
 * @param {object} message 
 * @param {object} config 
 * @returns {string|boolean} Violation type or false
 */
async function checkSpam(message, config) {
  if (!config.enabled) return false;

  const { author, guild, channel, content } = message;
  const key = `${guild.id}-${author.id}`;
  const now = Date.now();

  // Duplicate Detection
  if (config.duplicateDetection && content && content.trim().length > 0) {
    const lastMsg = userLastMsg.get(key);
    // Trigger if same message sent within 10 seconds or duplicate count >= 2
    if (lastMsg && lastMsg.content === content && (now - lastMsg.ts < 10000)) {
      lastMsg.count = (lastMsg.count || 1) + 1;
      lastMsg.ts = now;
      if (lastMsg.count >= (config.duplicateLimit || 2)) {
        return 'Duplicate Messages';
      }
    } else {
      userLastMsg.set(key, { content, ts: now, count: 1 });
    }
  }

  // Rate Limit / Spam
  const windowMs = config.window * 1000;
  if (!userMessages.has(key)) userMessages.set(key, []);

  const timestamps = userMessages.get(key);
  timestamps.push(now);

  const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);
  userMessages.set(key, recentTimestamps);

  if (recentTimestamps.length > config.limit) {
    userMessages.set(key, []);
    return 'Message Spam';
  }

  return false;
}

module.exports = { checkSpam };
