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
    const { createBackupBuffer } = require('../../utils/backupManager');
    const { AttachmentBuilder } = require('discord.js');
    
    try {
      const buffer = await createBackupBuffer();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const attachment = new AttachmentBuilder(buffer, { name: `backup-${timestamp}.zip` });
      
      await message.reply({ files: [attachment] });
      await sendBackup(client); // Still send to auto-backup channel as well
    } catch (err) {
      await message.reply({ content: `\u274C **Backup failed:** ${err.message}` });
    }
  }
};
