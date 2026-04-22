const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_LOADING } = require('../../utils/constants');
const { resolveMember } = require('../../utils/resolver');


module.exports = {
  name: 'unmute',
  aliases: ['untimeout', 'uto'],
  description: 'Remove timeout from a user',
  usage: 'unmute <user>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ModerateMembers')) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **ModerateMembers** permission.`).setTimestamp()] });
      }
      if (!message.guild.members.me.permissions.has('ModerateMembers')) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} I need **ModerateMembers** permission.`).setTimestamp()] });
      }
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}unmute <@user>\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}unmute @User\n\`\`\`` }, { name: 'Aliases', value: '`untimeout`, `uto`', inline: true }, { name: 'Cooldown', value: '`3s`', inline: true }, { name: 'Permission', value: '`ModerateMembers`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp()] });
      }
      if (!target.isCommunicationDisabled()) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#FEE75C').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_WARN} This user is not currently timed out.\n${SEP}`).setTimestamp()] });
      }

      const loadEmbed = new EmbedBuilder().setColor('#EB459E').setAuthor({ name: 'Wild Wolf \u2502 Processing', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_LOADING} **Removing timeout...**\n${SEP}`).setTimestamp();
      const sent = await message.reply({ embeds: [loadEmbed] }).catch(() => {});

      await target.timeout(null);
      await new Promise(r => setTimeout(r, 400));

      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Timeout Removed', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **User timeout has been removed.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 User', value: `${target.user.tag}\n\`${target.id}\``, inline: true },
          { name: '\u25B8 Moderator', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Moderation Log', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      await sent.edit({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
