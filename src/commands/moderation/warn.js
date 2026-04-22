const { EmbedBuilder } = require('discord.js');
const { resolveMember } = require('../../utils/resolver');
const storage = require('../../utils/storageManager');
const { sendUsage, sendAutoDelete } = require('../../utils/messageHelper');

const { EMOJI_DOT, EMOJI_ARROW, SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_LOADING } = require('../../utils/constants');

module.exports = {
  name: 'warn',
  aliases: ['w'],
  description: 'Warn a user',
  usage: 'warn <user> [reason]',
  example: 'warn @User being toxic\nwarn 123456789 spamming',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ModerateMembers')) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **ModerateMembers** permission.`).setTimestamp()] }, 5000);
      }
      if (!args[0]) {
        return sendUsage(message, module.exports);
      }
      const target = await resolveMember(message.guild, args[0]);
      if (!target) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} Could not find the specified user.`).setTimestamp()] });
      }
      if (target.id === message.author.id) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You cannot warn yourself.`).setTimestamp()] });
      }
      if (target.roles.highest.position >= message.member.roles.highest.position) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} Target has equal or higher role.`).setTimestamp()] });
      }

      const loadEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 Processing', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_LOADING} **Issuing warning...**\n${SEP}`)
        .setTimestamp();
      const sent = await message.reply({ embeds: [loadEmbed] }).catch(() => {});

      const reason = args.slice(1).join(' ') || 'No reason provided';
      const warns = storage.read('warns.json');
      if (!warns[target.id]) warns[target.id] = [];
      const caseId = Date.now().toString(36).toUpperCase();
      warns[target.id].push({ caseId, moderator: message.author.id, reason, guildId: message.guild.id, timestamp: Date.now() });
      if (warns[target.id].length > 50) warns[target.id] = warns[target.id].slice(-50);
      storage.write('warns.json', warns);

      await new Promise(r => setTimeout(r, 400));

      const totalWarns = warns[target.id].length;
      const warnBar = totalWarns >= 10 ? '\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588' : '\u2588'.repeat(totalWarns) + '\u2591'.repeat(10 - totalWarns);
      const severity = totalWarns >= 10 ? 'CRITICAL' : totalWarns >= 5 ? 'HIGH' : totalWarns >= 3 ? 'MODERATE' : 'LOW';

      const embed = new EmbedBuilder()
        .setColor(totalWarns >= 5 ? '#ED4245' : '#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Warning Issued', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `${SEP}\n` +
          `${EMOJI_SUCCESS} **Warning has been recorded.**\n` +
          `${SEP}`
        )
        .addFields(
          { name: `${EMOJI_ARROW} User`, value: `${target.user.tag}\n\`${target.id}\``, inline: true },
          { name: `${EMOJI_ARROW} Moderator`, value: `${message.author.tag}`, inline: true },
          { name: `${EMOJI_ARROW} Case ID`, value: `\`${caseId}\``, inline: true },
          { name: `${EMOJI_ARROW} Reason`, value: reason },
          { name: `${EMOJI_ARROW} Warn Level [${totalWarns}/10]`, value: `\`${warnBar}\` **${severity}**` }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Moderation Log', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await sent.edit({ embeds: [embed] }).catch(() => {});

      const dmEmbed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setAuthor({ name: 'Wild Wolf \u2502 Warning Received', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_WARN} **You received a warning in ${message.guild.name}**\n${SEP}\n\n${EMOJI_DOT} **Reason:** ${reason}\n${EMOJI_DOT} **Case ID:** \`${caseId}\`\n${EMOJI_DOT} **Total Warnings:** \`${totalWarns}\``)
        .setFooter({ text: 'Repeated violations may result in further action' })
        .setTimestamp();
      target.send({ embeds: [dmEmbed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
