const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { AttachmentBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('./storageManager');
const logger = require('./logger');
const { EMOJI_SUCCESS } = require('./constants');

/**
 * Creates a ZIP buffer containing the storage directory.
 * @returns {Promise<Buffer>}
 */
async function createBackupBuffer() {
  return new Promise((resolve, reject) => {
    const storagePath = path.join(__dirname, '..', '..', 'storage');
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => reject(err));
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));

    archive.directory(storagePath, false);
    archive.finalize();
  });
}

/**
 * Sends a database backup to the configured channel.
 * @param {import('discord.js').Client} client 
 */
async function sendBackup(client) {
  try {
    const channelId = client.config.backupChannelId;
    if (!channelId) {
      logger.warn('Backup system triggered, but no backupChannelId is configured.');
      return false;
    }

    let channel = client.channels.cache.get(channelId);
    if (!channel) {
      try {
        channel = await client.channels.fetch(channelId);
      } catch (err) {
        logger.error(`Backup channel ${channelId} could not be fetched: ${err.message}`);
        return false;
      }
    }

    if (!channel) return false;

    const buffer = await createBackupBuffer();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const attachment = new AttachmentBuilder(buffer, { name: `backup-${timestamp}.zip` });

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Database Backup`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${EMOJI_SUCCESS} Automated database backup completed successfully.\n\n` +
        `**Timestamp:** <t:${Math.floor(Date.now() / 1000)}:f>\n` +
        `**File Size:** \`${(buffer.length / 1024).toFixed(2)} KB\``
      ));

    await channel.send({ components: [container], files: [attachment], flags: 32768 });
    logger.info('Database backup sent successfully.');
    return true;
  } catch (error) {
    logger.error(`Failed to send database backup: ${error.message}`);
    return false;
  }
}

module.exports = { createBackupBuffer, sendBackup };
