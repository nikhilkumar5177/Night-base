const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MentionableSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_LOADING, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const storage = require('../../utils/storageManager');
const { cv2Error, safeReply, safeUpdate, safeEdit } = require('../../utils/messageHelper');

function buildDashboard(guild, pcData) {
  const guildId = guild.id;
  const channels = Object.entries(pcData[guildId] || {});
  
  let listStr = '';
  if (channels.length === 0) {
    listStr = `${EMOJI_DOT} *No private channels configured.*`;
  } else {
    listStr = channels.map(([chId, data], i) => {
      const ch = guild.channels.cache.get(chId);
      return `\`${i + 1}.\` ${ch || `\`${chId}\``} \u2014 \`${(data.users || []).length}\` users, \`${(data.roles || []).length}\` roles`;
    }).join('\n');
  }

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Private Channels`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listStr));

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pc_create').setLabel('Create Channel').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('pc_delete').setLabel('Delete Channel').setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new MentionableSelectMenuBuilder().setCustomId('pc_add_access_men').setPlaceholder('Search User/Role to Grant Access')
  );
  const row3 = new ActionRowBuilder().addComponents(
    new MentionableSelectMenuBuilder().setCustomId('pc_remove_access_men').setPlaceholder('Search User/Role to Revoke Access')
  );

  container.addActionRowComponents(row1, row2, row3);
  return container;
}

module.exports = {
  name: 'privatechannel',
  aliases: ['pc', 'private'],
  description: 'Create or manage private channels via interactive dashboard',
  usage: 'privatechannel',
  cooldown: 5,
  enabled: true,
  devOnly: false,
  execute: async (client, target, args) => {
    try {
      const member = target.member;
      const guild = target.guild;
      const authorId = target.author ? target.author.id : target.user.id;

      if (!member.permissions.has('ManageChannels')) {
        return safeReply(target, { components: [cv2Error('You need **ManageChannels** permission.')], ephemeral: true });
      }

      const pcData = storage.read('privateChannels.json');
      const guildId = guild.id;
      if (!pcData[guildId]) pcData[guildId] = {};

      const isInteraction = !!target.customId || !!target.isCommand;

      if (isInteraction && target.isMessageComponent && target.isMessageComponent()) {
        const customId = target.customId;

        if (customId === 'pc_create') {
          const modal = new ModalBuilder().setCustomId('pc_modal_create').setTitle('Create Private Channel');
          const nameInput = new TextInputBuilder().setCustomId('channelName').setLabel('Channel Name').setStyle(TextInputStyle.Short).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
          return target.showModal(modal);
        }
        if (customId === 'pc_delete') {
          const modal = new ModalBuilder().setCustomId('pc_modal_delete').setTitle('Delete Private Channel');
          const idInput = new TextInputBuilder().setCustomId('channelId').setLabel('Channel ID').setStyle(TextInputStyle.Short).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(idInput));
          return target.showModal(modal);
        }
      }

      if (isInteraction && target.isMentionableSelectMenu && target.isMentionableSelectMenu()) {
        const customId = target.customId;
        if (customId === 'pc_add_access_men' || customId === 'pc_remove_access_men') {
          const action = customId === 'pc_add_access_men' ? 'Grant' : 'Revoke';
          const targetId = target.values[0];
          const modal = new ModalBuilder().setCustomId(`pc_modal_${customId === 'pc_add_access_men' ? 'add' : 'remove'}_access_${targetId}`).setTitle(`${action} Access`);
          const channelIdInput = new TextInputBuilder().setCustomId('channelId').setLabel('Private Channel ID').setStyle(TextInputStyle.Short).setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(channelIdInput));
          return target.showModal(modal);
        }
      }

      if (isInteraction && target.isModalSubmit && target.isModalSubmit()) {
        const customId = target.customId;

        if (customId === 'pc_modal_create') {
          await target.deferUpdate();
          const name = target.fields.getTextInputValue('channelName').trim();

          const channel = await guild.channels.create({
            name: name,
            permissionOverwrites: [
              { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
              { id: authorId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
              { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ]
          }).catch(() => null);

          if (!channel) return safeReply(target, { components: [cv2Error('Failed to create channel.')], ephemeral: true });

          pcData[guildId][channel.id] = { createdBy: authorId, createdAt: Date.now(), users: [authorId], roles: [] };
          storage.write('privateChannels.json', pcData);
          return safeEdit(target, { components: [buildDashboard(guild, pcData)] });
        }

        if (customId === 'pc_modal_delete') {
          const channelId = target.fields.getTextInputValue('channelId').trim();
          if (!pcData[guildId][channelId]) return safeReply(target, { components: [cv2Error('That channel is not a managed private channel.')], ephemeral: true });

          const channel = guild.channels.cache.get(channelId);
          if (channel) await channel.delete().catch(() => {});
          
          delete pcData[guildId][channelId];
          storage.write('privateChannels.json', pcData);
          return safeUpdate(target, { components: [buildDashboard(guild, pcData)] });
        }

        if (customId.startsWith('pc_modal_add_access_') || customId.startsWith('pc_modal_remove_access_')) {
          const isAdd = customId.startsWith('pc_modal_add_access_');
          const targetId = customId.split('_')[4];
          const channelId = target.fields.getTextInputValue('channelId').trim();

          if (!pcData[guildId][channelId]) return safeReply(target, { components: [cv2Error('That channel is not a managed private channel.')], ephemeral: true });
          const channel = guild.channels.cache.get(channelId);
          if (!channel) return safeReply(target, { components: [cv2Error('Channel not found on server.')], ephemeral: true });

          const isRole = guild.roles.cache.has(targetId);
          const isUser = client.users.cache.has(targetId) || await client.users.fetch(targetId).catch(() => null);
          if (!isRole && !isUser) return safeReply(target, { components: [cv2Error('Invalid User or Role ID.')], ephemeral: true });

          if (isAdd) {
            await channel.permissionOverwrites.edit(targetId, { ViewChannel: true, SendMessages: true }).catch(() => {});
            if (isRole) { if (!pcData[guildId][channelId].roles.includes(targetId)) pcData[guildId][channelId].roles.push(targetId); }
            else { if (!pcData[guildId][channelId].users.includes(targetId)) pcData[guildId][channelId].users.push(targetId); }
          } else {
            await channel.permissionOverwrites.delete(targetId).catch(() => {});
            if (isRole) pcData[guildId][channelId].roles = (pcData[guildId][channelId].roles || []).filter(id => id !== targetId);
            else pcData[guildId][channelId].users = (pcData[guildId][channelId].users || []).filter(id => id !== targetId);
          }

          storage.write('privateChannels.json', pcData);
          return safeUpdate(target, { components: [buildDashboard(guild, pcData)] });
        }
      }

      // Initial Command Invocation
      if (!isInteraction || (isInteraction && target.isCommand && target.isCommand())) {
        const container = buildDashboard(guild, pcData);
        if (target.reply) {
          return safeReply(target, { components: [container] }).catch(() => {});
        }
      }

    } catch (error) {
      safeReply(target, { components: [cv2Error(error.message)], ephemeral: true }).catch(() => {});
    }
  }
};
