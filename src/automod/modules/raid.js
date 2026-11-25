const guildJoins = new Map();

/**
 * Handle raid detection (join velocity).
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

  const recentJoins = timestamps.filter(ts => now - ts < windowMs);
  guildJoins.set(guild.id, recentJoins);

  if (recentJoins.length > config.joinLimit) {
    // Raid detected!
    if (config.autoLockdown) {
      // Lockdown the server by denying SendMessages for @everyone
      const everyone = guild.roles.everyone;
      await everyone.setPermissions(everyone.permissions.remove('SendMessages'), 'AutoMod: Raid lockdown').catch(() => {});
      
      // Notify owner/logs
      const owner = await guild.fetchOwner().catch(() => null);
      if (owner) {
        await owner.send(`⚠️ **RAID DETECTED in ${guild.name}!** The server has been placed in lockdown.`).catch(() => {});
      }
    }
    return true;
  }

  return false;
}

module.exports = { checkRaid };
