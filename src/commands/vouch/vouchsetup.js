const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'vouchsetup',
  aliases: ['vouch', 'vouchchannel'],
  description: 'Configure vouch channels',
  usage: 'vouchsetup <add|remove|list> [channel]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Missing Permissions').setDescription('You need **ManageChannels** permission.').setTimestamp()] });
      }
      const action = args[0]?.toLowerCase();
      const vouchData = storage.read('vouch.json');
      if (action === 'list') {
        if (!vouchData.channels || vouchData.channels.length === 0) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#0099ff').setTitle('{EMOJI_INFO} Vouch Channels').setDescription('No vouch channels configured.').setTimestamp()] });
        }
        const list = vouchData.channels.map((id, i) => `**${i + 1}.** <#${id}>`).join('\n');
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#0099ff').setTitle('{EMOJI_INFO} Vouch Channels').setDescription(list).setTimestamp()] });
      }
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
      if (action === 'add') {
        if (vouchData.channels.includes(channel.id)) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ffab00').setTitle('{EMOJI_WARN} Already Added').setTimestamp()] });
        }
        vouchData.channels.push(channel.id);
        storage.write('vouch.json', vouchData);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Vouch Channel Added').setDescription(`${channel} is now a vouch channel.`).setTimestamp()] });
      }
      if (action === 'remove') {
        vouchData.channels = vouchData.channels.filter(id => id !== channel.id);
        storage.write('vouch.json', vouchData);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Vouch Channel Removed').setTimestamp()] });
      }
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Invalid Action').setDescription('Use `add`, `remove`, or `list`.').setTimestamp()] });
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
