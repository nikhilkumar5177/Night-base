const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_OWNER, EMOJI_SUCCESS, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'leaveserver',
  aliases: ['lv', 'leaveguild'],
  description: 'Make the bot leave a server by ID',
  usage: 'leaveserver <guildId>',
  cooldown: 0,
  enabled: true,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      const guildId = args[0];
      if (!guildId) return message.reply({ components: [cv2Error('Please provide a Guild ID.')], flags: 32768 });

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return message.reply({ components: [cv2Error('I am not in a server with that ID.')], flags: 32768 });

      const guildName = guild.name;
      await guild.leave();

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} System Action`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_OWNER} ${EMOJI_SUCCESS} **Successfully left the server.**\n\n` +
          `**Name:** \`${guildName}\` ${EMOJI_ARROW} **ID:** \`${guildId}\``
        ));

      await message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 });
    }
  }
};
