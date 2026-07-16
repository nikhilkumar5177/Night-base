const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getConfig } = require('../../automod/database');
const { syncNativeRules } = require('../../automod/utils/nativeSync');
const { cv2Error } = require('../../utils/messageHelper');
const { EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_INFO, SEP } = require('../../utils/constants');

module.exports = {
  name: 'automodrule',
  description: 'Sync custom AutoMod filters with Discord native AutoMod system',
  category: 'security',
  slash: true,
  data: new SlashCommandBuilder()
    .setName('automodrule')
    .setDescription('Manage native Discord AutoMod rules')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('sync')
        .setDescription('Sync current custom filters to Discord native AutoMod rules')
        .addStringOption(opt => opt.setName('guilds').setDescription('The guild to sync (Optional)').setRequired(false).setAutocomplete(true))
    ),
  devOnly: true,
  execute: async (client, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const targetGuildId = interaction.options.getString('guilds') || interaction.guildId;

      if (targetGuildId === 'all') {
        const guilds = client.guilds.cache;
        let successCount = 0;
        let failCount = 0;
        let totalRulesSynced = 0;

        for (const [id, guild] of guilds) {
          const config = await getConfig(id);
          const result = await syncNativeRules(guild, config, true);
          if (result.success) {
            successCount++;
            totalRulesSynced += (result.syncedCount || 0);
          } else {
            failCount++;
          }
        }

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Global AutoMod Sync`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **Global synchronization complete!**\n\n` +
            `${EMOJI_INFO} **Servers Synced:** \`${successCount}\`\n` +
            `${EMOJI_INFO} **Total Rules Created:** \`${totalRulesSynced}\`\n` +
            `${EMOJI_ERROR} **Failed Servers:** \`${failCount}\` (Check permissions)`
          ));
        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const targetGuild = client.guilds.cache.get(targetGuildId);

      if (!targetGuild) {
        return interaction.editReply({ components: [cv2Error(`Could not find a guild with ID \`${targetGuildId}\`. Ensure the bot is in that server.`)], flags: MessageFlags.IsComponentsV2 });
      }

      const config = await getConfig(targetGuildId);
      const result = await syncNativeRules(targetGuild, config, true);

      if (result.success) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Native AutoMod Sync`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **Successfully synchronized filters!**\n\n` +
            `${EMOJI_INFO} **Rules Created/Updated:** \`${result.syncedCount}\``
          ));
        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Sync Failed`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_ERROR} **Failed to sync rules:**\n\`${result.error}\`\n\n` +
            `Ensure the bot has **Manage Guild** permission and that you haven't reached the Discord rule limit (10 rules per server).`
          ));
        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (error) {
      console.error('AutoModRule Command Error:', error);
      return interaction.editReply({ content: `${EMOJI_ERROR} An unexpected error occurred.` }).catch(() => { });
    }
  }
};
