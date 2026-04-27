const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_LOADING, EMOJI_DOT } = require('../../utils/constants');
const storage = require('../../utils/storageManager');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'privatechannel',
  aliases: ['pc', 'private'],
  description: 'Create or manage private channels for specific users/roles',
  usage: 'privatechannel <create|delete|add|remove|list> [name] [@user/@role]',
  cooldown: 5,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageChannels')) {
        return message.reply({ components: [cv2Error('You need **ManageChannels** permission.')], flags: 32768 });
      }

      const pcData = storage.read('privateChannels.json');
      const guildId = message.guild.id;
      if (!pcData[guildId]) pcData[guildId] = {};
      const action = args[0]?.toLowerCase();

      if (action === 'list') {
        const channels = Object.entries(pcData[guildId]);
        if (channels.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Private Channels`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_DOT} No private channels configured.`));
          return message.reply({ components: [container], flags: 32768 });
        }
        const list = channels.map(([chId, data], i) => {
          const ch = message.guild.channels.cache.get(chId);
          return `\`${i + 1}.\` ${ch || `\`${chId}\``} \u2014 \`${(data.users || []).length}\` users, \`${(data.roles || []).length}\` roles`;
        }).join('\n');
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Private Channels`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
        return message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }

      if (action === 'create') {
        const name = args[1];
        if (!name) {
          return message.reply({ components: [cv2Error(`Provide a channel name.\n\nUsage: \`${client.config.prefix}privatechannel create <name>\``)], flags: 32768 });
        }

        const loadContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Creating private channel...**`));
        const sent = await message.reply({ components: [loadContainer], flags: 32768 }).catch(() => {});

        const channel = await message.guild.channels.create({
          name: name,
          permissionOverwrites: [
            { id: message.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: message.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
          ]
        });

        pcData[guildId][channel.id] = { createdBy: message.author.id, createdAt: Date.now(), users: [message.author.id], roles: [] };
        storage.write('privateChannels.json', pcData);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Private Channel Created`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_SUCCESS} **Private channel created.**\n` +
            `${EMOJI_DOT} **Channel:** ${channel}\n` +
            `${EMOJI_DOT} **By:** ${message.author.tag}`
          ));
        await sent.edit({ components: [container] }).catch(() => {});
        return;
      }

      if (action === 'delete') {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
        if (!pcData[guildId][channel.id]) {
          return message.reply({ components: [cv2Error('That channel is not a managed private channel.')], flags: 32768 });
        }

        const confirmContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Delete Confirmation`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Are you sure you want to delete ${channel}?**\nThis action cannot be undone.`));

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('pc_yes').setLabel('Delete').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('pc_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );
        confirmContainer.addActionRowComponents(row);

        const sent = await message.reply({ components: [confirmContainer], flags: 32768 }).catch(() => {});
        const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 15000, max: 1 });
        coll.on('collect', async i => {
          if (i.customId === 'pc_yes') {
            await channel.delete().catch(() => {});
            delete pcData[guildId][channel.id];
            storage.write('privateChannels.json', pcData);
            const doneContainer = new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **Private channel deleted.**`));
            await i.update({ components: [doneContainer] });
          } else {
            const cancelContainer = new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Cancelled.**`));
            await i.update({ components: [cancelContainer] });
          }
        });
        coll.on('end', c => {
          if (c.size === 0) {
            const expiredContainer = new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **Timed out.**`));
            sent.edit({ components: [expiredContainer] }).catch(() => {});
          }
        });
        return;
      }

      if (action === 'add') {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
        const target = message.mentions.members.last() || message.mentions.roles.first();
        if (!target) {
          return message.reply({ components: [cv2Error(`Mention a user or role to grant access.\n\nUsage: \`${client.config.prefix}privatechannel add [#channel] <@user/@role>\``)], flags: 32768 });
        }
        await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true }).catch(() => {});

        if (!pcData[guildId][channel.id]) pcData[guildId][channel.id] = { users: [], roles: [] };
        const isRole = !!target.hexColor;
        if (isRole) { if (!pcData[guildId][channel.id].roles.includes(target.id)) pcData[guildId][channel.id].roles.push(target.id); }
        else { if (!pcData[guildId][channel.id].users.includes(target.id)) pcData[guildId][channel.id].users.push(target.id); }
        storage.write('privateChannels.json', pcData);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Access Granted`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **${target} can now access ${channel}.**`));
        return message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }

      if (action === 'remove') {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
        const target = message.mentions.members.last() || message.mentions.roles.first();
        if (!target) {
          return message.reply({ components: [cv2Error(`Mention a user or role to revoke access.\n\nUsage: \`${client.config.prefix}privatechannel remove [#channel] <@user/@role>\``)], flags: 32768 });
        }
        await channel.permissionOverwrites.delete(target.id).catch(() => {});

        if (pcData[guildId][channel.id]) {
          pcData[guildId][channel.id].users = (pcData[guildId][channel.id].users || []).filter(id => id !== target.id);
          pcData[guildId][channel.id].roles = (pcData[guildId][channel.id].roles || []).filter(id => id !== target.id);
          storage.write('privateChannels.json', pcData);
        }

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Access Revoked`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_SUCCESS} **${target} can no longer access ${channel}.**`));
        return message.reply({ components: [container], flags: 32768 }).catch(() => {});
      }

      return sendUsage(message, module.exports);
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => {});
    }
  }
};
