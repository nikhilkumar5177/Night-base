const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'addstaff',
  aliases: ['staffadd'],
  description: 'Add a staff role',
  usage: 'addstaff <role>',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Owner Only').setDescription('Only the server owner can manage staff roles.').setTimestamp()] });
      }
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
      if (!role) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}addstaff <@role>\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}addstaff @Moderator\n\`\`\`` }, { name: 'Aliases', value: '`staffadd`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.reply({ embeds: [usageEmbed] });
      }
      const staffData = storage.read('staff.json');
      if (staffData.roles.includes(role.id)) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ffab00').setTitle('{EMOJI_WARN} Already Staff').setDescription(`${role.name} is already a staff role.`).setTimestamp()] });
      }
      staffData.roles.push(role.id);
      storage.write('staff.json', staffData);
      message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Staff Role Added').setDescription(`**${role.name}** has been added as a staff role.`).setTimestamp()] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
