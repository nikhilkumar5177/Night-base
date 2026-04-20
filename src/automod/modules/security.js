const actionTracker = new Map();

/**
 * Handle security checks (account age).
 * @param {object} message 
 * @param {object} config 
 * @returns {string|boolean} Violation type or false
 */
async function checkSecurity(message, config) {
  if (!config.enabled) return false;

  const { member } = message;
  const { minAccountAge } = config;

  if (minAccountAge > 0) {
    const createdAt = member.user.createdAt;
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < minAccountAge) {
      return 'New Account Protection';
    }
  }

  return false;
}

/**
 * Track rapid actions (anti-nuke).
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
  const recent = actions.filter(t => now - t < config.nukeWindow);
  actionTracker.set(key, recent);

  if (recent.length >= config.nukeThreshold) {
    actionTracker.delete(key);
    return true;
  }
  return false;
}

module.exports = { checkSecurity, trackNukeAction };
