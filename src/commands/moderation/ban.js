const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sendAutoDelete } = require('../../utils/messageHelper');

const { resolveEmbedEmojis, EMOJI_DOT, SEP } = require('../../utils/constants');

module.exports = {
  name: 'ban',
  aliases: ['b', 'bkl',],
  description: 'Ban a user with button confirmation',
  usage: 'ban <user> [reason]',
  cooldown: 10,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('BanMembers')) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} You need **BanMembers** permission.').setTimestamp()] }, 5000);
      }
      if (!message.guild.members.me.permissions.has('BanMembers')) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} I need **BanMembers** permission.').setTimestamp()] }, 5000);
      }

      const targets = new Set();
      message.mentions.members.forEach(m => targets.add(m));

      const reasonArgs = [];
      for (const arg of args) {
        if (arg.match(/^\d{17,20}$/) || arg.match(/^<@!?\d{17,20}>$/)) {
          const id = arg.replace(/[<@!>]/g, '');
          const member = message.guild.members.cache.get(id);
          if (member) targets.add(member);
        } else {
          reasonArgs.push(arg);
        }
      }

      const finalTargets = Array.from(targets).filter(t => t.id !== message.author.id);

      if (finalTargets.length === 0) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}ban <@user(s)> [reason]\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}ban @User1 @User2 raiding the server\n\`\`\`` }, { name: 'Aliases', value: '`b`', inline: true }, { name: 'Cooldown', value: '`5s`', inline: true }, { name: 'Permission', value: '`BanMembers`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return sendAutoDelete(message, { embeds: [usageEmbed] }, 15000);
      }

      const reason = reasonArgs.join(' ') || 'No reason provided';
      const validTargets = [];
      const invalidTargets = [];

      for (const target of finalTargets) {
        if (!target.bannable || target.roles.highest.position >= message.member.roles.highest.position) {
          invalidTargets.push(target.user.tag);
        } else {
          validTargets.push(target);
        }
      }

      if (validTargets.length === 0) {
        return sendAutoDelete(message, { embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} I cannot ban any of the specified users (higher roles or unbannable).\n**Invalid:** ${invalidTargets.join(', ')}`).setTimestamp()] }, 10000);
      }

      const confirmEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: 'Wild Wolf \u2502 Mass Ban Confirmation', iconURL: client.user.displayAvatarURL() })
        .setDescription(
          `${SEP}\n` +
          `{EMOJI_WARN} **This action will permanently ban ${validTargets.length} user(s).**\n` +
          `${SEP}\n\n` +
          `${EMOJI_DOT} **Targets:** ${validTargets.map(t => `\`${t.user.tag}\``).join(', ')}\n` +
          `${EMOJI_DOT} **Reason:** ${reason}\n` +
          `${EMOJI_DOT} **Moderator:** ${message.author.tag}\n` +
          `${EMOJI_DOT} **Messages:** \`7 days will be purged\``
        )
        .setFooter({ text: 'Wild Wolf \u2022 Confirm within 30 seconds' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ban_yes').setLabel(`Confirm Ban (${validTargets.length})`).setStyle(ButtonStyle.Danger).setEmoji('\u2714'),
        new ButtonBuilder().setCustomId('ban_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.reply({ embeds: [confirmEmbed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 30000, max: 1 });

      coll.on('collect', async i => {
        if (i.customId === 'ban_yes') {
          const loadEmbed = new EmbedBuilder().setColor('#EB459E').setAuthor({ name: 'Wild Wolf \u2502 Processing', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_LOADING} **Mass banning ${validTargets.length} users...**\n${SEP}`).setTimestamp();
          await i.update({ embeds: [loadEmbed], components: [] });

          let successCount = 0;
          let failCount = 0;

          for (const target of validTargets) {
            try {
              await target.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_ERROR} **You have been banned from ${message.guild.name}**\n\n${EMOJI_DOT} **Reason:** ${reason}\n${EMOJI_DOT} **Moderator:** ${message.author.tag}\n${SEP}`).setTimestamp()] }).catch(() => { });
              await target.ban({ reason, deleteMessageSeconds: 604800 });
              successCount++;
            } catch (err) {
              failCount++;
            }
          }

          const successEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setAuthor({ name: 'Wild Wolf \u2502 Mass Ban Executed', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Mass ban action completed.**\n${SEP}`)
            .addFields(
              { name: '\u25B8 Success', value: `\`${successCount}\` users`, inline: true },
              { name: '\u25B8 Failed', value: `\`${failCount}\` users`, inline: true },
              { name: '\u25B8 Reason', value: reason }
            )
            .setFooter({ text: 'Wild Wolf \u2022 Moderation Log', iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();
          await sent.edit({ embeds: [successEmbed] });
        } else {
          await i.update({ embeds: [new EmbedBuilder().setColor('#2B2D31').setAuthor({ name: 'Wild Wolf \u2502 Cancelled', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} **Mass ban action cancelled.**\n${SEP}`).setTimestamp()], components: [] });
          setTimeout(() => sent.delete().catch(() => { }), 5000);
        }
      });

      coll.on('end', c => {
        if (c.size === 0) sent.edit({ embeds: [new EmbedBuilder().setColor('#2B2D31').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} **Mass ban confirmation timed out.**\n${SEP}`).setTimestamp()], components: [] }).catch(() => { });
      });
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
