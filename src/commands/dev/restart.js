const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_OWNER, EMOJI_DOT, FOOTER_TEXT } = require('../../utils/constants');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'restart',
  aliases: ['reboot'],
  description: 'Restart the bot process',
  usage: 'restart',
  cooldown: 0,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the bot process'),
  staffOnly: false,
  devOnly: true,
  premiumOnly: false,
  execute: async (client, message, args) => {
    const user = message.author || message.user;
    const devIds = process.env.DEV_ID ? process.env.DEV_ID.split(',').map(id => id.trim()) : [];
    if (!devIds.includes(user.id)) return; // Silent ignore

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 System Reboot`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **Kernel is restarting...**\n${EMOJI_DOT} **Status:** \`Process Exit Initiated\``))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

    await message.reply({ 
      components: [container], 
      flags: 32768 
    }).catch(() => {});
    
    // Small delay to ensure message is sent before process exits
    setTimeout(async () => {
      await storage.stopPeriodicFlush();
      process.exit(0);
    }, 1000);
  }
};
