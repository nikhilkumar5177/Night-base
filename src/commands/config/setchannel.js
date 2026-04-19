const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'setchannel',
  aliases: ['channelcmd'],
  description: 'Enable or disable commands in a channel',
  usage: 'setchannel <enable|disable> [channel] <command>',
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
      if (!action || !['enable', 'disable'].includes(action)) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}setchannel <enable|disable> [#channel] <command>\n\`\`\`` }, { name: '\u2501\u2501 Examples', value: `\`\`\`\n${client.config.prefix}setchannel disable #general warn\n${client.config.prefix}setchannel enable #general warn\n\`\`\`` }, { name: 'Aliases', value: '`channelcmd`', inline: true }, { name: 'Permission', value: '`ManageChannels`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.reply({ embeds: [usageEmbed] });
      }
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
      const cmdName = args[2] || args[1];
      if (!cmdName || !client.commands.has(cmdName)) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Invalid Command').setDescription('Specify a valid command name.').setTimestamp()] });
      }
      const configData = storage.read('config.json');
      if (!configData.channelCommands) configData.channelCommands = {};
      if (!configData.channelCommands[channel.id]) configData.channelCommands[channel.id] = { disabled: [] };
      if (action === 'disable') {
        if (!configData.channelCommands[channel.id].disabled.includes(cmdName)) {
          configData.channelCommands[channel.id].disabled.push(cmdName);
        }
        storage.write('config.json', configData);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Command Disabled').setDescription(`\`${cmdName}\` is now disabled in ${channel}.`).setTimestamp()] });
      }
      configData.channelCommands[channel.id].disabled = configData.channelCommands[channel.id].disabled.filter(c => c !== cmdName);
      storage.write('config.json', configData);
      message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Command Enabled').setDescription(`\`${cmdName}\` is now enabled in ${channel}.`).setTimestamp()] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
