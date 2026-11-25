const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const storage = require('./storageManager');
const logger = require('./logger');
const { EMOJI_SUCCESS } = require('./constants');

/**
 * Creates an atomic database snapshot buffer of database.sqlite.
 * Uses SQLite's native VACUUM INTO to avoid file locking on active WAL files.
 * @returns {Promise<Buffer>}
 */
async function createDatabaseBackupBuffer() {
  const storagePath = path.join(__dirname, '..', '..', 'storage');
  const liveDbPath = path.join(storagePath, 'database.sqlite');

  if (!fs.existsSync(storagePath)) {
    logger.error(`Backup failed: Storage directory not found at ${storagePath}`);
    throw new Error('Storage directory not found');
  }

  // Ensure all pending transactions are flushed to disk
  await storage.flush();

  const db = storage.getDatabase();
  const tempDbName = `temp_snapshot_${Date.now()}.sqlite`;
  const tempDbPath = path.join(storagePath, tempDbName);

  if (db) {
    try {
      const q = String.fromCharCode(39);
      db.exec(`VACUUM INTO ${q}${tempDbPath.replace(/\\/g, '/')}${q};`);
      
      if (fs.existsSync(tempDbPath)) {
        const buffer = fs.readFileSync(tempDbPath);
        try { fs.unlinkSync(tempDbPath); } catch {}
        return buffer;
      }
    } catch (err) {
      logger.warn(`[Backup] VACUUM INTO failed (${err.message}), falling back to direct database read.`);
      if (fs.existsSync(tempDbPath)) {
        try { fs.unlinkSync(tempDbPath); } catch {}
      }
    }
  }

  // Fallback: Read live database.sqlite if exists
  if (fs.existsSync(liveDbPath)) {
    return fs.readFileSync(liveDbPath);
  }

  throw new Error('database.sqlite file not found in storage');
}

/**
 * Sends a standalone database backup to the configured channel.
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

    // Create standalone database buffer
    const buffer = await createDatabaseBackupBuffer();
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });

    const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const attachment = new AttachmentBuilder(buffer, { name: `database-${fileTimestamp}.sqlite` });

    // Send only the database.sqlite file with a clean notification
    await channel.send({ 
      content: `${EMOJI_SUCCESS} **Automated database backup completed.**\n**File:** \`database.sqlite\`\n**Timestamp:** ${timestamp}`,
      files: [attachment],
      flags: 0
    });

    logger.info(`Database backup (.sqlite) sent to channel ${channelId}.`);
    return true;
  } catch (error) {
    logger.error(`Failed to send database backup: ${error.message}`);
    return false;
  }
}

module.exports = { createDatabaseBackupBuffer, sendBackup };
