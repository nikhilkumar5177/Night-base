const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const { exec } = require('child_process');
const { EMOJI_OWNER } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'exec',
  aliases: ['sh', 'bash', 'cmd'],
  description: 'Execute shell commands on the host machine',
  usage: 'exec <command>',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  premiumOnly: false,
  execute: async (client, message, args) => {
    if (message.author.id !== process.env.DEV_ID) return;
    
    const cmd = args.join(' ');
    if (!cmd) return message.reply({ components: [cv2Error('Provide a command to execute.')], flags: 32768 });

    // Show processing state
    const loadingContainer = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('⏳ Executing command...'));
    const processMsg = await message.reply({ components: [loadingContainer], flags: 32768 });

    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      let output = stdout || stderr || 'No output.';
      if (error && !stderr) output = error.message;
      
      // Trim output to fit in Discord limits (keep bottom part)
      if (output.length > 3900) {
        output = '... ' + output.substring(output.length - 3900);
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **Terminal Execution**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Command:**\n\`\`\`bash\n${cmd}\n\`\`\``))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Output:**\n\`\`\`bash\n${output}\n\`\`\``));

      processMsg.edit({ components: [container], flags: 32768 }).catch(() => {});
    });
  }
};
