const { EmbedBuilder } = require('discord.js');
const { SEP, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_WARN, EMOJI_LOADING } = require('../../utils/constants');
const { resolveRole } = require('../../utils/resolver');

const BATCH_SIZE = 50;
const BATCH_DELAY = 1500;

module.exports = {
  name: 'rolereverse',
  aliases: ['rr'],
  description: 'Remove a role from all members (batched)',
  usage: 'rolereverse <@role>',
  cooldown: 30,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} You need **ManageRoles** permission.`).setTimestamp()] });
      }
      if (!message.guild.members.me.permissions.has('ManageRoles')) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} I need **ManageRoles** permission.`).setTimestamp()] });
      }
      const role = resolveRole(message.guild, args[0]);
      if (!role) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#8B0000').setAuthor({ name: 'WRONG SYNTAX', iconURL: client.user.displayAvatarURL() }).setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.').addFields({ name: '\u2501\u2501 Correct Format', value: `\`\`\`fix\n${client.config.prefix}rolereverse <@role>\n\`\`\`` }, { name: '\u2501\u2501 Example', value: `\`\`\`\n${client.config.prefix}rolereverse @Members\n\`\`\`` }, { name: 'Aliases', value: '`rr`', inline: true }, { name: 'Cooldown', value: '`30s`', inline: true }, { name: 'Permission', value: '`ManageRoles`', inline: true }).setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' }).setTimestamp()] });
      }
      if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} That role is above my highest role.`).setTimestamp()] });
      }

      const members = await message.guild.members.fetch();
      const targets = [...members.filter(m => m.roles.cache.has(role.id) && !m.user.bot).values()];
      const total = targets.length;

      if (total === 0) {
        return message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#FEE75C').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${SEP}\n${EMOJI_WARN} No non-bot members have ${role}.\n${SEP}`).setTimestamp()] });
      }

      const progressEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 Role Removal', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_LOADING} **Removing ${role} from ${total} members...**\n\n\`\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\` 0%\n${SEP}`)
        .setTimestamp();
      const progressMsg = await message.reply({ embeds: [progressEmbed] }).catch(() => {});

      let success = 0, failed = 0;

      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(m => m.roles.remove(role)));
        for (const r of results) { if (r.status === 'fulfilled') success++; else failed++; }

        const processed = Math.min(i + BATCH_SIZE, total);
        const pct = Math.round((processed / total) * 100);
        const filled = Math.round(pct / 5);
        const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(20 - filled);

        progressEmbed.setDescription(`${SEP}\n${EMOJI_LOADING} **Removing ${role}...**\n\n\`${bar}\` ${pct}%\n\`${processed}/${total}\` \u2022 \`${success}\` removed \u2022 \`${failed}\` failed\n${SEP}`);
        await progressMsg.edit({ embeds: [progressEmbed] }).catch(() => {});

        if (i + BATCH_SIZE < targets.length) await new Promise(r => setTimeout(r, BATCH_DELAY));
      }

      const doneEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: 'Wild Wolf \u2502 Role Removal Complete', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Role removal finished.**\n${SEP}`)
        .addFields(
          { name: '\u25B8 Role', value: `${role}`, inline: true },
          { name: '\u25B8 Removed', value: `\`${success}\``, inline: true },
          { name: '\u25B8 Failed', value: `\`${failed}\``, inline: true }
        )
        .setFooter({ text: 'Wild Wolf \u2022 Moderation Log', iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      await progressMsg.edit({ embeds: [doneEmbed] }).catch(() => {});
    } catch (error) {
      message.reply({ embeds: [new EmbedBuilder().catch(() => {}).setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp()] });
    }
  }
};
