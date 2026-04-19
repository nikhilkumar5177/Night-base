const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'cmdblacklist',
  aliases: ['cbl', 'channelblock'],
  description: 'Block commands in a channel',
  usage: 'cmdblacklist <add|remove|list> [channel] [command]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Missing Permissions').setDescription('You need **ManageChannels** permission.').setTimestamp()] });
      }
      const action = args[0]?.toLowerCase();
      const cblData = storage.read('cmdBlacklist.json');
      if (action === 'list') {
        const entries = Object.entries(cblData);
        if (entries.length === 0) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#0099ff').setTitle('{EMOJI_INFO} Command Blacklist').setDescription('No channel command blacklists.').setTimestamp()] });
        }
        const list = entries.map(([chId, cmds]) => `<#${chId}>: ${cmds.join(', ')}`).join('\n');
        return message.reply({ embeds: [new EmbedBuilder().setColor('#0099ff').setTitle('{EMOJI_INFO} Command Blacklists').setDescription(list).setTimestamp()] });
      }
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
      const cmdName = args[2] || args[1];
      if (!cmdName || !client.commands.has(cmdName)) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}cmdblacklist <add|remove|list> [#channel] <command>\n\`\`\`` }, { name: '\u2501\u2501 Examples', value: `\`\`\`\n${client.config.prefix}cmdblacklist add #general warn\n${client.config.prefix}cmdblacklist remove #general warn\n${client.config.prefix}cmdblacklist list\n\`\`\`` }, { name: 'Aliases', value: '`cbl`, `channelblock`', inline: true }, { name: 'Permission', value: '`ManageChannels`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.reply({ embeds: [usageEmbed] });
      }
      if (action === 'add') {
        if (!cblData[channel.id]) cblData[channel.id] = [];
        if (cblData[channel.id].includes(cmdName)) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#ffab00').setTitle('{EMOJI_WARN} Already Blocked').setTimestamp()] });
        }
        cblData[channel.id].push(cmdName);
        storage.write('cmdBlacklist.json', cblData);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Command Blocked').setDescription(`\`${cmdName}\` blocked in ${channel}.`).setTimestamp()] });
      }
      if (action === 'remove') {
        if (!cblData[channel.id]) return message.reply({ embeds: [new EmbedBuilder().setColor('#ffab00').setTitle('{EMOJI_WARN} Not Found').setTimestamp()] });
        cblData[channel.id] = cblData[channel.id].filter(c => c !== cmdName);
        if (cblData[channel.id].length === 0) delete cblData[channel.id];
        storage.write('cmdBlacklist.json', cblData);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Command Unblocked').setDescription(`\`${cmdName}\` unblocked in ${channel}.`).setTimestamp()] });
      }
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
