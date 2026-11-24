const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { EMOJI_LOADING, EMOJI_SUCCESS, EMOJI_ERROR, EMOJI_OWNER, EMOJI_DOT, FOOTER_TEXT, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error, safeDelete } = require('../../utils/messageHelper');
const storage = require('../../utils/storageManager');

module.exports = {
  name: 'update',
  description: 'Update the bot to the latest version or a specific commit',
  usage: 'update [commit_id]',
  cooldown: 0,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Update the bot to the latest version or a specific commit')
    .addStringOption(opt => opt.setName('commit').setDescription('Specific commit ID to update to').setRequired(false)),
  devOnly: true,
  execute: async (client, message, args) => {
    const isInteraction = !message.author;
    const user = isInteraction ? message.user : message.author;

    const devIds = process.env.DEV_ID ? process.env.DEV_ID.split(',').map(id => id.trim()) : [];
    if (!devIds.includes(user.id)) return; // Silent ignore as requested

    const commitId = (isInteraction ? message.options.getString('commit') : args[0])?.trim();
    if (commitId && !/^[a-zA-Z0-9_./-]+$/.test(commitId)) {
      return message.reply({
        components: [cv2Error('Invalid commit ID or branch name format. Use only alphanumeric characters, dots, dashes, and slashes.')],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    const targetLabel = commitId ? `Commit: \`${commitId}\`` : 'Latest Origin';

    const loadContainer = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} System Hotpatch`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} ${EMOJI_LOADING} **Synchronizing with repository...**\n${EMOJI_DOT} **Target:** ${targetLabel}`));

    const msg = await message.reply({
      components: [loadContainer],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: isInteraction
    }).catch(() => { });

    const projectRoot = path.resolve(__dirname, '../../..');
    const repoUrl = process.env.GIT_REPO || 'https://github.com/nikhilkumar5177/Night-base.git';
    const hasGit = fs.existsSync(path.join(projectRoot, '.git'));

    let gitCmd = `git config --global --add safe.directory "*" && `;
    if (!hasGit) {
      gitCmd += `git init && git remote add origin ${repoUrl} && `;
    }
    gitCmd += commitId
      ? `git fetch --all && git reset --hard ${commitId} && git clean -fd`
      : `git fetch --all && git reset --hard origin/main && git clean -fd`;

    exec(gitCmd, { cwd: projectRoot }, async (err, stdout, stderr) => {
      if (err) {
        return msg.edit({
          components: [cv2Error(`Git operation failed: ${err.message}`)],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
      }

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Patch Deployment Successful`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${EMOJI_SUCCESS} **System core has been synchronized.**\n\n` +
          `${EMOJI_DOT} **Source:** \`${commitId || 'Main Branch'}\`\n` +
          `${EMOJI_DOT} **Status:** \`Files Overwritten & Cleaned\`\n` +
          `**Log Output:**\n\`\`\`\n${stdout.slice(0, 500) || 'No output'}\n\`\`\``
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

      successContainer.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('sys_restart_after_update')
          .setLabel('Restart Engine')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('\u267B')
      ));

      await msg.edit({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => { });

      const filter = i => devIds.includes(i.user.id) && i.customId === 'sys_restart_after_update';
      const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async i => {
        const restartContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} System Reboot`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **Kernel is restarting...**`));

        await i.update({ components: [restartContainer], flags: MessageFlags.IsComponentsV2 });
        setTimeout(async () => {
          await storage.stopPeriodicFlush();
          process.exit(0);
        }, 1000);
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          safeDelete(msg);
        }
      });
    });
  }
};