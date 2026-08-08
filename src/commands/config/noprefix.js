const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const storage = require('../../utils/storageManager');
const { EMOJI_INFO, EMOJI_WARN, EMOJI_SUCCESS, EMOJI_DOT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error, safeReply, safeUpdate } = require('../../utils/messageHelper');

function buildDashboard(client, configData) {
  const users = configData.noPrefixUsers || [];
  
  let listStr = '';
  if (users.length === 0) {
    listStr = `${EMOJI_INFO} *No users have no-prefix access.*`;
  } else {
    const now = Date.now();
    listStr = users.map((entry, i) => {
      const isLegacy = typeof entry === 'string';
      const id = isLegacy ? entry : entry.id;
      const user = client.users.cache.get(id);
      const name = user ? user.tag : id;
      
      if (isLegacy) return `**${i + 1}.** ${name} \u2014 \`Permanent\` (legacy)`;

      const addedBy = client.users.cache.get(entry.addedBy);
      const addedByTag = addedBy ? addedBy.tag : entry.addedBy;

      if (entry.permanent) {
        return `**${i + 1}.** ${name} \u2014 \`Permanent\`\n└ Added by: ${addedByTag} \u2014 <t:${Math.floor(entry.addedAt / 1000)}:R>`;
      }

      const remaining = entry.expiresAt - now;
      if (remaining <= 0) return `**${i + 1}.** ${name} \u2014 \`EXPIRED\``;

      return `**${i + 1}.** ${name} \u2014 Expires: <t:${Math.floor(entry.expiresAt / 1000)}:R>\n└ Added by: ${addedByTag}`;
    }).join('\n\n');
  }

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} No-Prefix Dashboard`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(listStr));

  const row1 = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder().setCustomId('np_add_user').setPlaceholder('Search User to Grant Access')
  );
  const row2 = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder().setCustomId('np_remove_user').setPlaceholder('Search User to Revoke Access')
  );
  
  container.addActionRowComponents(row1, row2);
  return container;
}

module.exports = {
  name: 'noprefix',
  aliases: ['np', 'nopre'],
  description: 'Manage no-prefix access via dashboard',
  usage: 'noprefix',
  cooldown: 3,
  enabled: true,
  devOnly: true,
  execute: async (client, target, args) => {
    try {
      const authorId = target.author ? target.author.id : target.user.id;
      const guild = target.guild;

      if (authorId !== guild.ownerId && !client.devIds.has(authorId)) {
        return safeReply(target, { components: [cv2Error('Only the server owner or devs can manage no-prefix access.')], ephemeral: true });
      }

      const configData = storage.read('config.json');
      if (!configData.noPrefixUsers) configData.noPrefixUsers = [];

      const isInteraction = !!target.customId || !!target.isCommand;

      if (isInteraction && target.isUserSelectMenu && target.isUserSelectMenu()) {
        const customId = target.customId;

        if (customId === 'np_add_user') {
          const userId = target.values[0];
          const modal = new ModalBuilder().setCustomId(`np_modadd_${userId}`).setTitle('Grant No-Prefix Access');
          const durationInput = new TextInputBuilder().setCustomId('duration').setLabel('Duration (e.g. 30m, 12h, 7d, permanent)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Leave blank for permanent');
          modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
          return target.showModal(modal);
        }

        if (customId === 'np_remove_user') {
          const inputId = target.values[0];
          const exists = configData.noPrefixUsers.find(u => (typeof u === 'string' ? u : u.id) === inputId);
          if (!exists) return safeReply(target, { components: [cv2Error(`User <@${inputId}> does not have access.`)], ephemeral: true });

          configData.noPrefixUsers = configData.noPrefixUsers.filter(u => (typeof u === 'string' ? u : u.id) !== inputId);
          storage.write('config.json', configData);
          return safeUpdate(target, { components: [buildDashboard(client, configData)] });
        }
      }

      if (isInteraction && target.isModalSubmit && target.isModalSubmit()) {
        const customId = target.customId;

        if (customId.startsWith('np_modadd_')) {
          const inputId = customId.split('_')[2];
          let durationStr = target.fields.getTextInputValue('duration')?.trim().toLowerCase();
          if (durationStr === 'permanent' || durationStr === 'perm' || durationStr === '0') durationStr = '';

          const existing = configData.noPrefixUsers.find(u => (typeof u === 'string' ? u : u.id) === inputId);
          if (existing) {
            configData.noPrefixUsers = configData.noPrefixUsers.filter(u => (typeof u === 'string' ? u : u.id) !== inputId);
          }

          let entry;
          if (!durationStr) {
            entry = { id: inputId, permanent: true, addedBy: authorId, addedAt: Date.now() };
          } else {
            const match = durationStr.match(/^(\d+)(mo|m|h|d)$/);
            if (!match) return safeReply(target, { components: [cv2Error('Invalid duration format. Use: `30m`, `12h`, `7d`, `2mo`')], ephemeral: true });
            
            const amount = parseInt(match[1]);
            const unit = match[2];
            const multipliers = { m: 60000, h: 3600000, d: 86400000, mo: 2592000000 };
            const duration = amount * multipliers[unit];
            if (duration > 365 * 86400000) return safeReply(target, { components: [cv2Error('Maximum duration is 365 days.')], ephemeral: true });
            
            entry = { id: inputId, permanent: false, expiresAt: Date.now() + duration, addedBy: authorId, addedAt: Date.now() };
          }

          configData.noPrefixUsers.push(entry);
          storage.write('config.json', configData);
          return safeUpdate(target, { components: [buildDashboard(client, configData)] });
        }
      }

      // Initial Command Invocation
      if (!isInteraction || (isInteraction && target.isCommand && target.isCommand())) {
        const container = buildDashboard(client, configData);
        if (target.reply) {
          return safeReply(target, { components: [container] }).catch(() => {});
        }
      }

    } catch (error) {
      safeReply(target, { components: [cv2Error(error.message)], ephemeral: true }).catch(() => {});
    }
  }
};
