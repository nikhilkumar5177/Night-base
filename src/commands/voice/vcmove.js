const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');

module.exports = {
  name: 'vcmove',
  aliases: ['vcmv', 'move'],
  description: 'Move a user to a specific voice channel',
  usage: 'vcmove <@user/id> <#channel/id>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Please specify a user to move.`).setTimestamp()] });
      }

      if (!target.voice.channel) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} That user is not in a voice channel.`).setTimestamp()] });
      }

      const channelInput = args[1];
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(channelInput);

      if (!channel || !channel.isVoiceBased()) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} Please specify a valid voice channel.`).setTimestamp()] });
      }

      await target.voice.setChannel(channel, `Moved to ${channel.name} by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Move', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **User has been moved to the specified channel.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 User', value: `${target.user.tag}`, inline: true },
          { name: '\u25B8 Target VC', value: `${channel.name}`, inline: true },
          { name: '\u25B8 Moderator', value: `${message.author.tag}`, inline: true }
        )
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
