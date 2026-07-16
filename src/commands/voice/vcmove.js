const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcmove',
  aliases: ['vcmv', 'move'],
  description: 'Move a user to a specific voice channel',
  usage: 'vcmove <@user/id> <#channel/id>',
  cooldown: 3,
  enabled: true,
  devOnly: false,
  userPermissions: ['MoveMembers'],
  execute: async (client, message, args) => {
    try {
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ components: [cv2Error('Please specify a user to move.')], flags: 32768 });
      }
      if (!target.voice.channel) {
        return message.reply({ components: [cv2Error('That user is not in a voice channel.')], flags: 32768 });
      }

      const channelInput = args[1];
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(channelInput);
      if (!channel || !channel.isVoiceBased()) {
        return message.reply({ components: [cv2Error('Please specify a valid voice channel.')], flags: 32768 });
      }

      await target.voice.setChannel(channel, `Moved to ${channel.name} by ${message.author.tag}`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 VC Move`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **User moved to channel.**\n` +
          `${EMOJI_DOT} **User:** ${target.user.tag}\n` +
          `${EMOJI_DOT} **Target VC:** ${channel.name}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
