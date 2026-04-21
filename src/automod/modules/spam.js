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
  if (config.duplicateDetection) {
    const lastMsg = userLastMsg.get(key);
    if (lastMsg && lastMsg.content === content && (now - lastMsg.ts < 5000)) {
      return 'Duplicate Messages';
    }
    userLastMsg.set(key, { content, ts: now });
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
    
    if (config.autoSlowmode && channel.rateLimitPerUser === 0) {
      await channel.setRateLimitPerUser(5, 'AutoMod: Spam spike').catch(() => {});
      setTimeout(() => channel.setRateLimitPerUser(0).catch(() => {}), 30000);
    }
    return 'Message Spam';
  }

  return false;
}

module.exports = { checkSpam };
