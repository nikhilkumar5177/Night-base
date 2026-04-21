const { EmbedBuilder } = require('discord.js');
const { LIMITS, SEP } = require('./constants');

/**
 * Sends a message and automatically deletes it after a specified time.
 * @param {import('discord.js').TextChannel | import('discord.js').Message} channelOrMessage - Where to send the message
 * @param {object} options - Discord message options (embeds, content, etc.)
 * @param {number} ms - Time in milliseconds before deletion (defaults to LIMITS.AUTO_DELETE_MS)
 * @returns {Promise<import('discord.js').Message>}
 */
async function sendAutoDelete(channelOrMessage, options, ms = LIMITS.AUTO_DELETE_MS || 10000) {
    try {
        const isMessage = !!channelOrMessage.reply;
        const channel = channelOrMessage.channel || channelOrMessage;
        
        let sent;
        if (isMessage) {
            try {
                sent = await channelOrMessage.reply(options);
            } catch (replyErr) {
                // If reply fails (e.g. unknown message), fall back to channel.send
                sent = await channel.send(options);
            }
        } else {
            sent = await channel.send(options);
        }

        if (ms > 0) setTimeout(() => sent.delete().catch(() => { }), ms);
        return sent;
    } catch (err) {
        console.error('Error in sendAutoDelete:', err);
        return null;
    }
}

/**
 * Sends a premium "Wrong Syntax" embed.
 * @param {import('discord.js').Message} message 
 * @param {object} command - The command module object
 */
async function sendUsage(message, command) {
    const prefix = message.client.config.prefix;
    const embed = new EmbedBuilder()
        .setColor('#8B0000') // Dark red for errors
        .setAuthor({ name: 'WRONG SYNTAX', iconURL: message.client.user.displayAvatarURL() })
        .setDescription('**You used this command the wrong way.**\nRead the correct format below before trying again.')
        .addFields(
            { name: `${SEP}\n\u25B8 Correct Format`, value: `\`\`\`fix\n${prefix}${command.usage}\n\`\`\`` },
            { name: '\u25B8 Examples', value: `\`\`\`\n${command.example ? command.example.split('\n').map(ex => prefix + ex).join('\n') : prefix + command.usage}\n\`\`\`` }
        );

    const info = [];
    if (command.aliases?.length) info.push(`**Aliases:** \`${command.aliases.join(', ')}\``);
    if (command.cooldown) info.push(`**Cooldown:** \`${command.cooldown}s\``);
    if (command.category) info.push(`**Category:** \`${command.category}\``);

    if (info.length) {
        embed.addFields({ name: '\u25B8 Command Info', value: info.join('\n') });
    }

    embed.setFooter({ text: 'Wild Wolf \u2022 Use it right or don\'t use it at all.' })
        .setTimestamp();

    return sendAutoDelete(message, { embeds: [embed] }, 15000);
}

module.exports = { sendAutoDelete, sendUsage };
