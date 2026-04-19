const { resolveEmbedEmojis, LIMITS } = require('./constants');

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
        const target = isMessage ? channelOrMessage : channelOrMessage;
        
        // Resolve emojis in embeds if present
        if (options.embeds) {
            options.embeds = options.embeds.map(e => {
                const raw = typeof e.toJSON === 'function' ? e.toJSON() : e;
                return resolveEmbedEmojis(raw);
            });
        }

        const sent = isMessage ? await channelOrMessage.reply(options) : await channelOrMessage.send(options);
        if (ms > 0) setTimeout(() => sent.delete().catch(() => { }), ms);
        return sent;
    } catch (err) {
        console.error('Error in sendAutoDelete:', err);
        return null;
    }
}

module.exports = { sendAutoDelete };
