const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_INFO, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error, safeReply, safeUpdate } = require('../../utils/messageHelper');

function buildDashboard(guild, vouchData) {
  const guildId = guild.id;
  const channels = vouchData[guildId]?.channels || [];
  
  let listStr = '';
  if (channels.length === 0) {
    listStr = `${EMOJI_INFO} *No vouch channels configured.*`;
  } else {
    listStr = channels.map((id, i) => {
      const ch = guild.channels.cache.get(id);
      return `**${i + 1}.** ${ch ? ch.toString() : `\`${id}\``}`;
    }).join('\n');
  }

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Vouch Setup`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listStr));

  const addRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('vs_add')
      .setPlaceholder('Add a Vouch Channel')
      .addChannelTypes(ChannelType.GuildText)
  );
  
  const rows = [addRow];

  if (channels.length > 0) {
    const removeMenu = new StringSelectMenuBuilder()
      .setCustomId('vs_remove')
      .setPlaceholder('Remove a Vouch Channel');
      
    channels.forEach(id => {
      const ch = guild.channels.cache.get(id);
      if (ch) removeMenu.addOptions({ label: `#${ch.name}`, value: id });
    });
    
    if (removeMenu.options.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(removeMenu));
    }
  }

  container.addActionRowComponents(...rows);
  return container;
}

module.exports = {
  name: 'vouchsetup',
  aliases: ['vouchchannel', 'vouchset'],
  description: 'Configure vouch channels via interactive dashboard',
  usage: 'vouchsetup',
  cooldown: 3,
  enabled: true,
  devOnly: false,
  execute: async (client, target, args) => {
    try {
      const member = target.member;
      const guild = target.guild;

      if (!member.permissions.has('ManageChannels')) {
        return safeReply(target, { components: [cv2Error('You need **ManageChannels** permission.')], ephemeral: true });
      }

      const vouchData = storage.read('vouch.json');
      const guildId = guild.id;
      if (!vouchData[guildId]) vouchData[guildId] = { channels: [] };

      const isInteraction = !!target.customId || !!target.isCommand;

      if (isInteraction && target.isMessageComponent && target.isMessageComponent()) {
        const customId = target.customId;

        if (customId === 'vs_add') {
          const channelId = target.values[0];
          if (vouchData[guildId].channels.includes(channelId)) {
            return safeReply(target, { components: [cv2Error('Channel is already a vouch channel.')], ephemeral: true });
          }
          vouchData[guildId].channels.push(channelId);
          storage.write('vouch.json', vouchData);
          return safeUpdate(target, { components: [buildDashboard(guild, vouchData)] });
        }

        if (customId === 'vs_remove') {
          const channelId = target.values[0];
          vouchData[guildId].channels = vouchData[guildId].channels.filter(id => id !== channelId);
          storage.write('vouch.json', vouchData);
          return safeUpdate(target, { components: [buildDashboard(guild, vouchData)] });
        }
      }

      // Initial Command Invocation
      if (!isInteraction || (isInteraction && target.isCommand && target.isCommand())) {
        const container = buildDashboard(guild, vouchData);
        if (target.reply) {
          return safeReply(target, { components: [container] }).catch(() => {});
        }
      }

    } catch (error) {
      safeReply(target, { components: [cv2Error(error.message)], ephemeral: true }).catch(() => { });
    }
  }
};
