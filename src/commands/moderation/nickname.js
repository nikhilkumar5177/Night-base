const { EmbedBuilder } = require('discord.js');
const { resolveMember } = require('../../utils/resolver');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR } = require('../../utils/constants');

module.exports = {
  name: 'nickname',
  aliases: ['nick', 'setnick'],
  description: 'Change a users nickname',
  usage: 'nickname <user> <new nickname | reset>',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageNicknames')) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ff1744').setTitle(`${EMOJI_ERROR} Missing Permissions`).setDescription('You need **ManageNicknames** permission.').setTimestamp()] });
      }
      if (!message.guild.members.me.permissions.has('ManageNicknames')) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ff1744').setTitle(`${EMOJI_ERROR} Bot Missing Permissions`).setDescription('I need **ManageNicknames** permission.').setTimestamp()] });
      }
      const target = await resolveMember(message.guild, args[0]);
      if (!target || args.length < 2) {
        const usageEmbed = new EmbedBuilder()
          .setColor('#8B0000')
          .setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() })
          .setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.')
          .addFields(
            { name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}nickname <@user> <new name | reset>\n\`\`\`` },
            { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}nickname @User Cool Wolf\n${client.config.prefix}nickname @User reset\n\`\`\`` },
            { name: 'Aliases', value: '`nick`, `setnick`', inline: true },
            { name: 'Cooldown', value: '`3s`', inline: true },
            { name: 'Permission', value: '`ManageNicknames`', inline: true }
          )
          .setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' })
          .setTimestamp();
        return message.reply({ embeds: [usageEmbed] }).catch(() => {});
      }
      if (target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ff1744').setTitle(`${EMOJI_ERROR} Cannot Change`).setDescription('That user has a higher or equal role than me.').setTimestamp()] });
      }
      if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ff1744').setTitle(`${EMOJI_ERROR} Hierarchy Error`).setDescription('Target has equal or higher role.').setTimestamp()] });
      }
      const newNick = args.slice(1).join(' ');
      const oldNick = target.displayName;
      if (newNick.toLowerCase() === 'reset') {
        await target.setNickname(null);
      } else {
        await target.setNickname(newNick);
      }
      const embed = new EmbedBuilder()
        .setColor('#00e676')
        .setTitle(`${EMOJI_SUCCESS} Nickname Changed`)
        .addFields({ name: 'User', value: target.user.tag, inline: true }, { name: 'Before', value: oldNick, inline: true }, { name: 'After', value: newNick.toLowerCase() === 'reset' ? target.user.username : newNick, inline: true })
        .setTimestamp();
      message.reply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ff1744').setTitle(`${EMOJI_ERROR} Error`).setDescription(error.message).setTimestamp()] });
    }
  }
};
