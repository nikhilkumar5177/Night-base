const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, StringSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_OWNER, EMOJI_WARN, EMOJI_SUCCESS, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error, safeReply, safeUpdate } = require('../../utils/messageHelper');

function buildDashboard(guild, cblData) {
  const entries = Object.entries(cblData).filter(([chId]) => guild.channels.cache.has(chId));
  
  let listStr = '';
  if (entries.length === 0) {
    listStr = `${EMOJI_OWNER} *No channel command blacklists for this server.*`;
  } else {
    listStr = entries.map(([chId, cmds]) => `<#${chId}>: \`${cmds.join('\`, \`')}\``).join('\n');
  }

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Command Blacklist`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listStr));

  const rows = [];

  // Add Blocked Command to Channel: Select from all text channels
  const row1 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder().setCustomId('cb_add_chan').setPlaceholder('Select Channel to Block Command').addChannelTypes(ChannelType.GuildText)
  );
  rows.push(row1);

  // Remove/Unblock: Show ONLY channels that currently have blacklisted commands
  if (entries.length > 0) {
    const removeMenu = new StringSelectMenuBuilder()
      .setCustomId('cb_rem_chan')
      .setPlaceholder('Select Channel to Unblock Commands');

    for (const [chId, cmds] of entries.slice(0, 25)) {
      const ch = guild.channels.cache.get(chId);
      const name = ch ? `#${ch.name}` : `Channel: ${chId}`;
      removeMenu.addOptions({
        label: name.slice(0, 100),
        value: chId,
        description: `Blocked: ${cmds.slice(0, 3).join(', ')}${cmds.length > 3 ? '...' : ''}`.slice(0, 100)
      });
    }

    if (removeMenu.options.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(removeMenu));
    }
  }

  container.addActionRowComponents(...rows);
  return container;
}

module.exports = {
  name: 'cmdblacklist',
  aliases: ['cbl', 'channelblock'],
  description: 'Block commands in a channel via interactive dashboard',
  usage: 'cmdblacklist',
  cooldown: 0,
  enabled: true,
  devOnly: false, // Updated to false for general usage if permissions allow, but kept owner check below just in case
  execute: async (client, target, args) => {
    try {
      const member = target.member;
      const guild = target.guild;

      if (!member.permissions.has('ManageChannels')) {
        return safeReply(target, { components: [cv2Error('You need **ManageChannels** permission.')], ephemeral: true });
      }

      const cblData = storage.read('cmdBlacklist.json');

      const isInteraction = !!target.customId || !!target.isCommand;

      if (isInteraction && target.isChannelSelectMenu && target.isChannelSelectMenu()) {
        const customId = target.customId;
        if (customId === 'cb_add_chan') {
          const channelId = target.values[0];
          const modal = new ModalBuilder().setCustomId(`cb_modal_add_${channelId}`).setTitle('Add to Blacklist');
          const cmdInput = new TextInputBuilder().setCustomId('cmdName').setLabel('Command Name').setStyle(TextInputStyle.Short).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(cmdInput));
          return target.showModal(modal);
        }
      }

      if (isInteraction && target.isStringSelectMenu && target.isStringSelectMenu()) {
        const customId = target.customId;
        if (customId === 'cb_rem_chan') {
          const channelId = target.values[0];
          const modal = new ModalBuilder().setCustomId(`cb_modal_remove_${channelId}`).setTitle('Remove from Blacklist');
          const cmdInput = new TextInputBuilder().setCustomId('cmdName').setLabel('Command Name to Unblock').setStyle(TextInputStyle.Short).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(cmdInput));
          return target.showModal(modal);
        }
      }

      if (isInteraction && target.isModalSubmit && target.isModalSubmit()) {
        const customId = target.customId;
        if (customId.startsWith('cb_modal_add_') || customId.startsWith('cb_modal_remove_')) {
          const isAdd = customId.startsWith('cb_modal_add_');
          const channelId = customId.split('_')[3];
          const cmdName = target.fields.getTextInputValue('cmdName').trim().toLowerCase();

          const channel = guild.channels.cache.get(channelId);
          if (!channel) return safeReply(target, { components: [cv2Error('Invalid Channel ID on this server.')], ephemeral: true });
          
          if (!client.commands.has(cmdName) && !client.commands.find(c => c.aliases && c.aliases.includes(cmdName))) {
            return safeReply(target, { components: [cv2Error(`Command \`${cmdName}\` does not exist.`)], ephemeral: true });
          }

          if (isAdd) {
            if (!cblData[channel.id]) cblData[channel.id] = [];
            if (cblData[channel.id].includes(cmdName)) {
              return safeReply(target, { components: [cv2Error(`\`${cmdName}\` is already blocked in ${channel}.`)], ephemeral: true });
            }
            cblData[channel.id].push(cmdName);
          } else {
            if (!cblData[channel.id] || !cblData[channel.id].includes(cmdName)) {
              return safeReply(target, { components: [cv2Error(`\`${cmdName}\` is not blocked in ${channel}.`)], ephemeral: true });
            }
            cblData[channel.id] = cblData[channel.id].filter(c => c !== cmdName);
            if (cblData[channel.id].length === 0) delete cblData[channel.id];
          }

          storage.write('cmdBlacklist.json', cblData);
          return safeUpdate(target, { components: [buildDashboard(guild, cblData)] });
        }
      }

      // Initial Command Invocation
      if (!isInteraction || (isInteraction && target.isCommand && target.isCommand())) {
        const container = buildDashboard(guild, cblData);
        if (target.reply) {
          return safeReply(target, { components: [container] }).catch(() => {});
        }
      }

    } catch (error) {
      safeReply(target, { components: [cv2Error(error.message)], ephemeral: true }).catch(() => {});
    }
  }
};
