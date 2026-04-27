const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_DOT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcinfo',
  aliases: ['vi'],
  description: 'Display information about a voice channel',
  usage: 'vcinfo [#channel]',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.member.voice.channel;

      if (!channel || !channel.isVoiceBased()) {
        return message.reply({ components: [cv2Error('Please mention a voice channel or join one.')], flags: 32768 });
      }

      const members = channel.members.map(m => m.user.tag).join(', ') || 'None';
      const isLocked = !channel.permissionsFor(message.guild.roles.everyone).has('Connect');
      const isHidden = !channel.permissionsFor(message.guild.roles.everyone).has('ViewChannel');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 VC Analytics`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **Name:** \`${channel.name}\`\n` +
          `${EMOJI_DOT} **ID:** \`${channel.id}\`\n` +
          `${EMOJI_DOT} **Bitrate:** \`${channel.bitrate / 1000}kbps\`\n` +
          `${EMOJI_DOT} **Limit:** \`${channel.userLimit === 0 ? 'No Limit' : channel.userLimit}\`\n` +
          `${EMOJI_DOT} **Status:** ${isHidden ? '\`Hidden\`' : '\`Visible\`'} \u2502 ${isLocked ? '\`Locked\`' : '\`Unlocked\`'}\n` +
          `${EMOJI_DOT} **Members:** \`${channel.members.size}\` \u2022 **Category:** ${channel.parent ? channel.parent.name : 'None'}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `\`\`\`\n${members.length > 1000 ? members.substring(0, 997) + '...' : members}\n\`\`\``
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
