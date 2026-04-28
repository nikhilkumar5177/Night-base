const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_WARN, EMOJI_DOT } = require('../../utils/constants');
const storage = require('../../utils/storageManager');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'stafflist',
  aliases: ['staff', 'staffroles'],
  description: 'View all configured staff roles and their members',
  usage: 'stafflist',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const staffData = storage.read('staff.json');
      const guildData = staffData[message.guild.id];

      if (!guildData || !guildData.roles || guildData.roles.length === 0) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **No staff roles configured for this server.**\nUse \`${client.config.prefix}addstaff @Role\` to add one.`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      const cleaned = [];
      const sections = [];
      let totalStaff = 0;

      for (const roleId of guildData.roles) {
        const role = message.guild.roles.cache.get(roleId);
        if (!role) { cleaned.push(roleId); continue; }
        const members = role.members.map(m => m.user.tag);
        totalStaff += members.length;
        sections.push(`${EMOJI_DOT} ${role} \u2014 \`${members.length}\` members\n${members.length > 0 ? members.slice(0, 15).map(t => `   \u2502 \`${t}\``).join('\n') + (members.length > 15 ? `\n   \u2502 ... +${members.length - 15} more` : '') : '   \u2502 *No members*'}`);
      }

      if (cleaned.length > 0) {
        staffData[message.guild.id].roles = guildData.roles.filter(id => !cleaned.includes(id));
        storage.write('staff.json', staffData);
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Staff Dashboard`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **Staff Roles:** \`${staffData.roles.length}\`\n` +
          `${EMOJI_DOT} **Total Staff:** \`${totalStaff}\``
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(sections.join('\n\n')));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
