const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'liststaff',
  aliases: ['stafflist', 'staff'],
  description: 'List all staff roles',
  usage: 'liststaff',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const staffData = storage.read('staff.json');
      if (!staffData.roles || staffData.roles.length === 0) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ffab00').setTitle('{EMOJI_WARN} No Staff Roles').setDescription('No staff roles configured.').setTimestamp()] });
      }
      const roleList = staffData.roles.map((id, i) => {
        const role = message.guild.roles.cache.get(id);
        return `**${i + 1}.** ${role ? role.name : `Unknown (${id})`}`;
      }).join('\n');
      message.reply({ embeds: [new EmbedBuilder().setColor(client.config.embedColor || '#0099ff').setTitle('{EMOJI_INFO} Staff Roles').setDescription(roleList).setTimestamp()] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
