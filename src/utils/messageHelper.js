const { LIMITS } = require('./constants');

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
        
        const sent = isMessage ? await channelOrMessage.reply(options) : await channel.send(options);
        if (ms > 0) setTimeout(() => sent.delete().catch(() => { }), ms);
        return sent;
    } catch (err) {
        console.error('Error in sendAutoDelete:', err);
        return null;
    }
}

module.exports = { sendAutoDelete };
