const { EmbedBuilder } = require('discord.js');
const { resolveEmbedEmojis } = require('../../utils/constants');

module.exports = {
  name: 'setprefix',
  aliases: ['prefix'],
  description: 'Change the bot prefix',
  usage: 'setprefix <new prefix>',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ 
          embeds: [resolveEmbedEmojis(new EmbedBuilder()
            .setColor('#ff1744')
            .setTitle('{EMOJI_OWNER} Owner Only')
            .setDescription('Only the server owner can change the prefix.')
            .setTimestamp().toJSON())] 
        });
      }
      if (!args[0]) {
        return message.reply({ embeds: [resolveEmbedEmojis(new EmbedBuilder().setColor('#0099ff').setTitle('{EMOJI_INFO} Current Prefix').setDescription(`Current prefix: \`${client.config.prefix}\``).setTimestamp().toJSON())] });
      }
      const newPrefix = args[0];
      if (newPrefix.length > 5) {
        return message.reply({ embeds: [resolveEmbedEmojis(new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Too Long').setDescription('Prefix cannot exceed 5 characters.').setTimestamp().toJSON())] });
      }
      const fs = require('fs');
      const path = require('path');
      client.config.prefix = newPrefix;
      fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'config.json'), JSON.stringify(client.config, null, 2));
      message.reply({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Prefix Updated').setDescription(`New prefix: \`${newPrefix}\``).setTimestamp()] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
