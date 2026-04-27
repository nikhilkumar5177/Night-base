const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder, MediaGalleryBuilder, MediaBuilder } = require('discord.js');
const { resolveMember } = require('../../utils/resolver');
const { EMOJI_DOT, EMOJI_ARROW, EMOJI_WARN, FOOTER_TEXT } = require('../../utils/constants');
const { cv2Error, cv2Expire } = require('../../utils/messageHelper');

module.exports = {
  name: 'userinfo',
  aliases: ['ui', 'whois'],
  description: 'Display user information',
  usage: 'userinfo [@user/id]',
  cooldown: 3,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display user information')
    .addUserOption(opt => opt.setName('user').setDescription('The user to get info for').setRequired(false)),
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const target = !message.author
        ? (message.options.getMember('user') || message.member)
        : (await resolveMember(message.guild, args[0]) || message.member);
      const u = target.user;
      const flags = u.flags?.toArray().map(f => `\`${f}\``).join(', ') || 'None';
      const roles = target.roles.cache.sort((a, b) => b.position - a.position).filter(r => r.id !== message.guild.id);
      const roleList = roles.size > 0 ? roles.map(r => `${r}`).join(', ') : 'None';
      const truncRoles = roleList.length > 900 ? roleList.substring(0, 900) + '...' : roleList;
      const statusMap = { online: '\u25CF Online', idle: '\u25CB Idle', dnd: '\u25CF DND', offline: '\u25CB Offline' };
      const status = target.presence?.status || 'offline';
      
      let tags = [];
      if (u.id === message.guild.ownerId) tags.push('\`\uD83D\uDC51 Owner\`');
      if (u.bot) tags.push('\`\uD83E\uDD16 Bot\`');
      if (target.premiumSinceTimestamp) tags.push('\`\uD83D\uDC8E Booster\`');

      const buildProfileContainer = () => {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 User Profile`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_DOT} **User:** ${u.tag} ${tags.length ? tags.join(' ') : ''}\n` +
            `${EMOJI_DOT} **ID:** \`${u.id}\`\n` +
            `${EMOJI_DOT} **Status:** ${statusMap[status] || '\u25CB Offline'}`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_ARROW} **Account Dates**\n` +
            `Created: <t:${Math.floor(u.createdTimestamp / 1000)}:R>\n` +
            `Joined: <t:${Math.floor(target.joinedTimestamp / 1000)}:R>`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_ARROW} **Server Info**\n` +
            `Nickname: ${target.nickname || 'None'}\n` +
            `Highest Role: ${target.roles.highest}\n` +
            `Roles [${roles.size}]: ${truncRoles}`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_ARROW} **Badges:** ${flags}`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

        container.addActionRowComponents(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ui_avatar').setLabel('View Avatar').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('ui_banner').setLabel('View Banner').setStyle(ButtonStyle.Primary)
        ));
        return container;
      };

      const sent = await message.reply({ components: [buildProfileContainer()], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      if (!sent) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === (message.author?.id || message.user.id), time: 120000 });
      
      coll.on('collect', async i => {
        if (i.customId === 'ui_back') {
          return i.update({ components: [buildProfileContainer()] });
        }
        
        if (i.customId === 'ui_avatar') {
          const avUrl = u.displayAvatarURL({ dynamic: true, size: 1024 });
          const avContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Avatar`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `${EMOJI_DOT} **User:** ${u.username}\n` +
              `${EMOJI_DOT} **Type:** \`Global Avatar\``
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addMediaGalleryComponents(new MediaGalleryBuilder().addMedia(new MediaBuilder().setURL(avUrl)))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
          
          avContainer.addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ui_back').setLabel('Back').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setLabel('Download').setStyle(ButtonStyle.Link).setURL(avUrl)
          ));
          return i.update({ components: [avContainer] });
        }

        if (i.customId === 'ui_banner') {
          await u.fetch(true).catch(() => {});
          const bannerUrl = u.bannerURL({ dynamic: true, size: 1024 });
          if (!bannerUrl) {
            return i.reply({ content: `${EMOJI_WARN} This user has no banner.`, ephemeral: true }).catch(() => {});
          }
          const bnContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Banner`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `${EMOJI_DOT} **User:** ${u.username}\n` +
              `${EMOJI_DOT} **Type:** \`User Banner\``
            ))
            .addSeparatorComponents(new SeparatorBuilder())
            .addMediaGalleryComponents(new MediaGalleryBuilder().addMedia(new MediaBuilder().setURL(bannerUrl)))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
          
          bnContainer.addActionRowComponents(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ui_back').setLabel('Back').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setLabel('Download').setStyle(ButtonStyle.Link).setURL(bannerUrl)
          ));
          return i.update({ components: [bnContainer] });
        }
      });

      coll.on('end', () => sent.edit({ components: [cv2Expire()] }).catch(() => {}));
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
  }
};
