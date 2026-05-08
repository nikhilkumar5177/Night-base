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
    const loadContainer = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} ${EMOJI_LOADING} **Generating backup...**`));
    
    const reply = await message.reply({ components: [loadContainer], flags: 32768 }).catch(() => {});
    if (!reply) return;

    const success = await sendBackup(client);

    if (success) {
      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **Backup generated and sent to the backup channel.**`));
      await reply.edit({ components: [successContainer] }).catch(() => {});
    } else {
      await reply.edit({ components: [cv2Error('Failed to send backup. Check logs and ensure backupChannelId is configured.')] }).catch(() => {});
    }
  }
};
