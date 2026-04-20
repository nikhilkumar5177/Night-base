const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');
const { SEP } = require('../../utils/constants');

module.exports = {
  name: 'maintenance',
  aliases: ['mt'],
  description: 'Toggle bot maintenance mode (ignores non-owner commands)',
  usage: 'maintenance',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message) => {
    try {
      const configData = storage.read('config.json');
      configData.maintenance = !configData.maintenance;
      storage.write('config.json', configData);

      if (configData.maintenance) {
        client.user.setPresence({
          activities: [{ name: 'System Maintenance', type: 0 }],
          status: 'dnd'
        });
        
        const embed = new EmbedBuilder()
          .setColor('#ffab00')
          .setAuthor({ name: 'Wild Wolf \u2502 System Manager', iconURL: client.user.displayAvatarURL() })
          .setTitle('{EMOJI_OWNER} Maintenance Mode: ENABLED')
          .setDescription(`${SEP}\n{EMOJI_WARN} **The bot is now in maintenance mode.**\n\n\u25AA All non-owner commands will be ignored.\n\u25AA Bot status has been set to **Do Not Disturb**.\n\u25AA Maintenance activity is now active.\n${SEP}`)
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
      } else {
        client.user.setPresence({
          activities: [{ name: `${client.config.prefix}help`, type: 3 }],
          status: 'online'
        });

        const embed = new EmbedBuilder()
          .setColor('#00e676')
          .setAuthor({ name: 'Wild Wolf \u2502 System Manager', iconURL: client.user.displayAvatarURL() })
          .setTitle('{EMOJI_OWNER} Maintenance Mode: DISABLED')
          .setDescription(`${SEP}\n{EMOJI_SUCCESS} **The bot has resumed normal operation.**\n\n\u25AA All commands are now available to users.\n\u25AA Bot status has been reset to **Online**.\n${SEP}`)
          .setTimestamp();

        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      message.reply({ 
        embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`)] 
      });
    }
  }
};
