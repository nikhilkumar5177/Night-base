const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'reminder',
  aliases: ['remind', 'remindme'],
  description: 'Set a reminder',
  usage: 'reminder <time> <message>',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (args.length < 2) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}reminder <time> <message>\n\`\`\`` }, { name: '\u2501\u2501 Examples', value: `\`\`\`\n${client.config.prefix}reminder 10m check the server\n${client.config.prefix}reminder 2h review applications\n${client.config.prefix}reminder 1d weekly meeting\n\`\`\`` }, { name: 'Time Formats', value: '`s` `m` `h` `d`', inline: true }, { name: 'Max', value: '`7 days`', inline: true }, { name: 'Aliases', value: '`remind`, `remindme`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.reply({ embeds: [usageEmbed] });
      }
      const timeStr = args[0].toLowerCase();
      const timeMatch = timeStr.match(/^(\d+)(s|m|h|d)$/);
      if (!timeMatch) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Invalid Time').setDescription('Use format: `10m`, `2h`, `1d`').setTimestamp()] });
      }
      const amount = parseInt(timeMatch[1]);
      const unit = timeMatch[2];
      const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      const duration = amount * multipliers[unit];
      if (duration > 7 * 86400000) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Too Long').setDescription('Maximum reminder duration is 7 days.').setTimestamp()] });
      }
      const reminderMsg = args.slice(1).join(' ');
      const id = Date.now().toString(36);
      const triggerAt = Date.now() + duration;
      const reminders = storage.read('reminders.json');
      reminders.push({ id, userId: message.author.id, channelId: message.channel.id, message: reminderMsg, triggerAt, timestamp: Date.now() });
      storage.write('reminders.json', reminders);
      setTimeout(() => {
        const ch = client.channels.cache.get(message.channel.id);
        if (ch) {
          const remindEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('{EMOJI_INFO} Reminder')
            .setDescription(reminderMsg)
            .setTimestamp();
          ch.send({ content: `<@${message.author.id}>`, embeds: [remindEmbed] }).catch(() => { });
        }
        const current = storage.read('reminders.json');
        const updated = current.filter(r => r.id !== id);
        storage.write('reminders.json', updated);
      }, Math.min(duration, 2147483647));
      const embed = new EmbedBuilder()
        .setColor('#00e676')
        .setTitle('{EMOJI_SUCCESS} Reminder Set')
        .setDescription(`I will remind you in **${amount}${unit}**.`)
        .addFields({ name: 'Message', value: reminderMsg })
        .setTimestamp();
      const sent = await message.reply({ embeds: [embed] });
      setTimeout(() => { sent.delete().catch(() => { }); message.delete().catch(() => { }); }, 120000);
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
