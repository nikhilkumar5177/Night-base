const { EmbedBuilder } = require('discord.js');
const { LIMITS, SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_LOADING } = require('../../utils/constants');

module.exports = {
  name: 'purgebot',
  aliases: ['pb', 'clearbot'],
  description: 'Purge only bot messages from the channel',
  usage: 'purgebot [count]',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageMessages')) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **ManageMessages** permission.`).setTimestamp()] });
      }
      if (!message.guild.members.me.permissions.has('ManageMessages')) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} I need **ManageMessages** permission.`).setTimestamp()] });
      }

      let count = Math.min(parseInt(args[0]) || 50, LIMITS.MAX_PURGE);
      await message.delete().catch(() => {});

      const loadEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 Purge Bot', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_LOADING} **Scanning and deleting bot messages...**\n${SEP}`)
        .setTimestamp();
      const progressMsg = await message.reply({ embeds: [loadEmbed] }).catch(() => {});

      let fetched = await message.channel.messages.fetch({ limit: 100 });
      let filtered = fetched.filter(m => m.author.bot && m.id !== progressMsg.id);

      const twoWeeks = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletable = filtered.filter(m => m.createdTimestamp > twoWeeks).first(count);

      if (deletable.length === 0) {
        return progressMsg.edit({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf \u2502 Purge Bot', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_WARN} **No bot messages found.**\n${SEP}`).setTimestamp()] });
      }

      const deleted = await message.channel.bulkDelete(deletable, true);

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Purge Complete', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Bot messages purged successfully.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Deleted', value: `\`${deleted.size}\` messages`, inline: true },
          { name: '\u25B8 Filter', value: '`Bot Messages`', inline: true },
          { name: '\u25B8 By', value: message.author.tag, inline: true }
        )
        .setTimestamp();
      
      await progressMsg.edit({ embeds: [embed] }).catch(() => {});
      setTimeout(() => progressMsg.delete().catch(() => {}), 5000);
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
