const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');
const { AttachmentBuilder, MessageFlags } = require('discord.js');
const storage = require('./storageManager');
const logger = require('./logger');
const { EMOJI_SUCCESS } = require('./constants');

/**
 * Creates a ZIP buffer containing the storage directory.
 * Safely snapshots the SQLite database using SQLite's native VACUUM INTO
 * to avoid reading locked/in-flight WAL files directly.
 * @returns {Promise<Buffer>}
 */
async function createBackupBuffer() {
  const storagePath = path.join(__dirname, '..', '..', 'storage');
  
  if (!fs.existsSync(storagePath)) {
    logger.error(`Backup failed: Storage directory not found at ${storagePath}`);
    throw new Error('Storage directory not found');
  }

  // Ensure all pending changes are flushed
  await storage.flush();

  const db = storage.getDatabase();
  const tempDbName = `temp_snapshot_${Date.now()}.sqlite`;
  const tempDbPath = path.join(storagePath, tempDbName);

  let useVacuumSnapshot = false;
  if (db) {
    try {
      const q = String.fromCharCode(39);
      // Native SQLite atomic snapshot without file locking
      db.exec(`VACUUM INTO ${q}${tempDbPath.replace(/\\/g, '/')}${q};`);
      useVacuumSnapshot = true;
    } catch (vacuumErr) {
      logger.warn(`[Backup] VACUUM INTO failed (${vacuumErr.message}), falling back to direct copy.`);
    }
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.on('error', (err) => {
      logger.error(`Archiver error: ${err.message}`);
      if (useVacuumSnapshot && fs.existsSync(tempDbPath)) {
        try { fs.unlinkSync(tempDbPath); } catch {}
      }
      reject(err);
    });

    archive.on('data', (chunk) => chunks.push(chunk));
    
    archive.on('end', () => {
      // Clean up temporary snapshot
      if (useVacuumSnapshot && fs.existsSync(tempDbPath)) {
        try { fs.unlinkSync(tempDbPath); } catch {}
      }

      const buffer = Buffer.concat(chunks);
      logger.info(`Backup ZIP created. Size: ${buffer.length} bytes.`);
      if (buffer.length === 0) {
        reject(new Error('Backup ZIP is empty'));
      } else {
        resolve(buffer);
      }
    });

    // If atomic snapshot exists, add it as database.sqlite in zip, and skip the live locked database.sqlite
    if (useVacuumSnapshot && fs.existsSync(tempDbPath)) {
      archive.file(tempDbPath, { name: 'database.sqlite' });
      
      // Add other non-sqlite files from storage/
      const entries = fs.readdirSync(storagePath);
      for (const entry of entries) {
        if (entry.startsWith('database.sqlite') || entry === tempDbName) continue;
        const fullEntryPath = path.join(storagePath, entry);
        const stat = fs.statSync(fullEntryPath);
        if (stat.isFile()) {
          archive.file(fullEntryPath, { name: entry });
        } else if (stat.isDirectory()) {
          archive.directory(fullEntryPath, entry);
        }
      }
    } else {
      archive.directory(storagePath, false);
    }

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

    // Create the ZIP buffer
    const buffer = await createBackupBuffer();
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });

    const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const attachment = new AttachmentBuilder(buffer, { name: `backup-${fileTimestamp}.zip` });

    // Send only the file with a simple text notification
    // Explicitly set flags: 0 to bypass any V2 Component defaults
    await channel.send({ 
      content: `${EMOJI_SUCCESS} **Automated database backup completed.**\n**Timestamp:** ${timestamp}`,
      files: [attachment],
      flags: 0
    });

    logger.info(`Database backup sent to channel ${channelId}.`);
    return true;
  } catch (error) {
    logger.error(`Failed to send database backup: ${error.message}`);
    return false;
  }
}

module.exports = { createBackupBuffer, sendBackup };
