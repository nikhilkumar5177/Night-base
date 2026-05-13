const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { AttachmentBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const logger = require('./logger');
const { EMOJI_SUCCESS, FOOTER_TEXT } = require('./constants');

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
    const sizeKB = (buffer.length / 1024).toFixed(2);
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const attachment = new AttachmentBuilder(buffer, { name: `backup-${fileTimestamp}.zip` });

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Database Backup`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **Automated database backup completed successfully.**`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `**Timestamp:** ${timestamp}\n` +
        `**File Size:** ${sizeKB} KB`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

    await channel.send({ 
      components: [container], 
      files: [attachment],
      flags: MessageFlags.IsComponentsV2
    });

    logger.info('Database backup sent successfully.');
    return true;
  } catch (error) {
    logger.error(`Failed to send database backup: ${error.message}`);
    return false;
  }
}

module.exports = { createBackupBuffer, sendBackup };
