const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SEP } = require('../../utils/constants');
const storage = require('../../utils/storageManager');

const DOT = '\u25AA';

module.exports = {
  name: 'stafflist',
  aliases: ['staff', 'staffroles'],
  description: 'View all configured staff roles and their members',
  usage: 'stafflist',
  cooldown: 3,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message) => {
    try {
      const staffData = storage.read('staff.json');
      if (!staffData.roles || staffData.roles.length === 0) {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setAuthor({ name: 'Wild Wolf \u2502 Staff List', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n{EMOJI_WARN} **No staff roles configured.**\nUse \`${client.config.prefix}addstaff @Role\` to add one.\n${SEP}`).setTimestamp()] });
      }

      const cleaned = [];
      const sections = [];
      let totalStaff = 0;

      for (const roleId of staffData.roles) {
        const role = message.guild.roles.cache.get(roleId);
        if (!role) { cleaned.push(roleId); continue; }
        const members = role.members.map(m => m.user.tag);
        totalStaff += members.length;
        sections.push(`${DOT} ${role} \u2014 \`${members.length}\` members\n${members.length > 0 ? members.slice(0, 15).map(t => `   \u2502 \`${t}\``).join('\n') + (members.length > 15 ? `\n   \u2502 ... +${members.length - 15} more` : '') : '   \u2502 *No members*'}`);
      }

      if (cleaned.length > 0) {
        staffData.roles = staffData.roles.filter(id => !cleaned.includes(id));
        storage.write('staff.json', staffData);
      }

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: 'Wild Wolf \u2502 Staff Dashboard', iconURL: client.user.displayAvatarURL() })
        .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
        .setDescription(
          `${SEP}\n` +
          `${DOT} **Staff Roles:** \`${staffData.roles.length}\`\n` +
          `${DOT} **Total Staff:** \`${totalStaff}\`\n` +
          `${SEP}\n\n` +
          sections.join('\n\n')
        )
        .setFooter({ text: 'Wild Wolf \u2022 Staff Management', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sl_del').setLabel('Dismiss').setStyle(ButtonStyle.Secondary).setEmoji('\u2716')
      );

      const sent = await message.reply({ embeds: [embed], components: [row] });
      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 120000 });
      coll.on('collect', async i => { if (i.customId === 'sl_del') { await sent.delete().catch(() => {}); coll.stop(); } });
      coll.on('end', () => sent.edit({ components: [] }).catch(() => {}));
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`{EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
