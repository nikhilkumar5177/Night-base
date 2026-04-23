const { EmbedBuilder } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_OWNER } = require('../../utils/constants');

module.exports = {
  name: 'restart',
  aliases: ['reboot'],
  description: 'Restart the bot process',
  usage: 'restart',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    if (message.author.id !== process.env.DEV_ID) return;

    const embed = new EmbedBuilder()
      .setColor('#ff9800')
      .setTitle(`${EMOJI_OWNER} System Restart`)
      .setDescription('Bot process is restarting...')
      .setTimestamp();

    await message.reply({ embeds: [embed] }).catch(() => {});
    
    // Small delay to ensure message is sent before process exits
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
};
