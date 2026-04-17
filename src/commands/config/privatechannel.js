const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const storage = require('../../utils/storageManager');

const SEP = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
const DOT = '\u25AA';

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
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} You need **ManageChannels** permission.').setTimestamp()] });
      }

      const pcData = storage.read('privateChannels.json');
      const guildId = message.guild.id;
      if (!pcData[guildId]) pcData[guildId] = {};
      const action = args[0]?.toLowerCase();

      if (action === 'list') {
        const channels = Object.entries(pcData[guildId]);
        if (channels.length === 0) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#5865F2').setAuthor({ name: 'Wild Wolf \u2502 Private Channels', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${DOT} No private channels configured.\n${SEP}`).setTimestamp()] });
        }
        const list = channels.map(([chId, data], i) => {
          const ch = message.guild.channels.cache.get(chId);
          return `\`${i + 1}.\` ${ch || `\`${chId}\``} \u2014 \`${(data.users || []).length}\` users, \`${(data.roles || []).length}\` roles`;
        }).join('\n');
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setAuthor({ name: 'Wild Wolf \u2502 Private Channels', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n${list}\n${SEP}`)
          .setFooter({ text: `Wild Wolf \u2022 ${channels.length} private channels`, iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        return message.channel.send({ embeds: [embed] });
      }

      if (action === 'create') {
        const name = args[1];
        if (!name) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**Provide a channel name.**').addFields({ name: '\u2501\u2501 Format', value: `\`\`\`fix\n${client.config.prefix}privatechannel create <name>\n\`\`\`` }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp()] });
        }

        const loadEmbed = new EmbedBuilder().setColor('#EB459E').setAuthor({ name: 'Wild Wolf \u2502 Creating', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_LOADING} **Creating private channel...**\n${SEP}`).setTimestamp();
        const sent = await message.channel.send({ embeds: [loadEmbed] });

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

        const embed = new EmbedBuilder()
          .setColor('#57F287')
          .setAuthor({ name: 'Wild Wolf \u2502 Private Channel Created', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n{EMOJI_SUCCESS} **Private channel created successfully.**\n${SEP}`)
          .addFields(
            { name: '\u25B8 Channel', value: `${channel}`, inline: true },
            { name: '\u25B8 Created By', value: message.author.tag, inline: true }
          )
          .setFooter({ text: 'Wild Wolf \u2022 Use add/remove to manage access', iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        await sent.edit({ embeds: [embed] });
        return;
      }

      if (action === 'delete') {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
        if (!pcData[guildId][channel.id]) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription('{EMOJI_ERROR} That channel is not a managed private channel.').setTimestamp()] });
        }

        const confirmEmbed = new EmbedBuilder()
          .setColor('#ED4245')
          .setAuthor({ name: 'Wild Wolf \u2502 Delete Confirmation', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n{EMOJI_WARN} **Are you sure you want to delete ${channel}?**\nThis action cannot be undone.\n${SEP}`)
          .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('pc_yes').setLabel('Delete').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('pc_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );
        const sent = await message.channel.send({ embeds: [confirmEmbed], components: [row] });
        const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 15000, max: 1 });
        coll.on('collect', async i => {
          if (i.customId === 'pc_yes') {
            await channel.delete().catch(() => {});
            delete pcData[guildId][channel.id];
            storage.write('privateChannels.json', pcData);
            await i.update({ embeds: [new EmbedBuilder().setColor('#57F287').setAuthor({ name: 'Wild Wolf \u2502 Deleted', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_SUCCESS} **Private channel deleted.**\n${SEP}`).setTimestamp()], components: [] });
          } else {
            await i.update({ embeds: [new EmbedBuilder().setColor('#2B2D31').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} **Cancelled.**\n${SEP}`).setTimestamp()], components: [] });
          }
        });
        coll.on('end', c => { if (c.size === 0) sent.edit({ components: [] }).catch(() => {}); });
        return;
      }

      if (action === 'add') {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
        const target = message.mentions.members.last() || message.mentions.roles.first();
        if (!target) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**Mention a user or role to grant access.**').addFields({ name: '\u2501\u2501 Format', value: `\`\`\`fix\n${client.config.prefix}privatechannel add [#channel] <@user/@role>\n\`\`\`` }).setFooter({ text: 'Wild Wolf' }).setTimestamp()] });
        }
        await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true });

        if (!pcData[guildId][channel.id]) pcData[guildId][channel.id] = { users: [], roles: [] };
        const isRole = !!target.hexColor;
        if (isRole) { if (!pcData[guildId][channel.id].roles.includes(target.id)) pcData[guildId][channel.id].roles.push(target.id); }
        else { if (!pcData[guildId][channel.id].users.includes(target.id)) pcData[guildId][channel.id].users.push(target.id); }
        storage.write('privateChannels.json', pcData);

        const embed = new EmbedBuilder()
          .setColor('#57F287')
          .setAuthor({ name: 'Wild Wolf \u2502 Access Granted', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n{EMOJI_SUCCESS} **${target} can now access ${channel}.**\n${SEP}`)
          .setFooter({ text: 'Wild Wolf \u2022 Private Channel Manager' }).setTimestamp();
        return message.channel.send({ embeds: [embed] });
      }

      if (action === 'remove') {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
        const target = message.mentions.members.last() || message.mentions.roles.first();
        if (!target) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**Mention a user or role to revoke access.**').addFields({ name: '\u2501\u2501 Format', value: `\`\`\`fix\n${client.config.prefix}privatechannel remove [#channel] <@user/@role>\n\`\`\`` }).setFooter({ text: 'Wild Wolf' }).setTimestamp()] });
        }
        await channel.permissionOverwrites.delete(target.id).catch(() => {});

        if (pcData[guildId][channel.id]) {
          pcData[guildId][channel.id].users = (pcData[guildId][channel.id].users || []).filter(id => id !== target.id);
          pcData[guildId][channel.id].roles = (pcData[guildId][channel.id].roles || []).filter(id => id !== target.id);
          storage.write('privateChannels.json', pcData);
        }

        const embed = new EmbedBuilder()
          .setColor('#ff6d00')
          .setAuthor({ name: 'Wild Wolf \u2502 Access Revoked', iconURL: client.user.displayAvatarURL() })
          .setDescription(`${SEP}\n{EMOJI_SUCCESS} **${target} can no longer access ${channel}.**\n${SEP}`)
          .setFooter({ text: 'Wild Wolf \u2022 Private Channel Manager' }).setTimestamp();
        return message.channel.send({ embeds: [embed] });
      }

      const usageEmbed = new EmbedBuilder()
        .setColor('#8B0000')
        .setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() })
        .setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.')
        .addFields(
          { name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}privatechannel <create|delete|add|remove|list> [name/#channel] [@user/@role]\n\`\`\`` },
          { name: '\u2501\u2501 Examples', value: `\`\`\`\n${client.config.prefix}privatechannel create secret-chat\n${client.config.prefix}privatechannel add #secret-chat @User\n${client.config.prefix}privatechannel remove #secret-chat @User\n${client.config.prefix}privatechannel delete #secret-chat\n${client.config.prefix}privatechannel list\n\`\`\`` },
          { name: 'Aliases', value: '`pc`, `private`', inline: true },
          { name: 'Permission', value: '`ManageChannels`', inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' })
        .setTimestamp();
      message.channel.send({ embeds: [usageEmbed] });
    } catch (error) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
