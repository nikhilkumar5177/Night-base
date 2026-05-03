const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_INFO, FOOTER_TEXT } = require('../../utils/constants');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'reminder',
  aliases: ['remind', 'remindme'],
  description: 'Set a reminder',
  usage: 'reminder <time> <message>',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      if (args.length < 2) return sendUsage(message, module.exports);

      const timeStr = args[0].toLowerCase();
      const timeMatch = timeStr.match(/^(\d+)(s|m|h|d)$/);
      if (!timeMatch) return message.reply({ components: [cv2Error('Invalid time format. Use: `10m`, `2h`, `1d`')], flags: 32768 });

      const amount = parseInt(timeMatch[1]);
      const unit = timeMatch[2];
      const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      const duration = amount * multipliers[unit];
      
      if (duration > 7 * 86400000) return message.reply({ components: [cv2Error('Maximum reminder duration is 7 days.')], flags: 32768 });

      const reminderMsg = args.slice(1).join(' ');
      const id = Date.now().toString(36);
      const triggerAt = Date.now() + duration;

      const mentions = message.mentions.users.map(u => u.id);
      const allNotify = [...new Set([message.author.id, ...mentions])];

      const reminders = storage.read('reminders.json');
      reminders.push({ id, userId: message.author.id, mentions, channelId: message.channel.id, message: reminderMsg, triggerAt, timestamp: Date.now() });
      storage.write('reminders.json', reminders);

      setTimeout(async () => {
        const ch = client.channels.cache.get(message.channel.id) || await client.channels.fetch(message.channel.id).catch(() => null);
        if (ch) {
          const remindContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Reminder`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} **Reminder:**\n${reminderMsg}`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
          
          await ch.send({ 
            content: allNotify.map(id => `<@${id}>`).join(' '), 
            components: [remindContainer], 
            flags: 32768, 
            allowedMentions: { users: allNotify } 
          }).catch(() => {});

          // Send Raw DM to mentioned users (and author)
          for (const uid of allNotify) {
            const user = client.users.cache.get(uid) || await client.users.fetch(uid).catch(() => null);
            if (user) {
              await user.send(`**Reminder:** ${reminderMsg}`).catch(() => {});
            }
          }
        }
        const current = storage.read('reminders.json');
        storage.write('reminders.json', current.filter(r => r.id !== id));
      }, Math.min(duration, 2147483647));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Reminder Set`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} I will remind you in **${amount}${unit}**.\n\n**Message:** ${reminderMsg}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      const sent = await message.reply({ components: [container], flags: 32768 }).catch(() => {});
      const { safeDelete } = require('../../utils/messageHelper');
      setTimeout(() => { safeDelete(sent); safeDelete(message); }, 120000);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
