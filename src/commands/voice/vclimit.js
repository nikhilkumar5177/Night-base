const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vclimit',
  aliases: ['vclm'],
  description: 'Set member limit for a voice channel',
  usage: 'vclimit <number> [#channel]',
  cooldown: 5,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const limit = parseInt(args[0]);
      if (isNaN(limit) || limit < 0 || limit > 99) {
        return message.reply({ components: [cv2Error('Please specify a valid limit (0-99).')], flags: 32768 });
      }

      const channel = message.mentions.channels.first() || message.member.voice.channel;
      if (!channel || !channel.isVoiceBased()) {
        return message.reply({ components: [cv2Error('Please mention a voice channel or join one.')], flags: 32768 });
      }

      await channel.setUserLimit(limit);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 VC Limit`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Voice channel limit updated.**\n` +
          `${EMOJI_DOT} **Channel:** ${channel}\n` +
          `${EMOJI_DOT} **Limit:** \`${limit === 0 ? 'No Limit' : limit}\`\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
