const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { resolveEmbedEmojis, EMOJIS, SEP } = require('../../utils/constants');

const EMOJI_DOT = EMOJIS.EMOJI_DOT;
const EMOJI_ARROW = EMOJIS.EMOJI_ARROW;

module.exports = {
  name: 'serverinfo',
  aliases: ['si', 'guild'],
  description: 'Display server information',
  usage: 'serverinfo',
  cooldown: 5,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display server information'),
  staffOnly: false,
  devOnly: false,
  execute: async (client, message) => {
    const isInteraction = !message.author;
    try {
      const g = (isInteraction ? message.guild : message.guild);
      await g.members.fetch().catch(() => {});
      const online = g.members.cache.filter(m => m.presence?.status === 'online').size;
      const idle = g.members.cache.filter(m => m.presence?.status === 'idle').size;
      const dnd = g.members.cache.filter(m => m.presence?.status === 'dnd').size;
      const offline = g.memberCount - online - idle - dnd;
      const bots = g.members.cache.filter(m => m.user.bot).size;
      const humans = g.memberCount - bots;
      const tCh = g.channels.cache.filter(c => c.type === 0).size;
      const vCh = g.channels.cache.filter(c => c.type === 2).size;
      const catCh = g.channels.cache.filter(c => c.type === 4).size;
      const boostTier = g.premiumTier ? `Level ${g.premiumTier}` : 'None';
      const vLevel = ['None', 'Low', 'Medium', 'High', 'Very High'][g.verificationLevel] || 'Unknown';

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Server Dashboard', iconURL: client.user.displayAvatarURL() })
        .setTitle(g.name)
        .setThumbnail(g.iconURL({ dynamic: true, size: 512 }))
        .setDescription(
          `${SEP}\n` +
          `${EMOJI_DOT} **Owner:** <@${g.ownerId}>\n` +
          `${EMOJI_DOT} **Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:R>\n` +
          `${EMOJI_DOT} **ID:** \`${g.id}\`\n` +
          `${SEP}`
        )
        .addFields(
          { name: `${EMOJI_ARROW} Members [${g.memberCount}]`, value: `\`\`\`\nHumans: ${humans}\nBots:   ${bots}\n\`\`\``, inline: true },
          { name: `${EMOJI_ARROW} Presence`, value: `\`\`\`\n\u25CF Online:  ${online}\n\u25CB Idle:    ${idle}\n\u25CF DND:     ${dnd}\n\u25CB Offline: ${offline}\n\`\`\``, inline: true },
          { name: '\u200b', value: '\u200b', inline: false },
          { name: `${EMOJI_ARROW} Channels [${g.channels.cache.size}]`, value: `\`\`\`\nText:     ${tCh}\nVoice:    ${vCh}\nCategory: ${catCh}\n\`\`\``, inline: true },
          { name: `${EMOJI_ARROW} Server Info`, value: `\`\`\`\nRoles:       ${g.roles.cache.size}\nEmojis:      ${g.emojis.cache.size}\nStickers:    ${g.stickers.cache.size}\nBoosts:      ${g.premiumSubscriptionCount || 0}\nBoost Tier:  ${boostTier}\nVerify:      ${vLevel}\n\`\`\``, inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Server Analytics', iconURL: g.iconURL({ dynamic: true }) })
        .setTimestamp();

      if (g.bannerURL()) embed.setImage(g.bannerURL({ size: 1024 }));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('si_roles').setLabel('View Roles').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('si_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.reply({ embeds: [embed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === (isInteraction ? message.user.id : message.author.id), time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'si_del') { await sent.delete().catch(() => {}); coll.stop(); return; }
        if (i.customId === 'si_roles') {
          const roles = g.roles.cache.sort((a, b) => b.position - a.position).filter(r => r.id !== g.id).map(r => `${r}`).join(', ');
          const truncated = roles.length > 3900 ? roles.substring(0, 3900) + '...' : roles;
          const rolesEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'Wild Wolf \u2502 Server Roles', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n${truncated}\n${SEP}`)
            .setFooter({ text: `${g.roles.cache.size} total roles` })
            .setTimestamp();
          const backRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('si_back').setLabel('Back').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('si_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
          );
          await i.update({ embeds: [rolesEmbed], components: [backRow] });
        }
        if (i.customId === 'si_back') {
          await i.update({ embeds: [embed], components: [row] });
        }
      });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
