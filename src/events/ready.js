const logger = require('../utils/logger');
const storage = require('../utils/storageManager');
const { EMOJI_INFO } = require('../utils/constants');
const { runRotation } = require('../utils/vcJoiner');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActivityType } = require('discord.js');
const { sendBackup } = require('../utils/backupManager');

module.exports = {
  name: 'ready',
  once: true,
  execute: async (client) => {
    logger.info(`Wild Wolf online as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    // Dispatch queued database alerts (corrupted files)
    const alerts = storage.getCorruptedAlerts();
    if (alerts && alerts.length > 0) {
      const channelId = client.config.databaseAlertChannelId || client.config.backupChannelId || client.config.errorLogChannelId;
      if (channelId) {
        let channel = client.channels.cache.get(channelId);
        if (!channel) {
          try {
            channel = await client.channels.fetch(channelId);
          } catch (err) {
            logger.error(`Database Alert channel ${channelId} could not be fetched: ${err.message}`);
          }
        }
        if (channel) {
          const { AttachmentBuilder } = require('discord.js');
          const path = require('path');
          for (const alert of alerts) {
            try {
              const attachment = new AttachmentBuilder(alert.filePath, { name: path.basename(alert.filePath) });
              await channel.send({
                content: `🚨 **[CRITICAL DATABASE ALERT]** 🚨\n\n**Data Corruption Detected during startup/operation!**\n• **File Name:** \`${alert.file}\`\n• **Action Taken:** Reset to default to maintain uptime.\n• **Status:** The original corrupted data has been **successfully recovered and backed up**.\n\n📥 **How to restore your data:**\n1. Download the attached file \`${path.basename(alert.filePath)}\`.\n2. Open it in a text editor and fix any JSON syntax errors (e.g. missing brackets or commas).\n3. Rename the file back to \`${alert.file}\` and upload it back to your server's \`/storage\` folder.\n4. Restart the bot to load your restored database!`,
                files: [attachment]
              });
            } catch (sendErr) {
              logger.error(`Failed to send corrupted database alert for ${alert.file}: ${sendErr.message}`);
            }
          }
          storage.clearCorruptedAlerts();
        }
      }
    }

    let configData = storage.read('config.json');
    const prefix = configData.prefix || client.config.prefix;
    
    if (configData.maintenance) {
      client.user.setPresence({
        activities: [{ name: 'System Maintenance', type: ActivityType.Playing }],
        status: 'dnd'
      });
    } else {
      client.user.setPresence({
        activities: [{ name: `${prefix}help`, type: ActivityType.Watching }],
        status: 'online'
      });
    }

    const reminders = storage.read('reminders.json');
    const now = Date.now();
    const pending = [];

    const { triggerReminder } = require('../utils/messageHelper');
    
    for (const reminder of reminders) {
      if (reminder.triggerAt <= now) {
        triggerReminder(client, reminder);
      } else {
        pending.push(reminder);
        const delay = reminder.triggerAt - now;
        setTimeout(() => {
          triggerReminder(client, reminder);
          const current = storage.read('reminders.json');
          storage.write('reminders.json', current.filter(r => r.id !== reminder.id));
        }, Math.min(delay, 2147483647));
      }
    }

    storage.write('reminders.json', pending);

    setInterval(() => {
      storage.sweep('security.json', 'logs', 86400000);
      const cfg = storage.read('config.json');
      if (cfg.noPrefixUsers && Array.isArray(cfg.noPrefixUsers)) {
        const prev = cfg.noPrefixUsers.length;
        cfg.noPrefixUsers = cfg.noPrefixUsers.filter(u => {
          if (typeof u === 'string') return true;
          if (u.permanent) return true;
          if (u.expiresAt && Date.now() < u.expiresAt) return true;
          return false;
        });
        if (cfg.noPrefixUsers.length < prev) storage.write('config.json', cfg);
      }
    }, 300000);

    setInterval(() => {
      sendBackup(client).catch(err => logger.error(`Automated backup failed: ${err.message}`));
    }, 1800000);

    setInterval(() => runRotation(client), 60000);
    try { runRotation(client); } catch (err) { logger.error(`Initial VC rotation failed: ${err.message}`); }
  }
};
