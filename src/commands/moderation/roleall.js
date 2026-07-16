const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_SUCCESS, EMOJI_WARN, EMOJI_LOADING, EMOJI_DOT } = require('../../utils/constants');
const { resolveRole } = require('../../utils/resolver');
const { sendUsage, cv2Error } = require('../../utils/messageHelper');

const BATCH_SIZE = 50;
const BATCH_DELAY = 1500;

module.exports = {
  name: 'roleall',
  aliases: ['ra'],
  description: 'Add a role to all members (batched to avoid rate limits)',
  usage: 'roleall <@role>',
  cooldown: 30,
  enabled: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has('ManageRoles')) {
        return message.reply({ components: [cv2Error('You need **ManageRoles** permission.')], flags: 32768 });
      }
      if (!message.guild.members.me.permissions.has('ManageRoles')) {
        return message.reply({ components: [cv2Error('I need **ManageRoles** permission.')], flags: 32768 });
      }
      const role = resolveRole(message.guild, args[0]);
      if (!role) {
        return sendUsage(message, module.exports);
      }
      if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({ components: [cv2Error('That role is above my highest role.')], flags: 32768 });
      }

      const members = await message.guild.members.fetch();
      const targets = [...members.filter(m => !m.roles.cache.has(role.id) && !m.user.bot).values()];
      const total = targets.length;

      if (total === 0) {
        const warnContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} **All non-bot members already have ${role}.**`));
        return message.reply({ components: [warnContainer], flags: 32768 });
      }

      let progressContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Role Assignment`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_LOADING} **Adding ${role} to ${total} members...**\n\`${'░'.repeat(20)}\` 0%\n\`0/${total}\` processed`));

      const progressMsg = await message.reply({ components: [progressContainer], flags: 32768 }).catch(() => { });

      const startTime = Date.now();
      let success = 0;
      let failed = 0;

      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(m => m.roles.add(role)));
        for (const r of results) {
          if (r.status === 'fulfilled') success++;
          else failed++;
        }

        const processed = Math.min(i + BATCH_SIZE, total);
        const pct = Math.round((processed / total) * 100);
        const filled = Math.round(pct / 5);
        const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(20 - filled);

        const durationSoFar = Date.now() - startTime;
        const currentSpeed = (processed / (durationSoFar / 1000)).toFixed(1);

        const updateContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Role Assignment`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_LOADING} **Adding ${role}...**\n\`${bar}\` ${pct}%\n\`${processed}/${total}\` \u2022 \`${success}\` added \u2022 \`${failed}\` failed\n` +
            `${EMOJI_DOT} **Speed:** \`${currentSpeed} actions/s\``
          ));
        await progressMsg.edit({ components: [updateContainer] }).catch(() => { });

        if (i + BATCH_SIZE < targets.length) {
          await new Promise(r => setTimeout(r, BATCH_DELAY));
        }
      }

      const duration = Date.now() - startTime;
      const seconds = (duration / 1000).toFixed(1);
      const speed = ((success + failed) / (duration / 1000)).toFixed(1);

      const doneContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Role Assignment Complete`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **Role assignment finished.**\n` +
          `${EMOJI_DOT} **Role:** ${role}\n` +
          `${EMOJI_DOT} **Success:** \`${success}\` \u2022 **Failed:** \`${failed}\` \u2022 **Time:** \`${seconds}s\`\n` +
          `${EMOJI_DOT} **Speed:** \`${speed} actions/s\``
        ));

      await progressMsg.edit({ components: [doneContainer] }).catch(() => { });
    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: 32768 }).catch(() => { });
    }
  }
};
