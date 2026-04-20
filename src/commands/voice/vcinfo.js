const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_DOT, EMOJI_ERROR } = require('../../utils/constants');

module.exports = {
  name: 'vcinfo',
  aliases: ['vi'],
  description: 'Display information about a voice channel',
  usage: 'vcinfo [#channel]',
  cooldown: 5,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.member.voice.channel;
      
      if (!channel || !channel.isVoiceBased()) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Please mention a voice channel or join one.`).setTimestamp()] });
      }

      const members = channel.members.map(m => m.user.tag).join(', ') || 'None';
      const isLocked = !channel.permissionsFor(message.guild.roles.everyone).has('Connect');
      const isHidden = !channel.permissionsFor(message.guild.roles.everyone).has('ViewChannel');

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Analytics', iconURL: client.user.displayAvatarURL() })
        .setDescription(
          `${SEP}\n` +
          `${EMOJI_DOT} **Name:** \`${channel.name}\`\n` +
          `${EMOJI_DOT} **ID:** \`${channel.id}\`\n` +
          `${EMOJI_DOT} **Bitrate:** \`${channel.bitrate / 1000}kbps\`\n` +
          `${EMOJI_DOT} **User Limit:** \`${channel.userLimit === 0 ? 'No Limit' : channel.userLimit}\`\n` +
          `${EMOJI_DOT} **Status:** ${isHidden ? '\`Hidden\`' : '\`Visible\`'} \u2502 ${isLocked ? '\`Locked\`' : '\`Unlocked\`'}\n` +
          `${SEP}`
        )
        .addFields(
          { name: '\u25B8 Members Count', value: `\`${channel.members.size}\``, inline: true },
          { name: '\u25B8 Category', value: channel.parent ? channel.parent.name : 'None', inline: true },
          { name: '\u25B8 Members', value: `\`\`\`\n${members.length > 1000 ? members.substring(0, 997) + '...' : members}\n\`\`\`` }
        )
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
