const userMessages = new Map();
const userLastMsg = new Map();

// Periodic cleanup to prevent memory leaks — evict stale entries
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of userMessages.entries()) {
    if (ts.length === 0 || now - ts[ts.length - 1] > 60000) {
      userMessages.delete(key);
    }
  }
  for (const [key, data] of userLastMsg.entries()) {
    if (now - data.ts > 60000) {
      userLastMsg.delete(key);
    }
  }
}, 120000); // Cleanup every 2 minutes (was 10 — tighter eviction)

/**
 * Handle message spam and duplicate detection.
 * Uses sliding window queue instead of .filter() for O(1) amortized perf.
 * @param {object} message 
 * @param {object} config 
 * @returns {string|boolean} Violation type or false
 */
function checkSpam(message, config) {
  if (!config.enabled) return false;

  const { author, guild, content } = message;
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

  // Rate Limit / Spam — Sliding window (shift expired, no filter/alloc)
  const windowMs = config.window * 1000;
  if (!userMessages.has(key)) userMessages.set(key, []);

  const timestamps = userMessages.get(key);
  timestamps.push(now);

  // Shift expired timestamps off the front (O(k) where k = expired count, amortized O(1))
  while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
    timestamps.shift();
  }

  if (timestamps.length > config.limit) {
    timestamps.length = 0; // Reset without new array allocation
    return 'Message Spam';
  }

  return false;
}

module.exports = { checkSpam };
