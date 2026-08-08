const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const storage = require('../../utils/storageManager');
const { joinRandomVC, leaveVC, joinSpecificVC } = require('../../utils/vcJoiner');
const { EMOJI_SUCCESS, EMOJI_ARROW, EMOJI_DOT } = require('../../utils/constants');
const { cv2Error, safeReply, safeUpdate, safeEdit } = require('../../utils/messageHelper');

function buildDashboard(guild, guildConfig) {
  let blacklistStr = guildConfig.blacklistedCategories.length > 0 
    ? guildConfig.blacklistedCategories.map(id => `\`${id}\``).join(', ') 
    : 'None';
  
  let currentCh = 'None';
  if (guildConfig.currentChannelId) {
    const ch = guild.channels.cache.get(guildConfig.currentChannelId);
    currentCh = ch ? ch.name : guildConfig.currentChannelId;
  }

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} VC Joiner Dashboard`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_DOT} **Status:** ${guildConfig.enabled ? '\`● Enabled\`' : '\`○ Disabled\`'}\n` +
      `${EMOJI_DOT} **Current VC:** \`${currentCh}\`\n` +
      `${EMOJI_DOT} **Blacklisted IDs:** ${blacklistStr}`
    ));

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vj_toggle').setLabel(guildConfig.enabled ? 'Disable Auto-Join' : 'Enable Auto-Join').setStyle(guildConfig.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder().setCustomId('vj_join_chan').setPlaceholder('Select VC to Join').addChannelTypes(ChannelType.GuildVoice)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder().setCustomId('vj_add_bl_chan').setPlaceholder('Select VC/Category to Blacklist').addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildCategory)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder().setCustomId('vj_rem_bl_chan').setPlaceholder('Select VC/Category to Un-Blacklist').addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildCategory)
  );

  container.addActionRowComponents(row1, row2, row3, row4);
  return container;
}

module.exports = {
  name: 'vcjoiner',
  aliases: ['vcj', 'joiner'],
  description: 'Manage the automatic voice channel joiner via interactive dashboard',
  usage: 'vcjoiner',
  cooldown: 5,
  enabled: true,
  devOnly: false,
  execute: async (client, target, args) => {
    try {
      const authorId = target.author ? target.author.id : target.user.id;
      const guild = target.guild;

      const isOwner = authorId === guild.ownerId;
      const isDev = client.devIds ? client.devIds.has(authorId) : authorId === process.env.DEV_ID;

      if (!isOwner && !isDev) {
        return safeReply(target, { components: [cv2Error('Only the server owner or devs can configure VC Joiner.')], ephemeral: true });
      }

      let vcData = storage.read('vcjoiner.json');
      if (!vcData[guild.id]) {
        vcData[guild.id] = {
          enabled: false,
          blacklistedCategories: [],
          currentChannelId: null,
          lastJoined: 0
        };
      }

      const guildConfig = vcData[guild.id];
      const isInteraction = !!target.customId || !!target.isCommand;

      if (isInteraction && target.isMessageComponent && target.isMessageComponent()) {
        const customId = target.customId;

        if (customId === 'vj_toggle') {
          await target.deferUpdate();
          guildConfig.enabled = !guildConfig.enabled;
          storage.write('vcjoiner.json', vcData);
          
          if (guildConfig.enabled) {
            await joinRandomVC(guild);
          } else {
            leaveVC(guild);
          }
          
          // Re-read to get latest currentChannelId updated by joinRandomVC/leaveVC
          vcData = storage.read('vcjoiner.json');
          return safeEdit(target, { components: [buildDashboard(guild, vcData[guild.id])] });
        }
      }

      if (isInteraction && target.isChannelSelectMenu && target.isChannelSelectMenu()) {
        const customId = target.customId;

        if (customId === 'vj_join_chan') {
          await target.deferUpdate();
          const chId = target.values[0];
          const channel = guild.channels.cache.get(chId);
          
          if (!channel || !channel.isVoiceBased()) {
            return safeReply(target, { components: [cv2Error('Invalid Voice Channel ID.')], ephemeral: true });
          }

          guildConfig.enabled = true;
          storage.write('vcjoiner.json', vcData);
          await joinSpecificVC(channel);
          
          vcData = storage.read('vcjoiner.json');
          return safeEdit(target, { components: [buildDashboard(guild, vcData[guild.id])] });
        }

        if (customId === 'vj_add_bl_chan' || customId === 'vj_rem_bl_chan') {
          const isAdd = customId === 'vj_add_bl_chan';
          const targetId = target.values[0];

          if (isAdd) {
            if (!guildConfig.blacklistedCategories.includes(targetId)) {
              guildConfig.blacklistedCategories.push(targetId);
            }
          } else {
            guildConfig.blacklistedCategories = guildConfig.blacklistedCategories.filter(id => id !== targetId);
          }
          
          storage.write('vcjoiner.json', vcData);
          return safeUpdate(target, { components: [buildDashboard(guild, guildConfig)] });
        }
      }

      // Initial Command Invocation
      if (!isInteraction || (isInteraction && target.isCommand && target.isCommand())) {
        const container = buildDashboard(guild, guildConfig);
        if (target.reply) {
          return safeReply(target, { components: [container] }).catch(() => {});
        }
      }

    } catch (error) {
      safeReply(target, { components: [cv2Error(error.message)], ephemeral: true }).catch(() => {});
    }
  }
};
