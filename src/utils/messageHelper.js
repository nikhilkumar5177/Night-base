const { EmbedBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const { LIMITS, SEP, EMOJI_ERROR, EMOJI_ARROW, FOOTER_TEXT } = require('./constants');

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
 * Creates a V2 Container for error messages.
 * @param {string} text 
 * @returns {import('discord.js').ContainerBuilder}
 */
function cv2Error(text) {
    return new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Error`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_ERROR} ${text}`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
}

/**
 * Sends a premium "Wrong Syntax" V2 Container.
 * @param {import('discord.js').Message} message 
 * @param {object} command - The command module object
 */
async function sendUsage(message, command) {
    const prefix = message.client.config.prefix;
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Wrong Syntax`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**You used this command the wrong way.**\nRead the correct format below.\n\n` +
            `${EMOJI_ARROW} **Correct Format:**\n\`\`\`fix\n${prefix}${command.usage}\n\`\`\`\n` +
            `${EMOJI_ARROW} **Example:**\n\`\`\`\n${command.example ? command.example.split('\n').map(ex => prefix + ex).join('\n') : prefix + command.usage}\n\`\`\``
        ));

    const info = [];
    if (command.aliases?.length) info.push(`Aliases: \`${command.aliases.join(', ')}\``);
    if (command.cooldown) info.push(`Cooldown: \`${command.cooldown}s\``);
    
    if (info.length) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(info.join(' \u2502 ')));
    }

    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

    return sendAutoDelete(message, { components: [container], flags: 1 << 14 }, 15000); // 1 << 14 is IsComponentsV2
}

/**
 * Creates a V2 Container for expired sessions.
 * @returns {import('discord.js').ContainerBuilder}
 */
function cv2Expire() {
    return new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Session Expired`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`This interaction has expired due to inactivity.\nPlease use the command again to continue.`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
}

module.exports = { sendAutoDelete, sendUsage, cv2Error, cv2Expire };
