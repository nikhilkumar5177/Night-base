const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { EMOJI_DOT, EMOJI_WARN, FOOTER_TEXT } = require('../../utils/constants');
const { cv2Error, cv2Expire } = require('../../utils/messageHelper');

module.exports = {
  name: 'banner',
  aliases: ['bn'],
  description: 'View user banner',
  usage: 'banner [@user]',
  cooldown: 3,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('View user banner')
    .addUserOption(opt => opt.setName('user').setDescription('The user to view banner of').setRequired(false)),
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      let user = !message.author
        ? (message.options.getUser('user') || message.user)
        : (message.mentions.users.first() || client.users.cache.get(args[0]) || message.author);
      
      user = await user.fetch(true);
      const bannerUrl = user.bannerURL({ dynamic: true, size: 1024 });
      if (!bannerUrl) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Banner`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **${user.tag}** does not have a banner.`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Banner Viewer`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **User:** ${user.username}\n` +
          `${EMOJI_DOT} **Type:** \`User Banner\``
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bannerUrl)))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      const formatRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('PNG').setStyle(ButtonStyle.Link).setURL(user.bannerURL({ extension: 'png', size: 1024 })),
        new ButtonBuilder().setLabel('JPG').setStyle(ButtonStyle.Link).setURL(user.bannerURL({ extension: 'jpg', size: 1024 })),
        new ButtonBuilder().setLabel('WEBP').setStyle(ButtonStyle.Link).setURL(user.bannerURL({ extension: 'webp', size: 1024 }))
      );

      if (user.banner?.startsWith('a_')) {
        formatRow.addComponents(new ButtonBuilder().setLabel('GIF').setStyle(ButtonStyle.Link).setURL(user.bannerURL({ extension: 'gif', size: 1024 })));
      }

      message.reply({ components: [container, formatRow], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
