const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { syncDMs } = require('../../utils/dmFormManager');
const { EMOJI_SUCCESS, EMOJI_LOADING, EMOJI_DOT, FOOTER_TEXT } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'dmsync',
  aliases: ['syncdms', 'formsync'],
  description: 'Retroactively sync existing DM history to the Forms channel',
  usage: 'dmsync',
  cooldown: 60,
  enabled: true,
  devOnly: true,
  execute: async (client, message, args) => {
    try {
      const loadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Starting DM History Sync...**\nThis may take a moment depending on the user cache.`));
      
      const status = await message.reply({ components: [loadContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});

      const syncedCount = await syncDMs(client);

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Sync Completed`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **History synchronization finished.**\n` +
          `${EMOJI_DOT} **Users Synced:** \`${syncedCount}\`\n` +
          `${EMOJI_DOT} **Action:** Created threads and logged recent messages.`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      if (status) {
        await status.edit({ components: [successContainer] }).catch(() => {});
      } else {
        await message.channel.send({ components: [successContainer] }).catch(() => {});
      }
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
  }
};
