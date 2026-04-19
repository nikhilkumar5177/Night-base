const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'eval',
  aliases: ['ev'],
  description: 'Evaluate JavaScript code',
  usage: 'eval <code>',
  cooldown: 0,
  enabled: true,
  staffOnly: false,
  devOnly: true,
  execute: async (client, message, args) => {
    if (message.author.id !== process.env.DEV_ID) return;
    const code = args.join(' ');
    if (!code) {
      return message.reply({ embeds: [new EmbedBuilder().setColor('#ff1744').setTitle('{EMOJI_ERROR} No Code').setDescription('Provide code to evaluate.').setTimestamp()] });
    }
    try {
      let result = eval(code);
      if (result instanceof Promise) result = await result;
      if (typeof result !== 'string') result = require('util').inspect(result, { depth: 2 });
      if (result.length > 4000) result = result.substring(0, 4000) + '...';
      result = result.replace(process.env.TOKEN, '[REDACTED]');
      const embed = new EmbedBuilder()
        .setColor('#00e676')
        .setTitle('{EMOJI_SUCCESS} Eval Result')
        .addFields({ name: 'Input', value: `\`\`\`js\n${code.substring(0, 1000)}\n\`\`\`` }, { name: 'Output', value: `\`\`\`js\n${result}\n\`\`\`` })
        .setTimestamp();
      message.reply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor('#ff1744')
        .setTitle('{EMOJI_ERROR} Eval Error')
        .setDescription(`\`\`\`js\n${error.message.substring(0, 4000)}\n\`\`\``)
        .setTimestamp();
      message.reply({ embeds: [embed] });
    }
  }
};
