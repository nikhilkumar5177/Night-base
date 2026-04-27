const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { EMOJI_DOT } = require('../../utils/constants');
const { cv2Error, cv2Expire } = require('../../utils/messageHelper');

module.exports = {
  name: 'avatar',
  aliases: ['av', 'pfp'],
  description: 'View user avatar with format options',
  usage: 'avatar [@user]',
  cooldown: 3,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('View user avatar with format options')
    .addUserOption(opt => opt.setName('user').setDescription('The user to view avatar of').setRequired(false)),
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const resolver = require('../../utils/resolver');
      const target = !message.author
        ? (message.options.getMember('user') || message.member)
        : (await resolver.resolveMember(message.guild, args[0]) || message.member);
      const user = target.user;
      
      const globalAv = user.displayAvatarURL({ dynamic: true, size: 1024 });
      const serverAv = target?.displayAvatarURL({ dynamic: true, size: 1024 });
      const hasServerAv = serverAv && serverAv !== globalAv;

      const buildContainer = (url, label) => {
        return new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 ${label}`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_DOT} **User:** ${user.username}\n` +
            `${EMOJI_DOT} **Type:** \`${label}\``
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addMediaGalleryComponents(new MediaGalleryBuilder().addMedia(new MediaBuilder().setURL(url)))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
      };

      const formatRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('PNG').setStyle(ButtonStyle.Link).setURL(user.displayAvatarURL({ extension: 'png', size: 1024 })),
        new ButtonBuilder().setLabel('JPG').setStyle(ButtonStyle.Link).setURL(user.displayAvatarURL({ extension: 'jpg', size: 1024 })),
        new ButtonBuilder().setLabel('WEBP').setStyle(ButtonStyle.Link).setURL(user.displayAvatarURL({ extension: 'webp', size: 1024 }))
      );

      if (user.avatar?.startsWith('a_')) {
        formatRow.addComponents(new ButtonBuilder().setLabel('GIF').setStyle(ButtonStyle.Link).setURL(user.displayAvatarURL({ extension: 'gif', size: 1024 })));
      }

      const components = [formatRow];

      if (hasServerAv) {
        const toggleRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('av_global').setLabel('Global').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('av_server').setLabel('Server').setStyle(ButtonStyle.Primary)
        );
        components.unshift(toggleRow);
      }

      const sent = await message.reply({ components: [buildContainer(globalAv, 'Global Avatar'), ...components], flags: 32768 }).catch(() => {});
      if (!sent || !hasServerAv) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === (message.author?.id || message.user.id), time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'av_global') await i.update({ components: [buildContainer(globalAv, 'Global Avatar'), ...components] });
        if (i.customId === 'av_server') await i.update({ components: [buildContainer(serverAv, 'Server Avatar'), ...components] });
      });
      coll.on('end', () => sent.edit({ components: [cv2Expire()] }).catch(() => {}));
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
