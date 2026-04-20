const storage = require('../utils/storageManager');
const logger = require('../utils/logger');
const { getConfig } = require('../automod/database');
const { checkRaid } = require('../automod/modules/raid');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  execute: async (client, member) => {
    // Run Raid Protection
    const config = await getConfig(member.guild.id);
    if (config.enabled && config.modules.raid.enabled) {
      await checkRaid(member, config.modules.raid);
    }

    try {
      const autoroleData = storage.read('autorole.json');
      const guildConfig = autoroleData[member.guild.id];
      if (!guildConfig || guildConfig.enabled === false) return;

      const isBot = member.user.bot;
      const roleIds = isBot ? (guildConfig.botRoles || []) : (guildConfig.humanRoles || []);
      if (roleIds.length === 0) return;

      const validRoles = [];
      const invalidRoles = [];
      const botHighest = member.guild.members.me.roles.highest.position;

      for (const roleId of roleIds) {
        const role = member.guild.roles.cache.get(roleId);
        if (!role) {
          invalidRoles.push(roleId);
          continue;
        }
        if (role.position >= botHighest) continue;
        if (role.managed) continue;
        validRoles.push(role);
      }

      if (invalidRoles.length > 0) {
        if (isBot) {
          guildConfig.botRoles = guildConfig.botRoles.filter(r => !invalidRoles.includes(r));
        } else {
          guildConfig.humanRoles = guildConfig.humanRoles.filter(r => !invalidRoles.includes(r));
        }
        storage.write('autorole.json', autoroleData);
      }

      if (validRoles.length === 0) return;

      try {
        await member.roles.add(validRoles, `Auto-role: ${isBot ? 'Bot' : 'Human'} join`);
        logger.info(`Autorole: Assigned ${validRoles.length} roles to ${member.user.tag} (${isBot ? 'Bot' : 'Human'})`);
      } catch (err) {
        for (const role of validRoles) {
          try {
            await member.roles.add(role, `Auto-role: ${isBot ? 'Bot' : 'Human'} join`);
          } catch {}
        }
      }
    } catch {}
  }
};
