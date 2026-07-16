const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_OWNER, EMOJI_SUCCESS } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'clearconsole',
  aliases: ['cc', 'clearcache', 'cls'],
  description: 'Clears the bot terminal console and resets internal memory caches',
  usage: 'clearconsole',
  cooldown: 0,
  enabled: true,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      console.clear();
      console.log(`[INFO] Console cleared by ${message.author.tag}`);

      if (client.cooldowns) client.cooldowns.clear();
      if (client._webhookTracker) client._webhookTracker.clear();
      message.channel.messages.cache.sweep(m => Date.now() - m.createdTimestamp > 3600000);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 System Manager`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_OWNER} ${EMOJI_SUCCESS} **System Cache & Console Cleared!**\n\n` +
          `\u25B8 Terminal console wiped clean.\n` +
          `\u25B8 Command cooldowns reset.\n` +
          `\u25B8 Stale message caches swept.`
        ));

      await message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 });
    }
  }
};
