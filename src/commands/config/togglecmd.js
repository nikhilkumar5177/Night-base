const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_OWNER, EMOJI_ERROR, EMOJI_SUCCESS, EMOJI_WARN } = require('../../utils/constants');

module.exports = {
  name: 'togglecmd',
  aliases: ['toggle', 'cmdenable'],
  description: 'Enable or disable a command globally',
  usage: 'togglecmd <command>',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_OWNER} Owner Only`).setTimestamp()] });
      }
      const cmdName = args[0]?.toLowerCase();
      if (!cmdName) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}togglecmd <command name>\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}togglecmd warn\n\`\`\`` }, { name: 'Aliases', value: '`toggle`, `cmdenable`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.reply({ embeds: [usageEmbed] }).catch(() => {});
      }
      const command = client.commands.get(cmdName);
      if (!command) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Command Not Found`).setTimestamp()] });
      }
      const configData = storage.read('config.json');
      if (!configData.disabledCommands) configData.disabledCommands = [];
      if (configData.disabledCommands.includes(cmdName)) {
        configData.disabledCommands = configData.disabledCommands.filter(c => c !== cmdName);
        storage.write('config.json', configData);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle(`${EMOJI_OWNER} Command Enabled`).setDescription(`\`${cmdName}\` is now enabled.`).setTimestamp()] });
      }
      configData.disabledCommands.push(cmdName);
      storage.write('config.json', configData);
      message.reply({ embeds: [new EmbedBuilder().setColor('#ffab00').setTitle(`${EMOJI_WARN} Command Disabled`).setDescription(`\`${cmdName}\` is now disabled globally.`).setTimestamp()] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle(`${EMOJI_ERROR} Error`).setDescription(error.message).setTimestamp()] });
    }
  }
};
