const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { resolveChannel } = require('../../utils/resolver');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'hide',
  aliases: ['hidechannel'],
  description: 'Hide a channel from @everyone',
  usage: 'hide [#channel]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return message.reply({ components: [cv2Error('You need **ManageChannels** permission.')], flags: 32768 });
      }
      const channel = resolveChannel(message.guild, args[0]) || message.channel;
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false }).catch(() => {});

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Channel Hidden`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Channel is now hidden from @everyone.**\n` +
          `${EMOJI_DOT} **Channel:** ${channel}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
