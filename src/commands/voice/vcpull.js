const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcpull',
  aliases: ['pull', 'drag'],
  description: 'Pull a user into your voice channel',
  usage: 'vcpull <@user/id>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ components: [cv2Error('Please specify a user to pull.')], flags: 32768 });
      }
      const moderatorChannel = message.member.voice.channel;
      if (!moderatorChannel) {
        return message.reply({ components: [cv2Error('You must be in a voice channel to pull someone.')], flags: 32768 });
      }
      if (!target.voice.channel) {
        return message.reply({ components: [cv2Error('That user is not in a voice channel.')], flags: 32768 });
      }
      if (target.voice.channel.id === moderatorChannel.id) {
        return message.reply({ components: [cv2Error('User is already in your voice channel.')], flags: 32768 });
      }

      await target.voice.setChannel(moderatorChannel, `Pulled into VC by ${message.author.tag}`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 VC Pull`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **User pulled into your channel.**\n` +
          `${EMOJI_DOT} **User:** ${target.user.tag}\n` +
          `${EMOJI_DOT} **Channel:** ${moderatorChannel.name}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
