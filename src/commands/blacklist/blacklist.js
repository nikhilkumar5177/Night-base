const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'blacklist',
  aliases: ['bl'],
  description: 'Add or remove a user from global blacklist',
  usage: 'blacklist <add|remove|list> [user]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('Administrator')) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Missing Permissions').setDescription('You need **Administrator** permission.').setTimestamp()] });
      }
      const action = args[0]?.toLowerCase();
      const blData = storage.read('blacklist.json');
      if (action === 'list') {
        if (blData.users.length === 0) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#0099ff').setTitle('{EMOJI_INFO} Blacklist').setDescription('No blacklisted users.').setTimestamp()] });
        }
        const list = blData.users.map((id, i) => {
          const user = client.users.cache.get(id);
          return `**${i + 1}.** ${user ? user.tag : id}`;
        }).join('\n');
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#0099ff').setTitle('{EMOJI_INFO} Blacklisted Users').setDescription(list).setTimestamp()] });
      }
      const target = message.mentions.users.first() || client.users.cache.get(args[1]);
      if (!target) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}blacklist <add|remove|list> [user]\n\`\`\`` }, { name: '\u2501\u2501 Examples', value: `\`\`\`\n${client.config.prefix}blacklist add @User\n${client.config.prefix}blacklist remove @User\n${client.config.prefix}blacklist list\n\`\`\`` }, { name: 'Aliases', value: '`bl`', inline: true }, { name: 'Permission', value: '`Administrator`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.channel.send({ embeds: [usageEmbed] });
      }
      if (action === 'add') {
        if (blData.users.includes(target.id)) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ffab00').setTitle('{EMOJI_WARN} Already Blacklisted').setTimestamp()] });
        }
        blData.users.push(target.id);
        storage.write('blacklist.json', blData);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} User Blacklisted').setDescription(`**${target.tag}** has been blacklisted.`).setTimestamp()] });
      }
      if (action === 'remove') {
        blData.users = blData.users.filter(id => id !== target.id);
        storage.write('blacklist.json', blData);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} User Removed').setDescription(`**${target.tag}** removed from blacklist.`).setTimestamp()] });
      }
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Invalid Action').setDescription('Use `add`, `remove`, or `list`.').setTimestamp()] });
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
