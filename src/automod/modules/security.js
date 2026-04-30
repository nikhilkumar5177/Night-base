const actionTracker = new Map();

// Periodic cleanup for anti-nuke tracker
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of actionTracker.entries()) {
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 60000) {
      actionTracker.delete(key);
    }
  }
}, 120000);

/**
 * Handle security checks (account age).
 * Synchronous — no async needed.
 * @param {object} message 
 * @param {object} config 
 * @returns {string|boolean} Violation type or false
 */
function checkSecurity(message, config) {
  if (!config.enabled) return false;

  const { member } = message;
  const { minAccountAge } = config;

  if (minAccountAge > 0) {
    const ageInDays = (Date.now() - member.user.createdTimestamp) / 86400000;
    if (ageInDays < minAccountAge) {
      return 'New Account Protection';
    }
  }

  return false;
}

/**
 * Track rapid actions (anti-nuke) — uses sliding window.
 * @param {string} guildId 
 * @param {string} actionType 
 * @param {object} config 
 * @returns {boolean} True if threshold exceeded
 */
function trackNukeAction(guildId, actionType, config) {
  if (!config.enabled || !config.antiNuke) return false;

  const now = Date.now();
  const key = `${guildId}-${actionType}`;
  if (!actionTracker.has(key)) actionTracker.set(key, []);

  const actions = actionTracker.get(key);
  actions.push(now);

  // Sliding window eviction
  while (actions.length > 0 && actions[0] < now - config.nukeWindow) {
    actions.shift();
  }

  if (actions.length >= config.nukeThreshold) {
    actions.length = 0;
    return true;
  }
  return false;
}

module.exports = { checkSecurity, trackNukeAction };
