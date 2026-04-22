const { EmbedBuilder } = require('discord.js');
const { sendUsage, sendAutoDelete } = require('../../utils/messageHelper');
const { EMOJI_DOT, SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_LOADING } = require('../../utils/constants');

module.exports = {
  name: 'unban',
  aliases: ['ub'],
  description: 'Unban one or more users from the server',
  usage: 'unban <userIds...|mentions...> [reason]',
  example: 'unban 123456789 appeal accepted\nunban 123456789 987654321 mass appeal',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  userPermissions: ['BanMembers'],
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('BanMembers')) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **BanMembers** permission.`).setTimestamp()] }, 5000);
      }
      if (!message.guild.members.me.permissions.has('BanMembers')) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} I need **BanMembers** permission.`).setTimestamp()] }, 5000);
      }

      if (args.length === 0) {
        return sendUsage(message, module.exports);
      }

      const idRegex = /^\d{17,20}$/;
      const mentionRegex = /^<@!?(\d{17,20})>$/;
      
      const idsToUnban = [];
      const reasonParts = [];

      for (const arg of args) {
        const match = arg.match(mentionRegex);
        if (match) {
          idsToUnban.push(match[1]);
        } else if (arg.match(idRegex)) {
          idsToUnban.push(arg);
        } else {
          reasonParts.push(arg);
        }
      }

      if (idsToUnban.length === 0) {
        return sendUsage(message, module.exports);
      }

      const reason = reasonParts.join(' ') || 'No reason provided';
      const success = [];
      const failure = [];

      const loadEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 Processing', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_LOADING} **Processing unbans for ${idsToUnban.length} target(s)...**\n${SEP}`)
        .setTimestamp();
      
      const statusMsg = await message.reply({ embeds: [loadEmbed] });

      for (const id of idsToUnban) {
        if (!/^\d{17,20}$/.test(id)) {
          failure.push(`\`${id}\` (Invalid ID format)`);
          continue;
        }
        try {
          await message.guild.members.unban(id, reason);
          success.push(`\`${id}\``);
        } catch (err) {
          let errorType = err.message;
          if (err.code === 10013) errorType = 'Unknown User';
          if (err.code === 10026) errorType = 'Not Banned';
          failure.push(`\`${id}\` (${errorType})`);
        }
      }

      const finalEmbed = new EmbedBuilder()
        .setAuthor({ name: 'Wild Wolf \u2502 Unban Results', iconURL: client.user.displayAvatarURL() })
        .setColor(failure.length === 0 ? '#57F287' : success.length > 0 ? '#FEE75C' : '#ED4245')
        .setDescription(
            `${SEP}\n` +
            (success.length > 0 ? `${EMOJI_SUCCESS} **Successfully unbanned ${success.length} user(s):**\n${success.join(', ')}\n\n` : '') +
            (failure.length > 0 ? `${EMOJI_ERROR} **Failed to unban ${failure.length} user(s):**\n${failure.join('\n')}\n\n` : '') +
            `${EMOJI_DOT} **Reason:** ${reason}\n` +
            `${EMOJI_DOT} **Moderator:** ${message.author}\n` +
            `${SEP}`
        )
        .setFooter({ text: 'Wild Wolf \u2022 Moderation Log', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await statusMsg.edit({ embeds: [finalEmbed] });

    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
