const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_ERROR, FOOTER_TEXT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'end',
  description: 'End a running game in the current channel',
  usage: 'end',
  cooldown: 5,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('end')
    .setDescription('End a running game in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  execute: async (client, message) => {
    try {
      const isInteraction = !message.author;
      const channelId = message.channel.id;
      const user = isInteraction ? message.user : message.author;
      const game = client.activeGames.get(channelId);

      if (!game) {
        return message.reply({ components: [cv2Error('There is no active game running in this channel.')], flags: MessageFlags.IsComponentsV2, ephemeral: true }).catch(() => { });
      }

      // Check Permissions
      const isStarter = user.id === game.starterId;
      const isOwner = message.guild?.ownerId === user.id;
      const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator) || false;
      const devIds = (process.env.DEV_ID || '').split(',');
      const isDev = devIds.includes(user.id);

      if (isStarter || isOwner || isAdmin || isDev) {
        game.collector.stop('cancelled');
        
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Game Ended`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} The game has been ended by ${user}.`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
      } else {
        return message.reply({ components: [cv2Error('You do not have permission to end this game. Only the starter, an admin, or the owner can do this.')], flags: MessageFlags.IsComponentsV2, ephemeral: true }).catch(() => { });
      }

    } catch (error) {
      console.error(error);
      message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
    }
  }
};
