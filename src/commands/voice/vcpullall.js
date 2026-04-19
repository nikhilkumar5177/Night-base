const { EmbedBuilder } = require('discord.js');
const { SEP } = require('../../utils/constants');

module.exports = {
  name: 'vcpullall',
  aliases: ['pullall'],
  description: 'Pull everyone into your voice channel (Owner Only)',
  usage: 'vcpullall',
  cooldown: 10,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const moderatorChannel = message.member.voice.channel;
      if (!moderatorChannel) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription('{EMOJI_ERROR} You must be in a voice channel to pull people.').setTimestamp()] });
      }

      const allMembers = [];
      message.guild.channels.cache.filter(c => c.isVoiceBased() && c.id !== moderatorChannel.id).forEach(c => {
        c.members.forEach(m => allMembers.push(m));
      });

      if (allMembers.length === 0) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setDescription('{EMOJI_WARN} No other users found in voice channels.').setTimestamp()] });
      }

      const loadEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 Processing', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_LOADING} **Pulling ${allMembers.length} users into ${moderatorChannel.name}...**\n${SEP}`)
        .setTimestamp();
      const sent = await message.reply({ embeds: [loadEmbed] });

      let count = 0;
      for (const member of allMembers) {
        try {
          await member.voice.setChannel(moderatorChannel, `Mass pulled by ${message.author.tag}`);
          count++;
        } catch { }
      }

      const doneEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Pull Complete', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Successfully pulled all users.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Success', value: `\`${count}\` users`, inline: true },
          { name: '\u25B8 Channel', value: `${moderatorChannel.name}`, inline: true }
        )
        .setTimestamp();

      await sent.edit({ embeds: [doneEmbed] });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
