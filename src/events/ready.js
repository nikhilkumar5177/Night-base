const logger = require('../utils/logger');
const storage = require('../utils/storageManager');
const { EMOJI_INFO } = require('../utils/constants');
const { runRotation } = require('../utils/vcJoiner');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

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

    const sendV2Reminder = (channel, userId, text) => {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Reminder`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} **Your reminder:**\n${text}`));
      channel.send({ content: `<@${userId}>`, components: [container], flags: 32768, allowedMentions: { users: [userId] } }).catch(() => {});
    };

    for (const reminder of reminders) {
      if (reminder.triggerAt <= now) {
        const channel = client.channels.cache.get(reminder.channelId);
        if (channel) sendV2Reminder(channel, reminder.userId, reminder.message);
      } else {
        pending.push(reminder);
        const delay = reminder.triggerAt - now;
        setTimeout(() => {
          const ch = client.channels.cache.get(reminder.channelId);
          if (ch) sendV2Reminder(ch, reminder.userId, reminder.message);
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

    const { sendBackup } = require('../utils/backupManager');
    setInterval(() => sendBackup(client), 3600000);

    setInterval(() => runRotation(client), 60000);
    try { runRotation(client); } catch (err) { logger.error(`Initial VC rotation failed: ${err.message}`); }
  }
};
