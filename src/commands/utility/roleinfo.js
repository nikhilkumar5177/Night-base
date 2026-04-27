const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { EMOJI_ARROW, EMOJI_DOT, FOOTER_TEXT } = require('../../utils/constants');
const { sendUsage, cv2Error, cv2Expire } = require('../../utils/messageHelper');

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
      if (!role) return sendUsage(message, module.exports);

      const perms = role.permissions.toArray();
      const keyPerms = perms.filter(p => ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'BanMembers', 'KickMembers', 'ModerateMembers', 'ManageMessages', 'MentionEveryone'].includes(p));

      const buildMainContainer = () => {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Role Details`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_DOT} **Name:** ${role}\n` +
            `${EMOJI_DOT} **ID:** \`${role.id}\` \u2502 **Color:** \`${role.hexColor}\`\n` +
            `${EMOJI_DOT} **Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:R>`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_ARROW} **Position:** \`${role.position}\` \u2502 **Members:** \`${role.members.size}\`\n` +
            `${EMOJI_ARROW} **Hoisted:** ${role.hoist ? 'Yes' : 'No'} \u2502 **Mentionable:** ${role.mentionable ? 'Yes' : 'No'}\n` +
            `${EMOJI_ARROW} **Managed:** ${role.managed ? 'Yes' : 'No'}`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_ARROW} **Key Permissions:** ${keyPerms.length > 0 ? keyPerms.map(p => `\`${p}\``).join(', ') : 'None'}`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
        
        container.addActionRowComponents(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ri_members').setLabel(`View Members (${role.members.size})`).setStyle(ButtonStyle.Primary).setDisabled(role.members.size === 0)
        ));
        return container;
      };

      const buildMembersContainer = () => {
        const list = role.members.map(m => `${m}`).join(', ');
        const truncated = list.length > 3900 ? list.substring(0, 3900) + '...' : list;
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(truncated))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
        
        container.addActionRowComponents(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ri_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
        ));
        return container;
      };

      const sent = await message.reply({ components: [buildMainContainer()], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      if (!sent) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => {
        if (i.customId === 'ri_members') await i.update({ components: [buildMembersContainer()] });
        if (i.customId === 'ri_back') await i.update({ components: [buildMainContainer()] });
      });

      coll.on('end', () => sent.edit({ components: [cv2Expire()] }).catch(() => {}));
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
  }
};
