const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_DOT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcdeafenall',
  aliases: ['da', 'deafenall'],
  description: 'Deafen everyone in the voice channel',
  usage: 'vcdeafenall',
  cooldown: 10,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  userPermissions: ['DeafenMembers'],
  execute: async (client, message, args) => {
    try {
      const channel = message.member.voice.channel;
      if (!channel) {
        return message.reply({ components: [cv2Error('You must be in a voice channel.')], flags: 32768 });
      }

      const members = channel.members.filter(m => !m.user.bot && m.id !== message.author.id);
      if (members.size === 0) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **No other members to deafen.**`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      for (const [, member] of members) {
        await member.voice.setDeaf(true, `Mass deafened by ${message.author.tag}`).catch(() => {});
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Mass Deafen`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Deafened ${members.size} members in the VC.**\n` +
          `${EMOJI_DOT} **Channel:** ${channel.name}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
