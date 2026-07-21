const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } = require('discord.js');
const { EMOJI_DOT, FOOTER_TEXT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'botinfo',
  aliases: ['bi', 'about'],
  description: 'Display bot information',
  usage: 'botinfo',
  cooldown: 5,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Display bot information'),
  devOnly: false,
  execute: async (client, message) => {
    try {
      const mem = process.memoryUsage();
      const up = process.uptime();
      const totalMembers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Bot Dashboard`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_DOT} **Bot:** ${client.user.tag}\n` +
          `${EMOJI_DOT} **ID:** \`${client.user.id}\`\n` +
          `${EMOJI_DOT} **Created:** <t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `**Performance**\n` +
          `Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB\n` +
          `RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB\n` +
          `Uptime: ${Math.floor(up/3600)}h ${Math.floor((up%3600)/60)}m\n` +
          `WS Ping: ${client.ws.ping}ms`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `Guilds: ${client.guilds.cache.size}\n` +
          `Users: ${totalMembers}\n` +
          `Channels: ${client.channels.cache.size}`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Support Server').setStyle(ButtonStyle.Link).setURL(client.config.supportServer)
      );

      message.reply({ components: [container, row], flags: 32768 }).catch(() => {});
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
