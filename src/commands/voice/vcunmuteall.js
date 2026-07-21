const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcunmuteall',
  aliases: ['uma', 'unmuteall'],
  description: 'Unmute everyone in the voice channel',
  usage: 'vcunmuteall',
  cooldown: 10,
  enabled: true,
  devOnly: false,
  userPermissions: ['MuteMembers'],
  execute: async (client, message, args) => {
    try {
      const channel = message.member.voice.channel;
      if (!channel) {
        return message.reply({ components: [cv2Error('You must be in a voice channel.')], flags: 32768 });
      }

      const members = channel.members.filter(m => !m.user.bot && m.voice.serverMute);
      if (members.size === 0) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **No members to unmute.**`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      for (const [, member] of members) {
        await member.voice.setMute(false, `Mass unmuted by ${message.author.tag}`).catch(() => {});
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Mass Unmute`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Unmuted ${members.size} members in the VC.**\n` +
          `${EMOJI_DOT} **Channel:** ${channel.name}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
