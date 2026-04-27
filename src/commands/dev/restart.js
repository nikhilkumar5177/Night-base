const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_OWNER, EMOJI_DOT } = require('../../utils/constants');

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
  execute: async (client, message, args) => {
    if ((message.author || message.user).id !== process.env.DEV_ID) return;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 System Reboot`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **Kernel is restarting...**\n${EMOJI_DOT} **Status:** \`Process Exit Initiated\``))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('Bot process will be offline for a few seconds'));

    await message.reply({ 
      components: [container], 
      flags: 32768 
    }).catch(() => {});
    
    // Small delay to ensure message is sent before process exits
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
};
