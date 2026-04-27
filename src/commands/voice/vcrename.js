const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_DOT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'vcrename',
  aliases: ['vr', 'rename'],
  description: 'Rename a voice channel',
  usage: 'vcrename <new name>',
  cooldown: 10,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const newName = args.join(' ');
      if (!newName) {
        return message.reply({ components: [cv2Error('Please specify a new name.')], flags: 32768 });
      }

      const channel = message.member.voice.channel;
      if (!channel) {
        return message.reply({ components: [cv2Error('You must be in a voice channel to rename it.')], flags: 32768 });
      }

      const oldName = channel.name;
      await channel.setName(newName);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 VC Renamed`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Voice channel renamed.**\n` +
          `${EMOJI_DOT} **Old:** \`${oldName}\`\n` +
          `${EMOJI_DOT} **New:** \`${newName}\`\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        ));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
