const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcunhide',
  aliases: ['vuh'],
  description: 'Unhide a voice channel',
  usage: 'vcunhide [#channel]',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  premiumOnly: false,
  execute: async (client, message, args) => {
    try {
      const channel = message.mentions.channels.first() || message.member.voice.channel;
      if (!channel || !channel.isVoiceBased()) {
        return message.reply({ components: [cv2Error('Please mention a voice channel or join one.')], flags: 32768 });
      }

      await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null }).catch(() => {});

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 VC Unhidden`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Voice channel is now visible.**\n` +
          `${EMOJI_DOT} **Channel:** ${channel}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
