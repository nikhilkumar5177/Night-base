const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { EMOJI_OWNER, EMOJI_ARROW } = require('../../utils/constants');
const { cv2Error } = require('../../utils/messageHelper');

module.exports = {
  name: 'eval',
  aliases: ['ev'],
  description: 'Evaluate JavaScript code',
  usage: 'eval <code>',
  cooldown: 0,
  enabled: true,
  devOnly: true,
  execute: async (client, message, args) => {
    if (message.author.id !== process.env.DEV_ID) return;
    const code = args.join(' ');
    if (!code) return message.reply({ components: [cv2Error('Provide code to evaluate.')], flags: 32768 });

    try {
      let result = eval(code);
      if (result instanceof Promise) result = await result;
      if (typeof result !== 'string') result = require('util').inspect(result, { depth: 2 });
      if (result.length > 4000) result = result.substring(0, 4000) + '...';
      result = result.replace(process.env.TOKEN, '[REDACTED]');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} **Eval Result**`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Input:**\n\`\`\`js\n${code.substring(0, 500)}\n\`\`\``))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Output:**\n\`\`\`js\n${result}\n\`\`\``));

      message.reply({ components: [container], flags: 32768 }).catch(() => {});
    } catch (error) {
      const errContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Eval Error`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`\`\`js\n${error.message}\n\`\`\``));
      message.reply({ components: [errContainer], flags: 32768 }).catch(() => {});
    }
  }
};
