const logger = require('../utils/logger');
const storage = require('../utils/storageManager');
const { EMOJI_INFO } = require('../utils/constants');
const { runRotation } = require('../utils/vcJoiner');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { sendBackup } = require('../utils/backupManager');

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
        activities: [{ name: 'System Maintenance', type: 0 }],
        status: 'dnd'
      });
    } else {
      client.user.setPresence({
        activities: [{ name: `${prefix}help`, type: 3 }],
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
