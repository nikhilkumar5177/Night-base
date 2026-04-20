const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SEP, EMOJI_ARROW, EMOJI_DOT, EMOJI_ERROR } = require('../../utils/constants');

module.exports = {
  name: 'roleinfo',
  aliases: ['ri'],
  description: 'Display role information',
  usage: 'roleinfo <role>',
  cooldown: 3,
  enabled: true,
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());
      if (!role) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}roleinfo <@role>\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}roleinfo @Moderator\n\`\`\`` }, { name: 'Aliases', value: '`ri`', inline: true }, { name: 'Cooldown', value: '`3s`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp()] });
      }

      const perms = role.permissions.toArray();
      const keyPerms = perms.filter(p => ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'BanMembers', 'KickMembers', 'ModerateMembers', 'ManageMessages', 'MentionEveryone'].includes(p));

      const embed = new EmbedBuilder()
        .setColor(role.hexColor || '#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Role Details', iconURL: client.user.displayAvatarURL() })
        .setDescription(
          `${SEP}\n` +
          `${EMOJI_DOT} **Name:** ${role}\n` +
          `${EMOJI_DOT} **ID:** \`${role.id}\`\n` +
          `${EMOJI_DOT} **Color:** \`${role.hexColor}\`\n` +
          `${EMOJI_DOT} **Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:R>\n` +
          `${SEP}`
        )
        .addFields(
          { name: `${EMOJI_ARROW} Position`, value: `\`${role.position}\``, inline: true },
          { name: `${EMOJI_ARROW} Members`, value: `\`${role.members.size}\``, inline: true },
          { name: `${EMOJI_ARROW} Mentionable`, value: role.mentionable ? '\`Yes\`' : '\`No\`', inline: true },
          { name: `${EMOJI_ARROW} Hoisted`, value: role.hoist ? '\`Yes\`' : '\`No\`', inline: true },
          { name: `${EMOJI_ARROW} Managed`, value: role.managed ? '\`Yes\`' : '\`No\`', inline: true },
          { name: `${EMOJI_ARROW} Bot Role`, value: role.tags?.botId ? '\`Yes\`' : '\`No\`', inline: true },
          { name: `${EMOJI_ARROW} Key Permissions`, value: keyPerms.length > 0 ? keyPerms.map(p => `\`${p}\``).join(', ') : '\`None\`' }
        )
        .setFooter({ text: `Wild Wolf \u2022 ${perms.length} total permissions`, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ri_members').setLabel(`View Members (${role.members.size})`).setStyle(ButtonStyle.Primary).setDisabled(role.members.size === 0),
        new ButtonBuilder().setCustomId('ri_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.reply({ embeds: [embed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'ri_del') { await sent.delete().catch(() => { }); coll.stop(); return; }
        if (i.customId === 'ri_members') {
          const list = role.members.map(m => `${m}`).join(', ');
          const truncated = list.length > 3900 ? list.substring(0, 3900) + '...' : list;
          const mEmbed = new EmbedBuilder().setColor(role.hexColor || '#5865F2').setAuthor({ name: `Wild Wolf \u2502 ${role.name} Members`, iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${truncated}\n${SEP}`).setFooter({ text: `${role.members.size} members` }).setTimestamp();
          const bk = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ri_back').setLabel('Back').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ri_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
          );
          await i.update({ embeds: [mEmbed], components: [bk] });
        }
        if (i.customId === 'ri_back') await i.update({ embeds: [embed], components: [row] });
      });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => { }));
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
