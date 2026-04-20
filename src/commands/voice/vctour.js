const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_LOADING } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');

// Global tracker for active tours to allow stopping them
if (!global.activeVCTours) global.activeVCTours = new Set();

module.exports = {
  name: 'vctour',
  aliases: ['tour'],
  description: 'Move a user or your VC group through all visible VCs in a loop (Owner Only)',
  usage: 'vctour [@user] | vctour stop',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      // Handle stop command
      if (args[0]?.toLowerCase() === 'stop') {
        if (!global.activeVCTours.has(message.guild.id)) {
          return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setDescription(`${EMOJI_WARN} No active VC tour found in this server.`).setTimestamp()] });
        }
        global.activeVCTours.delete(message.guild.id);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#57F287').setDescription(`${EMOJI_SUCCESS} **VC Tour stopped.**`).setTimestamp()] });
      }

      // Check if already running
      if (global.activeVCTours.has(message.guild.id)) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setDescription(`${EMOJI_WARN} A VC tour is already running. Use \`!vctour stop\` to end it.`).setTimestamp()] });
      }

      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Please specify a user to start a tour.`).setTimestamp()] });
      }

      if (!target.voice.channel) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} **${target.user.tag}** is not in a voice channel.`).setTimestamp()] });
      }

      let members = [target];

      const otherChannels = Array.from(message.guild.channels.cache
        .filter(c => c.isVoiceBased() && c.permissionsFor(message.guild.members.me).has('Connect'))
        .sort((a, b) => a.position - b.position)
        .values());

      if (otherChannels.length < 2) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setDescription(`${EMOJI_WARN} Need at least 2 accessible voice channels for a tour.`).setTimestamp()] });
      }

      const startEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Tour Started', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_LOADING} **Starting 2-minute VC tour loop...**\nTarget: **${target ? target.user.tag : 'Everyone in VC'}**\nChannels: **${otherChannels.length}**\n\nUse \`!vctour stop\` to end it early.\n${SEP}`)
        .setTimestamp();
      const statusMsg = await message.reply({ embeds: [startEmbed] });

      global.activeVCTours.add(message.guild.id);
      const startTime = Date.now();
      const duration = 120000; // 2 minutes
      let channelIndex = 0;

      while (Date.now() - startTime < duration && global.activeVCTours.has(message.guild.id)) {
        const nextChannel = otherChannels[channelIndex];
        
        // Move all members in the tour
        await Promise.allSettled(members.map(m => m.voice.setChannel(nextChannel, `VC Tour (Extreme Loop)`)));

        // Update index for next iteration
        channelIndex = (channelIndex + 1) % otherChannels.length;

        // Update status occasionally
        if (channelIndex === 0) {
          const remaining = Math.round((duration - (Date.now() - startTime)) / 1000);
          statusMsg.edit({ embeds: [startEmbed.setDescription(`${SEP}\n${EMOJI_LOADING} **Touring...**\nTime Remaining: **${remaining}s**\nLooping through ${otherChannels.length} channels.\n${SEP}`)] }).catch(() => {});
        }

        // Minimal delay to prevent instant API exhaustion while maintaining "non-stop" feel
        await new Promise(r => setTimeout(r, 300)); 
      }

      global.activeVCTours.delete(message.guild.id);

      const endEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Tour Finished', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **The VC tour loop has concluded.**\n${SEP}`)
        .setTimestamp();
      
      await statusMsg.edit({ embeds: [endEmbed] }).catch(() => {});

    } catch (error) {
      global.activeVCTours.delete(message.guild.id);
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
