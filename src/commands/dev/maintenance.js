const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActivityType } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_OWNER, EMOJI_WARN, EMOJI_SUCCESS } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'maintenance',
  aliases: ['mt'],
  description: 'Toggle bot maintenance mode (ignores non-owner commands)',
  usage: 'maintenance',
  cooldown: 0,
  enabled: true,
  devOnly: true,
  execute: async (client, message) => {
    try {
      const configData = storage.read('config.json');
      configData.maintenance = !configData.maintenance;
      storage.write('config.json', configData);

      const prefix = configData.prefix || client.config.prefix;

      if (configData.maintenance) {
        client.user.setPresence({
          activities: [{ name: 'System Maintenance', type: ActivityType.Playing }],
          status: 'dnd'
        });
        
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 System Manager`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_OWNER} **Maintenance Mode: ENABLED**\n\n` +
            `${EMOJI_WARN} The bot is now in maintenance mode.\n` +
            `\u25B8 All non-owner commands will be ignored.\n` +
            `\u25B8 Bot status set to **Do Not Disturb**.`
          ));
        
        await message.reply({ components: [container], flags: 32768 }).catch(() => {});
      } else {
        client.user.setPresence({
          activities: [{ name: `${prefix}help`, type: ActivityType.Watching }],
          status: 'online'
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 System Manager`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_OWNER} **Maintenance Mode: DISABLED**\n\n` +
            `${EMOJI_SUCCESS} The bot has resumed normal operation.\n` +
            `\u25B8 All commands are now available.\n` +
            `\u25B8 Bot status reset to **Online**.`
          ));

        await message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 });
    }
  }
};
