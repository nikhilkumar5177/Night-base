const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vckick',
  aliases: ['vck'],
  description: 'Kick a user from a voice channel',
  usage: 'vckick <@user/id>',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  userPermissions: ['MoveMembers'],
  execute: async (client, message, args) => {
    try {
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ components: [cv2Error('Please specify a user to kick from VC.')], flags: 32768 });
      }
      if (!target.voice.channel) {
        return message.reply({ components: [cv2Error('That user is not in a voice channel.')], flags: 32768 });
      }

      const channel = target.voice.channel;
      await target.voice.disconnect(`Kicked from VC by ${message.author.tag}`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 VC Kick`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **User kicked from voice channel.**\n` +
          `${EMOJI_DOT} **User:** ${target.user.tag}\n` +
          `${EMOJI_DOT} **Channel:** ${channel.name}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
