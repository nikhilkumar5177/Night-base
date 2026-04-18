const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { resolveMember } = require('../../utils/resolver');

const { resolveEmbedEmojis, EMOJIS } = require('../../utils/constants');

const EMOJI_DOT = EMOJIS.EMOJI_DOT;
const EMOJI_ARROW = EMOJIS.EMOJI_ARROW;

module.exports = {
  name: 'userinfo',
  aliases: ['ui', 'whois'],
  description: 'Display user information',
  usage: 'userinfo [@user/id]',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const target = await resolveMember(message.guild, args[0]) || message.member;
      const u = target.user;
      const flags = u.flags?.toArray().map(f => `\`${f}\``).join(', ') || 'None';
      const roles = target.roles.cache.sort((a, b) => b.position - a.position).filter(r => r.id !== message.guild.id);
      const roleList = roles.size > 0 ? roles.map(r => `${r}`).join(', ') : 'None';
      const truncRoles = roleList.length > 900 ? roleList.substring(0, 900) + '...' : roleList;
      const status = target.presence?.status || 'offline';
      const statusMap = { online: '\u25CF Online', idle: '\u25CB Idle', dnd: '\u25CF DND', offline: '\u25CB Offline' };
      const isOwner = u.id === message.guild.ownerId;
      const isBot = u.bot;
      let tags = [];
      if (isOwner) tags.push('\`\uD83D\uDC51 Owner\`');
      if (isBot) tags.push('\`\uD83E\uDD16 Bot\`');
      if (target.premiumSinceTimestamp) tags.push('\`\uD83D\uDC8E Booster\`');

      const embed = new EmbedBuilder()
        .setColor(target.displayHexColor !== '#000000' ? target.displayHexColor : '#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 User Profile', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(u.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription(
          `${SEP}\n` +
          `${EMOJI_DOT} **User:** ${u.tag} ${tags.length ? tags.join(' ') : ''}\n` +
          `${EMOJI_DOT} **ID:** \`${u.id}\`\n` +
          `${EMOJI_DOT} **Status:** ${statusMap[status] || '\u25CB Offline'}\n` +
          `${SEP}`
        )
        .addFields(
          { name: `${EMOJI_ARROW} Account Created`, value: `<t:${Math.floor(u.createdTimestamp / 1000)}:F>\n<t:${Math.floor(u.createdTimestamp / 1000)}:R>`, inline: true },
          { name: `${EMOJI_ARROW} Joined Server`, value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:F>\n<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
          { name: `${EMOJI_ARROW} Nickname`, value: target.nickname || 'None', inline: true },
          { name: `${EMOJI_ARROW} Highest Role`, value: `${target.roles.highest}`, inline: true },
          { name: `${EMOJI_ARROW} Display Color`, value: `\`${target.displayHexColor}\``, inline: true },
          { name: `${EMOJI_ARROW} Badges`, value: flags, inline: true },
          { name: `${EMOJI_ARROW} Roles [${roles.size}]`, value: truncRoles }
        )
        .setFooter({ text: 'Wild Wolf \u2022 User Analytics', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ui_avatar').setLabel('Avatar').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ui_banner').setLabel('Banner').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ui_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.channel.send({ embeds: [embed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'ui_del') { await sent.delete().catch(() => {}); coll.stop(); return; }
        if (i.customId === 'ui_avatar') {
          const avEmbed = new EmbedBuilder()
            .setColor(target.displayHexColor !== '#000000' ? target.displayHexColor : '#5865F2')
            .setAuthor({ name: `${u.tag} \u2502 Avatar`, iconURL: client.user.displayAvatarURL() })
            .setImage(u.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: 'Wild Wolf' }).setTimestamp();
          const bk = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ui_back').setLabel('Back').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel('Download').setStyle(ButtonStyle.Link).setURL(u.displayAvatarURL({ dynamic: true, size: 1024 })),
            new ButtonBuilder().setCustomId('ui_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
          );
          await i.update({ embeds: [avEmbed], components: [bk] });
        }
        if (i.customId === 'ui_banner') {
          await u.fetch(true).catch(() => {});
          const bannerUrl = u.bannerURL({ dynamic: true, size: 1024 });
          if (!bannerUrl) {
            await i.reply({ content: '{EMOJI_WARN} This user has no banner.', ephemeral: true });
            return;
          }
          const bnEmbed = new EmbedBuilder()
            .setColor(target.displayHexColor !== '#000000' ? target.displayHexColor : '#5865F2')
            .setAuthor({ name: `${u.tag} \u2502 Banner`, iconURL: client.user.displayAvatarURL() })
            .setImage(bannerUrl)
            .setFooter({ text: 'Wild Wolf' }).setTimestamp();
          const bk = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ui_back').setLabel('Back').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel('Download').setStyle(ButtonStyle.Link).setURL(bannerUrl),
            new ButtonBuilder().setCustomId('ui_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
          );
          await i.update({ embeds: [bnEmbed], components: [bk] });
        }
        if (i.customId === 'ui_back') {
          await i.update({ embeds: [embed], components: [row] });
        }
      });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
