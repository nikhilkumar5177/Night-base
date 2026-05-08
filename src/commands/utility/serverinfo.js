const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { EMOJI_DOT, EMOJI_ARROW, FOOTER_TEXT } = require('../../utils/constants');
const { cv2Error, cv2Expire, safeReply, safeUpdate, sanitizeContent } = require('../../utils/messageHelper');

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
  premiumOnly: false,
  execute: async (client, message) => {
    try {
      const g = message.guild;
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

      const buildMainContainer = () => {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Server Dashboard`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**${g.name}**\n` +
            `${EMOJI_DOT} **Owner:** ${g.members.cache.get(g.ownerId)?.user.tag || `\`${g.ownerId}\``}\n` +
            `${EMOJI_DOT} **Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:R>\n` +
            `${EMOJI_DOT} **ID:** \`${g.id}\``
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_ARROW} **Members [${g.memberCount}]**\n` +
            `Humans: ${humans} \u2502 Bots: ${bots}\n` +
            `Online: ${online} \u2502 Idle: ${idle} \u2502 DND: ${dnd} \u2502 Offline: ${offline}`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_ARROW} **Channels [${g.channels.cache.size}]**\n` +
            `Text: ${tCh} \u2502 Voice: ${vCh} \u2502 Category: ${catCh}`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `Roles: ${g.roles.cache.size} \u2502 Emojis: ${g.emojis.cache.size}\n` +
            `Boosts: ${g.premiumSubscriptionCount || 0} (${boostTier})\n` +
            `Verification: ${vLevel}`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
        
        container.addActionRowComponents(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('si_roles').setLabel('View Roles').setStyle(ButtonStyle.Primary)
        ));
        return container;
      };

      const buildRolesContainer = () => {
        const roles = g.roles.cache.sort((a, b) => b.position - a.position).filter(r => r.id !== g.id).map(r => `<@&${r.id}>`).join(' ');
        const truncated = roles.length > 3900 ? roles.substring(0, 3900) + '...' : roles;
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(truncated))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
        
        container.addActionRowComponents(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('si_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
        ));
        return container;
      };

      const sent = await safeReply(message, { components: [buildMainContainer()] }).catch(() => {});
      if (!sent) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'si_roles') {
          await safeUpdate(i, { components: [buildRolesContainer()] });
        } else if (i.customId === 'si_back') {
          await safeUpdate(i, { components: [buildMainContainer()] });
        }
      });

      coll.on('end', () => sent.edit({ components: [cv2Expire()] }).catch(() => {}));
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
  }
};
