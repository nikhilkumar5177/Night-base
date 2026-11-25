const userMessages = new Map();
const userRecentContent = new Map();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of userMessages.entries()) {
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 60000) {
      userMessages.delete(key);
    }
  }
  for (const [key, history] of userRecentContent.entries()) {
    if (history.length === 0 || now - history[history.length - 1].ts > 60000) {
      userRecentContent.delete(key);
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

  const windowMs = (config.window || 5) * 1000;
  const limit = config.limit || 5;

  // 1. Rate Limit / Message Flood Spam (e.g. 5 messages within 5-10s window)
  if (!userMessages.has(key)) userMessages.set(key, []);
  const timestamps = userMessages.get(key);
  timestamps.push(now);

  const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);
  userMessages.set(key, recentTimestamps);

  if (recentTimestamps.length >= limit) {
    return 'Message Spam';
  }

  // 2. Duplicate & Alternating Repetitive Spam Detection
  // Tracks recent messages in the window (e.g. 'w', 'ww', 'w', 'ww')
  if (config.duplicateDetection && content && content.trim().length > 0) {
    if (!userRecentContent.has(key)) userRecentContent.set(key, []);
    const history = userRecentContent.get(key);
    
    // Clean old history beyond 15 seconds
    const cleanHistory = history.filter(item => now - item.ts < 15000);
    
    // Check identical duplicates within recent history
    const exactMatches = cleanHistory.filter(item => item.content.toLowerCase().trim() === content.toLowerCase().trim());
    cleanHistory.push({ content, ts: now });
    userRecentContent.set(key, cleanHistory);

    // If the same exact content appeared 2 or more times within the recent window
    if (exactMatches.length >= 1) {
      return 'Duplicate Messages';
    }
  }

  return false;
}

module.exports = { checkSpam };
