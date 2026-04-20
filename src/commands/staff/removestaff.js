const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_OWNER, EMOJI_WARN, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');

module.exports = {
  name: 'removestaff',
  aliases: ['staffremove', 'delstaff'],
  description: 'Remove a staff role',
  usage: 'removestaff <role>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ 
          embeds: [new EmbedBuilder()
            .setColor('#ff1744')
            .setTitle(`${EMOJI_OWNER} Owner Only`)
            .setDescription('Only the server owner can manage staff roles.')
            .setTimestamp()] 
        });
      }
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
      if (!role) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}removestaff <@role>\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}removestaff @Moderator\n\`\`\`` }, { name: 'Aliases', value: '`staffremove`, `delstaff`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.reply({ embeds: [usageEmbed] });
      }
      const staffData = storage.read('staff.json');
      if (!staffData.roles.includes(role.id)) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ffab00').setTitle(`${EMOJI_WARN} Not Staff`).setDescription(`${role.name} is not a staff role.`).setTimestamp()] });
      }
      staffData.roles = staffData.roles.filter(r => r !== role.id);
      storage.write('staff.json', staffData);
      message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle(`${EMOJI_SUCCESS} Staff Role Removed`).setDescription(`**${role.name}** has been removed from staff roles.`).setTimestamp()] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Error`).setDescription(error.message).setTimestamp()] });
    }
  }
};
