const { EmbedBuilder } = require('discord.js');
const { resolveMember } = require('../../utils/resolver');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
const DOT = '\u25AA';

module.exports = {
  name: 'mute',
  aliases: ['timeout', 'to'],
  description: 'Timeout a user',
  usage: 'mute <user> [duration in minutes] [reason]',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ModerateMembers')) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} You need **ModerateMembers** permission.').setTimestamp()] });
      }
      if (!message.guild.members.me.permissions.has('ModerateMembers')) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} I need **ModerateMembers** permission.').setTimestamp()] });
      }
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}mute <@user> [minutes] [reason]\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}mute @User 30 spamming\n\`\`\`` }, { name: 'Aliases', value: '`timeout`, `to`', inline: true }, { name: 'Cooldown', value: '`3s`', inline: true }, { name: 'Max', value: '`28 days`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp()] });
      }
      if (!target.moderatable) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} I cannot timeout this user.').setTimestamp()] });
      }
      if (target.roles.highest.position >= message.member.roles.highest.position) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} Target has equal or higher role.').setTimestamp()] });
      }

      const duration = parseInt(args[1]) || 10;
      const durationMs = Math.min(duration * 60 * 1000, 28 * 24 * 60 * 60 * 1000);
      const reason = args.slice(2).join(' ') || 'No reason provided';

      const loadEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 Processing', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_LOADING} **Applying timeout...**\n${SEP}`)
        .setTimestamp();
      const sent = await message.channel.send({ embeds: [loadEmbed] });

      await target.timeout(durationMs, reason);
      await new Promise(r => setTimeout(r, 400));

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Timeout Applied', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setDescription(`${SEP}\n{EMOJI_SUCCESS} **User has been timed out.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 User', value: `${target.user.tag}\n\`${target.id}\``, inline: true },
          { name: '\u25B8 Duration', value: `\`${duration} minutes\``, inline: true },
          { name: '\u25B8 Moderator', value: message.author.tag, inline: true },
          { name: '\u25B8 Reason', value: reason },
          { name: '\u25B8 Expires', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:F> (<t:${Math.floor((Date.now() + durationMs) / 1000)}:R>)` }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Moderation Log', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      await sent.edit({ embeds: [embed] });

      const dmEmbed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setAuthor({ name: 'Wild Wolf \u2502 Timeout Notice', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n{EMOJI_WARN} **You have been timed out in ${message.guild.name}**\n${SEP}\n\n${DOT} **Duration:** \`${duration} minutes\`\n${DOT} **Reason:** ${reason}\n${DOT} **Expires:** <t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`)
        .setTimestamp();
      target.send({ embeds: [dmEmbed] }).catch(() => {});
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
