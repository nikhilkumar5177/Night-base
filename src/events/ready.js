const logger = require('../utils/logger');
const storage = require('../utils/storageManager');
const { EMOJI_INFO } = require('../utils/constants');
const { runRotation } = require('../utils/vcJoiner');

module.exports = {
  name: 'ready',
  once: true,
  execute: (client) => {
    logger.info(`Wild Wolf online as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    let configData = storage.read('config.json');
    const prefix = configData.prefix || client.config.prefix;
    
    if (configData.maintenance) {
      client.user.setPresence({
        activities: [{ name: 'System Maintenance', type: 0 }], // Playing
        status: 'dnd'
      });
    } else {
      client.user.setPresence({
        activities: [{ name: `${prefix}help`, type: 3 }], // Watching
        status: 'online'
      });
    }

    const reminders = storage.read('reminders.json');
    const now = Date.now();
    const pending = [];

    for (const reminder of reminders) {
      if (reminder.triggerAt <= now) {
        const channel = client.channels.cache.get(reminder.channelId);
        if (channel) {
          const { EmbedBuilder } = require('discord.js');
          const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${EMOJI_INFO} Reminder`)
            .setDescription(reminder.message)
            .addFields({ name: 'Set by', value: `<@${reminder.userId}>` })
            .setTimestamp();
          channel.send({ content: `<@${reminder.userId}>`, embeds: [embed] }).catch(() => {});
        }
      } else {
        pending.push(reminder);
        const delay = reminder.triggerAt - now;
        setTimeout(() => {
          const ch = client.channels.cache.get(reminder.channelId);
          if (ch) {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle(`${EMOJI_INFO} Reminder`)
              .setDescription(reminder.message)
              .addFields({ name: 'Set by', value: `<@${reminder.userId}>` })
              .setTimestamp();
            ch.send({ content: `<@${reminder.userId}>`, embeds: [embed] }).catch(() => {});
          }
          const current = storage.read('reminders.json');
          const updated = current.filter(r => r.id !== reminder.id);
          storage.write('reminders.json', updated);
        }, Math.min(delay, 2147483647));
      }
    }

    storage.write('reminders.json', pending);

    configData = storage.read('config.json');
    if (configData.noPrefixUsers && Array.isArray(configData.noPrefixUsers)) {
      const before = configData.noPrefixUsers.length;
      configData.noPrefixUsers = configData.noPrefixUsers.filter(u => {
        if (typeof u === 'string') return true;
        if (u.permanent) return true;
        if (u.expiresAt && Date.now() < u.expiresAt) return true;
        return false;
      });
      if (configData.noPrefixUsers.length < before) {
        logger.info(`Cleaned ${before - configData.noPrefixUsers.length} expired no-prefix entries`);
        storage.write('config.json', configData);
      }
    }

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
        if (cfg.noPrefixUsers.length < prev) {
          storage.write('config.json', cfg);
        }
      }
    }, 300000);

    const { sendBackup } = require('../utils/backupManager');
    // Hourly database backup (3600000 ms)
    setInterval(() => {
      sendBackup(client);
    }, 3600000);

    // VC Joiner Rotation (runs every 1 minute to check for 10m intervals/disconnections)
    setInterval(() => {
      runRotation(client);
    }, 60000);

    // Initial run
    try {
      runRotation(client);
    } catch (err) {
      logger.error(`Initial VC rotation failed: ${err.message}`);
    }
  }
};
