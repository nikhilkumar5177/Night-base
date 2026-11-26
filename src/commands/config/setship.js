const { PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const { cv2Error, safeReply } = require('../../utils/messageHelper');
const { EMOJI_SUCCESS, EMOJI_ARROW, EMOJI_DOT, FOOTER_TEXT } = require('../../utils/constants');

module.exports = {
  name: 'setship',
  description: 'Set or reset the dedicated channel for the ship command in this server',
  usage: 'setship [#channel | channel_id | reset]',
  example: 'setship #shipping\nsetship 123456789012345678\nsetship reset',
  aliases: ['shipchannel', 'setshipchannel'],
  cooldown: 3,
  enabled: true,
  userPermissions: [PermissionsBitField.Flags.ManageChannels],
  execute: async (client, message, args) => {
    try {
      const guildId = message.guild.id;
      const shipData = storage.read('shipConfig.json') || {};

      // Handle resetting the channel
      if (!args.length || args[0].toLowerCase() === 'reset' || args[0].toLowerCase() === 'disable' || args[0].toLowerCase() === 'off') {
        if (!shipData[guildId]) {
          return safeReply(message, {
            components: [
              new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Ship Channel`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_DOT} No dedicated ship channel is currently set for this server.\n${EMOJI_DOT} \`?ship\` can currently be used in **any channel**.`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`))
            ],
            flags: MessageFlags.IsComponentsV2
          });
        }

        delete shipData[guildId];
        storage.write('shipConfig.json', shipData);
        await storage.flushFile('shipConfig.json').catch(() => {});

        return safeReply(message, {
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Ship Channel Reset`))
              .addSeparatorComponents(new SeparatorBuilder())
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} The dedicated ship channel has been **removed**.\n${EMOJI_DOT} Members can now use \`?ship\` in **any channel**.`))
              .addSeparatorComponents(new SeparatorBuilder())
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`))
          ],
          flags: MessageFlags.IsComponentsV2
        });
      }

      // Resolve channel from mention or ID
      let targetChannel = null;
      if (message.mentions?.channels?.first) {
        targetChannel = message.mentions.channels.first();
      }

      if (!targetChannel && args[0]) {
        const cleanId = args[0].replace(/[<#>]/g, '').trim();
        targetChannel = message.guild.channels.cache.get(cleanId) ||
          (await message.guild.channels.fetch(cleanId).catch(() => null));
      }

      if (!targetChannel || !targetChannel.isTextBased()) {
        return safeReply(message, {
          components: [cv2Error('Please mention a valid text channel or provide a valid text channel ID.')],
          flags: MessageFlags.IsComponentsV2
        });
      }

      // Check bot permissions in target channel
      const botPerms = targetChannel.permissionsFor(message.guild.members.me);
      if (botPerms && (!botPerms.has(PermissionsBitField.Flags.ViewChannel) || !botPerms.has(PermissionsBitField.Flags.SendMessages))) {
        return safeReply(message, {
          components: [cv2Error(`I need **View Channel** and **Send Messages** permissions in ${targetChannel}.`)],
          flags: MessageFlags.IsComponentsV2
        });
      }

      // Save dedicated ship channel
      shipData[guildId] = targetChannel.id;
      storage.write('shipConfig.json', shipData);
      await storage.flushFile('shipConfig.json').catch(() => {});

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Ship Channel Configured`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} Dedicated ship channel set to ${targetChannel} (\`${targetChannel.id}\`).\n\n` +
          `${EMOJI_DOT} From now on, \`?ship\` can **only** be used in ${targetChannel}.\n` +
          `${EMOJI_DOT} To allow \`?ship\` anywhere again, run \`?setship reset\`.`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      return safeReply(message, { components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return safeReply(message, { components: [cv2Error(err.message)], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
