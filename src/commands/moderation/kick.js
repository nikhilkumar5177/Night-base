const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sendUsage, sendAutoDelete } = require('../../utils/messageHelper');

const { EMOJI_DOT, SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_LOADING } = require('../../utils/constants');

module.exports = {
  name: 'kick',
  aliases: ['k', 'fuckoff'],
  description: 'Kick a user with button confirmation',
  usage: 'kick <user> [reason]',
  example: 'kick @User breaking rules\nkick 123456789 toxicity',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  userPermissions: ['KickMembers'],
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('KickMembers')) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **KickMembers** permission.`).setTimestamp()] }, 5000);
      }
      if (!message.guild.members.me.permissions.has('KickMembers')) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} I need **KickMembers** permission.`).setTimestamp()] }, 5000);
      }

      const { resolveMember } = require('../../utils/resolver');
      const targets = new Set();
      const reasonArgs = [];

      for (const arg of args) {
        if (arg.match(/^\d{17,20}$/) || arg.match(/^<@!?\d{17,20}>$/)) {
          const member = await resolveMember(message.guild, arg);
          if (member) targets.add(member);
        } else {
          reasonArgs.push(arg);
        }
      }

      const finalTargets = Array.from(targets).filter(t => t.id !== message.author.id);

      if (finalTargets.length === 0) {
        return sendUsage(message, module.exports);
      }

      const reason = reasonArgs.join(' ') || 'No reason provided';
      const validTargets = [];
      const invalidTargets = [];

      for (const target of finalTargets) {
        if (!target.kickable || target.roles.highest.position >= message.member.roles.highest.position) {
          invalidTargets.push(target.user.tag);
        } else {
          validTargets.push(target);
        }
      }

      if (validTargets.length === 0) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} I cannot kick any of the specified users (higher roles or unkickable).\n**Invalid:** ${invalidTargets.join(', ')}`).setTimestamp()] });
      }

      const confirmEmbed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setAuthor({ name: 'Wild Wolf \u2502 Mass Kick Confirmation', iconURL: client.user.displayAvatarURL() })
        .setDescription(
          `${SEP}\n` +
          `${EMOJI_WARN} **Are you sure you want to kick ${validTargets.length} user(s)?**\n` +
          `${SEP}\n\n` +
          `${EMOJI_DOT} **Targets:** ${validTargets.map(t => `\`${t.user.tag}\``).join(', ')}\n` +
          `${EMOJI_DOT} **Reason:** ${reason}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}`
        )
        .setFooter({ text: 'Wild Wolf \u2022 This action is irreversible' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kick_yes').setLabel(`Confirm Kick (${validTargets.length})`).setStyle(ButtonStyle.Danger).setEmoji('\u2714'),
        new ButtonBuilder().setCustomId('kick_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.reply({ embeds: [confirmEmbed], components: [row] }).catch(() => {});
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 30000, max: 1 });

      coll.on('collect', async i => {
        if (i.customId === 'kick_yes') {
          const loadEmbed = new EmbedBuilder()
            .setColor('#EB459E')
            .setAuthor({ name: 'Wild Wolf \u2502 Processing', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n${EMOJI_LOADING} **Mass kicking ${validTargets.length} users...**\n${SEP}`)
            .setTimestamp();
          await i.update({ embeds: [loadEmbed], components: [] });

          let successCount = 0;
          let failCount = 0;

          for (const target of validTargets) {
            try {
              await target.send({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_ERROR} **You have been kicked from ${message.guild.name}**\n\n${EMOJI_DOT} **Reason:** ${reason}\n${EMOJI_DOT} **Moderator:** ${message.author.tag}\n${SEP}`).setTimestamp()] }).catch(() => { });
              await target.kick(reason);
              successCount++;
            } catch (err) {
              failCount++;
            }
          }

          const successEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setAuthor({ name: 'Wild Wolf \u2502 Mass Kick Executed', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Mass kick action completed.**\n${SEP}`)
            .addFields(
              { name: '\u25B8 Success', value: `\`${successCount}\` users`, inline: true },
              { name: '\u25B8 Failed', value: `\`${failCount}\` users`, inline: true },
              { name: '\u25B8 Reason', value: reason }
            )
            .setFooter({ text: 'Wild Wolf \u2022 Moderation Log', iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();
          await sent.edit({ embeds: [successEmbed] }).catch(() => {});
        } else {
          const cancelEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setAuthor({ name: 'Wild Wolf \u2502 Cancelled', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n${EMOJI_WARN} **Mass kick action cancelled.**\n${SEP}`)
            .setTimestamp();
          await i.update({ embeds: [cancelEmbed], components: [] });
          setTimeout(() => sent.delete().catch(() => { }), 5000);
        }
      });

      coll.on('end', (c) => {
        if (c.size === 0) {
          sent.edit({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#2B2D31').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_WARN} **Mass kick confirmation timed out.**\n${SEP}`).setTimestamp()], components: [] }).catch(() => { });
        }
      });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
