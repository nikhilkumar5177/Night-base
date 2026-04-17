const { EmbedBuilder } = require('discord.js');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'antinuke',
  aliases: ['security'],
  description: 'Toggle anti-nuke system',
  usage: 'antinuke <on|off|config> [threshold] [window]',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Owner Only').setDescription('Only the server owner can configure anti-nuke.').setTimestamp()] });
      }
      const action = args[0]?.toLowerCase();
      const securityConfig = storage.read('security.json');
      if (action === 'on') {
        securityConfig.enabled = true;
        storage.write('security.json', securityConfig);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Anti-Nuke Enabled').setDescription('Security monitoring is now active.').setTimestamp()] });
      }
      if (action === 'off') {
        securityConfig.enabled = false;
        storage.write('security.json', securityConfig);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ffab00').setTitle('{EMOJI_WARN} Anti-Nuke Disabled').setDescription('Security monitoring has been turned off.').setTimestamp()] });
      }
      if (action === 'config') {
        const threshold = parseInt(args[1]) || securityConfig.nukeThreshold || 3;
        const window = parseInt(args[2]) || securityConfig.nukeWindow || 10000;
        securityConfig.nukeThreshold = threshold;
        securityConfig.nukeWindow = window;
        storage.write('security.json', securityConfig);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#00e676').setTitle('{EMOJI_SUCCESS} Config Updated').addFields({ name: 'Threshold', value: `${threshold} actions`, inline: true }, { name: 'Window', value: `${window / 1000}s`, inline: true }).setTimestamp()] });
      }
      const embed = new EmbedBuilder()
        .setColor(client.config.embedColor || '#0099ff')
        .setTitle('{EMOJI_INFO} Anti-Nuke Status')
        .addFields(
          { name: 'Status', value: securityConfig.enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Threshold', value: `${securityConfig.nukeThreshold || 3} actions`, inline: true },
          { name: 'Window', value: `${(securityConfig.nukeWindow || 10000) / 1000}s`, inline: true },
          { name: 'Logged Events', value: `${(securityConfig.logs || []).length}`, inline: true }
        )
        .setDescription(`Usage:\n\`${client.config.prefix}antinuke on\` - Enable\n\`${client.config.prefix}antinuke off\` - Disable\n\`${client.config.prefix}antinuke config <threshold> <window_ms>\` - Configure`)
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} Error').setDescription(error.message).setTimestamp()] });
    }
  }
};
