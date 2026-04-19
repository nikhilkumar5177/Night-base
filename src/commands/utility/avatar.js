const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { SEP } = require('../../utils/constants');

const DOT = '\u25AA';

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
    const isInteraction = !message.author;
    try {
      const resolver = require('../../utils/resolver');
      const target = isInteraction 
        ? (message.options.getMember('user') || message.member)
        : (await resolver.resolveMember(message.guild, args[0]) || message.member);
      const user = target.user;
      
      const member = target;
      const globalAv = user.displayAvatarURL({ dynamic: true, size: 1024 });
      const serverAv = member?.displayAvatarURL({ dynamic: true, size: 1024 });
      const hasServerAv = serverAv && serverAv !== globalAv;

      const buildEmbed = (url, label) => new EmbedBuilder()
        .setColor(member?.displayHexColor !== '#000000' ? member?.displayHexColor : '#5865F2')
        .setAuthor({ name: `Wild Wolf \u2502 ${label}`, iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${DOT} **User:** ${user.tag}\n${DOT} **Type:** \`${label}\`\n${SEP}`)
        .setImage(url)
        .setFooter({ text: 'Wild Wolf \u2022 Avatar Viewer', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const buttons = [
        new ButtonBuilder().setLabel('PNG').setStyle(ButtonStyle.Link).setURL(user.displayAvatarURL({ extension: 'png', size: 1024 })),
        new ButtonBuilder().setLabel('JPG').setStyle(ButtonStyle.Link).setURL(user.displayAvatarURL({ extension: 'jpg', size: 1024 })),
        new ButtonBuilder().setLabel('WEBP').setStyle(ButtonStyle.Link).setURL(user.displayAvatarURL({ extension: 'webp', size: 1024 }))
      ];
      if (user.avatar?.startsWith('a_')) {
        buttons.push(new ButtonBuilder().setLabel('GIF').setStyle(ButtonStyle.Link).setURL(user.displayAvatarURL({ extension: 'gif', size: 1024 })));
      }

      const components = [new ActionRowBuilder().addComponents(...buttons)];

      if (hasServerAv) {
        const toggleRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('av_global').setLabel('Global Avatar').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('av_server').setLabel('Server Avatar').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('av_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
        );
        components.push(toggleRow);
      } else {
        components.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('av_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
        ));
      }

      const sent = await message.reply({ embeds: [buildEmbed(globalAv, 'Global Avatar')], components });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === (isInteraction ? message.user.id : message.author.id), time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'av_del') { await sent.delete().catch(() => {}); coll.stop(); return; }
        if (i.customId === 'av_global') await i.update({ embeds: [buildEmbed(globalAv, 'Global Avatar')] });
        if (i.customId === 'av_server') await i.update({ embeds: [buildEmbed(serverAv, 'Server Avatar')] });
      });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
