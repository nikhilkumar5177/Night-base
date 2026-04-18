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
        const usageEmbed = new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}kick <@user(s)> [reason]\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}kick @User1 @User2 breaking rules\n\`\`\`` }, { name: 'Aliases', value: '`k`', inline: true }, { name: 'Cooldown', value: '`5s`', inline: true }, { name: 'Permission', value: '`KickMembers`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp();
        return message.channel.send({ embeds: [usageEmbed] });
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
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} I cannot kick any of the specified users (higher roles or unkickable).\n**Invalid:** ${invalidTargets.join(', ')}`).setTimestamp()] });
      }

      const confirmEmbed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setAuthor({ name: 'Wild Wolf \u2502 Mass Kick Confirmation', iconURL: client.user.displayAvatarURL() })
        .setDescription(
          `${SEP}\n` +
          `{EMOJI_WARN} **Are you sure you want to kick ${validTargets.length} user(s)?**\n` +
          `${SEP}\n\n` +
          `${DOT} **Targets:** ${validTargets.map(t => `\`${t.user.tag}\``).join(', ')}\n` +
          `${DOT} **Reason:** ${reason}\n` +
          `${DOT} **Moderator:** ${message.author.tag}`
        )
        .setFooter({ text: 'Wild Wolf \u2022 This action is irreversible' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kick_yes').setLabel(`Confirm Kick (${validTargets.length})`).setStyle(ButtonStyle.Danger).setEmoji('\u2714'),
        new ButtonBuilder().setCustomId('kick_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.channel.send({ embeds: [confirmEmbed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 30000, max: 1 });

      coll.on('collect', async i => {
        if (i.customId === 'kick_yes') {
          const loadEmbed = new EmbedBuilder()
            .setColor('#EB459E')
            .setAuthor({ name: 'Wild Wolf \u2502 Processing', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n{EMOJI_LOADING} **Mass kicking ${validTargets.length} users...**\n${SEP}`)
            .setTimestamp();
          await i.update({ embeds: [loadEmbed], components: [] });

          let successCount = 0;
          let failCount = 0;

          for (const target of validTargets) {
            try {
              await target.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_ERROR} **You have been kicked from ${message.guild.name}**\n\n${DOT} **Reason:** ${reason}\n${DOT} **Moderator:** ${message.author.tag}\n${SEP}`).setTimestamp()] }).catch(() => {});
              await target.kick(reason);
              successCount++;
            } catch (err) {
              failCount++;
            }
          }

          const successEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setAuthor({ name: 'Wild Wolf \u2502 Mass Kick Executed', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Mass kick action completed.**\n${SEP}`)
            .addFields(
              { name: '\u25B8 Success', value: `\`${successCount}\` users`, inline: true },
              { name: '\u25B8 Failed', value: `\`${failCount}\` users`, inline: true },
              { name: '\u25B8 Reason', value: reason }
            )
            .setFooter({ text: 'Wild Wolf \u2022 Moderation Log', iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();
          await sent.edit({ embeds: [successEmbed] });
        } else {
          const cancelEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setAuthor({ name: 'Wild Wolf \u2502 Cancelled', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n{EMOJI_WARN} **Mass kick action cancelled.**\n${SEP}`)
            .setTimestamp();
          await i.update({ embeds: [cancelEmbed], components: [] });
          setTimeout(() => sent.delete().catch(() => {}), 5000);
        }
      });

      coll.on('end', (c) => {
        if (c.size === 0) {
          sent.edit({ embeds: [new EmbedBuilder().setColor('#2B2D31').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} **Mass kick confirmation timed out.**\n${SEP}`).setTimestamp()], components: [] }).catch(() => {});
        }
      });
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
