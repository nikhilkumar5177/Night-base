const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { sendBackup } = require('../../utils/backupManager');
const { EMOJI_OWNER, EMOJI_LOADING, EMOJI_SUCCESS } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'backup',
  description: 'Manually trigger a database backup',
  usage: 'backup',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  premiumOnly: false,
  execute: async (client, message) => {
    try {
      const success = await sendBackup(client);
      if (success) {
        await message.reply({ content: '\u2705 **Backup successfully generated and sent to the log channel.**' });
      } else {
        await message.reply({ content: '\u274C **Failed to send backup. Check if backupChannelId is configured.**' });
      }
    } catch (err) {
      await message.reply({ content: `\u274C **Backup failed:** ${err.message}` });
    }
  }
};
