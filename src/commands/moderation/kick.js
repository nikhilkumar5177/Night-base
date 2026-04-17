const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
const DOT = '\u25AA';

module.exports = {
  name: 'kick',
  aliases: ['k'],
  description: 'Kick a user with button confirmation',
  usage: 'kick <user> [reason]',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('KickMembers')) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} You need **KickMembers** permission.').setTimestamp()] });
      }
      if (!message.guild.members.me.permissions.has('KickMembers')) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} I need **KickMembers** permission.').setTimestamp()] });
      }
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
      if (!target) {
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}kick <@user> [reason]\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}kick @User breaking rules\n\`\`\`` }, { name: 'Aliases', value: '`k`', inline: true }, { name: 'Cooldown', value: '`5s`', inline: true }, { name: 'Permission', value: '`KickMembers`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.channel.send({ embeds: [usageEmbed] });
      }
      if (!target.kickable) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} I cannot kick this user. Check role hierarchy.').setTimestamp()] });
      }
      if (target.roles.highest.position >= message.member.roles.highest.position) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} Target has equal or higher role than you.').setTimestamp()] });
      }

      const reason = args.slice(1).join(' ') || 'No reason provided';
      const confirmEmbed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setAuthor({ name: 'Wild Wolf \u2502 Kick Confirmation', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `${SEP}\n` +
          `{EMOJI_WARN} **Are you sure you want to kick this user?**\n` +
          `${SEP}\n\n` +
          `${DOT} **Target:** ${target.user.tag}\n` +
          `${DOT} **ID:** \`${target.id}\`\n` +
          `${DOT} **Reason:** ${reason}\n` +
          `${DOT} **Moderator:** ${message.author.tag}`
        )
        .setFooter({ text: 'Wild Wolf \u2022 This action is irreversible' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kick_yes').setLabel('Confirm Kick').setStyle(ButtonStyle.Danger).setEmoji('\u2714'),
        new ButtonBuilder().setCustomId('kick_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.channel.send({ embeds: [confirmEmbed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 30000, max: 1 });

      coll.on('collect', async i => {
        if (i.customId === 'kick_yes') {
          const loadEmbed = new EmbedBuilder()
            .setColor('#EB459E')
            .setAuthor({ name: 'Wild Wolf \u2502 Processing', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n{EMOJI_LOADING} **Kicking ${target.user.tag}...**\n${SEP}`)
            .setTimestamp();
          await i.update({ embeds: [loadEmbed], components: [] });

          await target.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_ERROR} **You have been kicked from ${message.guild.name}**\n\n${DOT} **Reason:** ${reason}\n${DOT} **Moderator:** ${message.author.tag}\n${SEP}`).setTimestamp()] }).catch(() => {});
          await target.kick(reason);

          const successEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setAuthor({ name: 'Wild Wolf \u2502 Kick Executed', iconURL: client.user.displayAvatarURL() })
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`${SEP}\n{EMOJI_SUCCESS} **User has been kicked successfully.**\n${SEP}`)
            .addFields(
              { name: '\u25B8 User', value: `\`${target.user.tag}\``, inline: true },
              { name: '\u25B8 Moderator', value: `\`${message.author.tag}\``, inline: true },
              { name: '\u25B8 Reason', value: reason }
            )
            .setFooter({ text: 'Wild Wolf \u2022 Moderation Log', iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();
          await sent.edit({ embeds: [successEmbed] });
        } else {
          const cancelEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setAuthor({ name: 'Wild Wolf \u2502 Cancelled', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n{EMOJI_WARN} **Kick action cancelled.**\n${SEP}`)
            .setTimestamp();
          await i.update({ embeds: [cancelEmbed], components: [] });
          setTimeout(() => sent.delete().catch(() => {}), 5000);
        }
      });

      coll.on('end', (c) => {
        if (c.size === 0) {
          sent.edit({ embeds: [new EmbedBuilder().setColor('#2B2D31').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} **Kick confirmation timed out.**\n${SEP}`).setTimestamp()], components: [] }).catch(() => {});
        }
      });
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
