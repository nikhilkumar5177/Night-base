const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_INFO } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'invoicerole',
  aliases: ['ivr', 'voicerole', 'invc'],
  description: 'Configure in-voice auto role',
  usage: 'invoicerole <set|remove|list> <role>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  premiumOnly: true,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ components: [cv2Error('You need **ManageRoles** permission.')], flags: 32768 });
      }
      const action = args[0]?.toLowerCase();
      const voiceData = storage.read('voiceroles.json');
      const guildId = message.guild.id;
      if (!voiceData[guildId]) voiceData[guildId] = [];

      if (action === 'list') {
        const roles = voiceData[guildId];
        if (roles.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf │ Voice Roles`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} No in-voice roles configured for this server.`));
          return message.reply({ components: [container], flags: 32768 });
        }
        const list = roles.map(roleId => {
          const role = message.guild.roles.cache.get(roleId);
          return role ? `${role}` : `\`${roleId}\` (deleted)`;
        }).join('\n');
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf │ Voice Roles`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'set') {
        const roleInput = args.slice(1).join(' ');
        if (!roleInput) return sendUsage(message, module.exports);

        const { resolveRole } = require('../../utils/resolver');
        const role = resolveRole(message.guild, roleInput);
        if (!role) return message.reply({ components: [cv2Error('Role not found.')], flags: 32768 });

        if (voiceData[guildId].includes(role.id)) {
          return message.reply({ components: [cv2Error('That role is already a voice role.')], flags: 32768 });
        }

        voiceData[guildId].push(role.id);
        storage.write('voiceroles.json', voiceData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf │ Voice Role Set`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **${role.name}** will be given when joining voice.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      if (action === 'remove') {
        const roleInput = args.slice(1).join(' ');
        if (!roleInput) return sendUsage(message, module.exports);

        const { resolveRole } = require('../../utils/resolver');
        const role = resolveRole(message.guild, roleInput);
        const roleId = role ? role.id : roleInput.replace(/[<@&>]/g, '');

        const index = voiceData[guildId].indexOf(roleId);
        if (index === -1) {
          return message.reply({ components: [cv2Error('That role is not configured as a voice role.')], flags: 32768 });
        }

        voiceData[guildId].splice(index, 1);
        storage.write('voiceroles.json', voiceData);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf │ Voice Role Removed`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} Voice role removed.`));
        return message.reply({ components: [container], flags: 32768 });
      }

      return sendUsage(message, module.exports);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
