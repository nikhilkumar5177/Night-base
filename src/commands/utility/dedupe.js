const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionsBitField, MessageFlags } = require('discord.js');
const { EMOJI_ERROR, EMOJI_LOADING, EMOJI_SUCCESS, EMOJI_WARN, EMOJI_INFO, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error, cv2Expire, safeDelete } = require('../../utils/messageHelper');

module.exports = {
  name: 'dedupe',
  aliases: ['cleardupes', 'clearemojis', 'dedupeemojis'],
  description: 'Scans the server for duplicate custom emojis and removes them.',
  usage: 'dedupe',
  cooldown: 30,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
        return message.reply({ components: [cv2Error('You need **ManageGuildExpressions** permission.')], flags: 32768 });
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
        return message.reply({ components: [cv2Error('I need **ManageGuildExpressions** permission.')], flags: 32768 });
      }

      const loadContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Dedupe Emojis`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Scanning server for duplicate emojis...**`));
      const sentMsg = await message.reply({ components: [loadContainer], flags: 32768 }).catch(() => {});

      const emojis = await message.guild.emojis.fetch();

      // Group emojis by exact name
      const grouped = new Map();
      emojis.forEach(emoji => {
        if (!grouped.has(emoji.name)) grouped.set(emoji.name, []);
        grouped.get(emoji.name).push(emoji);
      });

      const emojisToDelete = [];
      let uniqueCount = 0;

      for (const [name, emojiGroup] of grouped.entries()) {
        uniqueCount++;
        if (emojiGroup.length > 1) {
          emojiGroup.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
          for (let i = 1; i < emojiGroup.length; i++) {
            emojisToDelete.push(emojiGroup[i]);
          }
        }
      }

      if (emojisToDelete.length === 0) {
        const cleanContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Dedupe Emojis`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **No duplicate emojis found!** All ${uniqueCount} emojis are unique.`));
        return sentMsg.edit({ components: [cleanContainer] });
      }

      const confirmContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Dedupe Emojis`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Found ${emojisToDelete.length} duplicate emoji(s)!**\n\nAre you sure you want to permanently delete them?`));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_dedupe').setLabel('Yes, Delete').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel_dedupe').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );
      confirmContainer.addActionRowComponents(row);

      await sentMsg.edit({ components: [confirmContainer] }).catch(() => {});

      const collector = sentMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000,
        filter: i => i.user.id === message.author.id
      });

      collector.on('collect', async i => {
        if (i.customId === 'cancel_dedupe') {
          collector.stop('cancelled');
          const cancelContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} **Deduplication cancelled.**`));
          await i.update({ components: [cancelContainer] });
        } else if (i.customId === 'confirm_dedupe') {
          collector.stop('confirmed');
          const progressContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Dedupe Emojis`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Deleting ${emojisToDelete.length} emoji(s)...**`));
          await i.update({ components: [progressContainer] });

          let deleted = 0;
          let failed = 0;

          for (const emoji of emojisToDelete) {
            try {
              await emoji.delete().catch(() => {});
              deleted++;
            } catch (err) {
              failed++;
            }
            await new Promise(r => setTimeout(r, 500));
          }

          const resultContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Dedupe Results`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `${EMOJI_SUCCESS} **Deleted ${deleted} duplicate emoji(s).**` +
              (failed > 0 ? `\n${EMOJI_ERROR} Failed to delete ${failed} emoji(s).` : '')
            ));
          await sentMsg.edit({ components: [resultContainer] }).catch(() => {});
        }
      });

      collector.on('end', (collected, reason) => {
        if (collected.size === 0) {
          return safeDelete(sentMsg);
        }
        if (reason === 'time') {
          sentMsg.edit({ components: [cv2Expire()] }).catch(() => {});
        }
      });

    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
