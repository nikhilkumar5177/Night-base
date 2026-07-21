const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_INFO, FOOTER_TEXT, EMOJI_ARROW } = require('../../utils/constants');
const { sendUsage, cv2Error, safeDelete } = require('../../utils/messageHelper');

module.exports = {
  name: 'reminder',
  aliases: ['remind', 'remindme'],
  description: 'Set a reminder',
  usage: 'reminder <time> <message>',
  cooldown: 5,
  enabled: true,
  devOnly: false,
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
      const reminderData = { id, userId: message.author.id, mentions, channelId: message.channel.id, message: reminderMsg, triggerAt, timestamp: Date.now() };
      reminders.push(reminderData);
      storage.write('reminders.json', reminders);

      setTimeout(async () => {
        const { triggerReminder } = require('../../utils/messageHelper');
        await triggerReminder(client, reminderData);


        const current = storage.read('reminders.json');
        storage.write('reminders.json', current.filter(r => r.id !== id));
      }, Math.min(duration, 2147483647));

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Reminder Set`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} I will remind you in **${amount}${unit}**.\n\n**Message:** ${reminderMsg}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      const sent = await message.reply({ components: [container], flags: 32768 }).catch(() => { });
      setTimeout(() => { safeDelete(sent); safeDelete(message); }, 120000);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => { });
    }
  }
};
