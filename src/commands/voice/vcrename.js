const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');

module.exports = {
  name: 'vcrename',
  aliases: ['vr', 'rename'],
  description: 'Rename a voice channel',
  usage: 'vcrename <new name>',
  cooldown: 10,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const newName = args.join(' ');
      if (!newName) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setDescription(`${EMOJI_ERROR} Please specify a new name.`).setTimestamp()] });
      }

      const channel = message.member.voice.channel;
      if (!channel) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setDescription(`${EMOJI_ERROR} You must be in a voice channel to rename it.`).setTimestamp()] });
      }

      const oldName = channel.name;
      await channel.setName(newName);

      const embed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 VC Renamed', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Voice channel has been renamed.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Old Name', value: `\`${oldName}\``, inline: true },
          { name: '\u25B8 New Name', value: `\`${newName}\``, inline: true },
          { name: '\u25B8 Moderator', value: `${message.author.tag}`, inline: true }
        )
        .setTimestamp();

      message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
