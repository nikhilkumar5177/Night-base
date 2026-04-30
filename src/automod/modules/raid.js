const guildJoins = new Map();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of guildJoins.entries()) {
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 120000) {
      guildJoins.delete(key);
    }
  }
}, 120000);

/**
 * Handle raid detection (join velocity).
 * Uses sliding window instead of .filter() for O(1) amortized perf.
 * @param {object} member 
 * @param {object} config 
 * @returns {boolean} True if raid detected
 */
async function checkRaid(member, config) {
  if (!config.enabled) return false;

  const { guild } = member;
  const now = Date.now();
  const windowMs = config.window * 1000;

  if (!guildJoins.has(guild.id)) {
    guildJoins.set(guild.id, []);
  }

  const timestamps = guildJoins.get(guild.id);
  timestamps.push(now);

  // Sliding window — shift expired timestamps off the front
  while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
    timestamps.shift();
  }

  if (timestamps.length > config.joinLimit) {
    timestamps.length = 0; // Reset without new array allocation

    if (config.autoLockdown) {
      const tasks = [];
      // Lockdown the server by denying SendMessages for @everyone
      const everyone = guild.roles.everyone;
      tasks.push(everyone.setPermissions(everyone.permissions.remove('SendMessages'), 'AutoMod: Raid lockdown').catch(() => {}));
      
      // Notify owner/logs
      tasks.push(
        guild.fetchOwner().then(owner => 
          owner.send(`⚠️ **RAID DETECTED in ${guild.name}!** The server has been placed in lockdown.`).catch(() => {})
        ).catch(() => {})
      );

      await Promise.allSettled(tasks);
    }
    return true;
  }

  return false;
}

module.exports = { checkRaid };
