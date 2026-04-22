const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_LOADING, EMOJI_OWNER } = require('../../utils/constants');

module.exports = {
  name: 'vcpullall',
  aliases: ['pullall', 'dragall'],
  description: 'Pull everyone into your voice channel (Owner Only)',
  usage: 'vcpullall',
  cooldown: 10,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      if (message.author.id !== message.guild.ownerId && message.author.id !== process.env.DEV_ID) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_OWNER} Only the server owner can use this command.`).setTimestamp()] });
      }

      const channel = message.member.voice.channel;
      if (!channel) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} You must be in a voice channel to pull people.`).setTimestamp()] });
      }

      const allMembers = [];
      message.guild.channels.cache.filter(c => c.isVoiceBased() && c.id !== channel.id).forEach(c => {
        c.members.forEach(m => allMembers.push(m));
      });

      if (allMembers.length === 0) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setDescription(`${EMOJI_WARN} No other users found in voice channels.`).setTimestamp()] });
      }

      const statusEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setDescription(`${EMOJI_LOADING} **Pulling ${allMembers.length} members into ${channel}...**`)
        .setTimestamp();

      const statusMsg = await message.reply({ embeds: [statusEmbed] }).catch(() => {});

      let count = 0;
      for (const member of allMembers) {
        try {
          await member.voice.setChannel(channel, `Pulled by ${message.author.tag}`);
          count++;
        } catch (e) { }
      }

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Mass Pull', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Successfully pulled ${count} members.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Target Channel', value: `${channel}`, inline: true },
          { name: '\u25B8 Moderator', value: `${message.author.tag}`, inline: true }
        )
        .setTimestamp();

      statusMsg.edit({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
