const { EmbedBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { LIMITS, SEP, EMOJI_ERROR, EMOJI_ARROW, EMOJI_INFO, FOOTER_TEXT } = require('./constants');

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

        if (ms > 0) setTimeout(() => safeDelete(sent), ms);
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
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Error`))
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
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Wrong Syntax`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**You used this command the wrong way.**\nRead the correct format below.\n\n` +
            `${EMOJI_ARROW} **Correct Format:**\n\`\`\`fix\n${prefix}${command.usage}\n\`\`\`\n` +
            `${EMOJI_ARROW} **Example:**\n\`\`\`\n${command.example ? command.example.split('\n').map(ex => prefix + ex).join('\n') : prefix + command.usage}\n\`\`\``
        ));

    const info = [];
    if (command.aliases?.length) info.push(`Aliases: \`${command.aliases.join(', ')}\``);
    if (command.cooldown) info.push(`\nCooldown: \`${command.cooldown}s\``);
    
    if (info.length) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(info.join(` ${EMOJI_ARROW} `)));
    }

    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

    return sendAutoDelete(message, { components: [container], flags: MessageFlags.IsComponentsV2 }, 15000);
}

/**
 * Global Mention Control Defaults
 */
const SAFE_DEFAULTS = {
    allowedMentions: { parse: [] },
    flags: MessageFlags.IsComponentsV2
};

/**
 * Merges security defaults with provided options.
 * @param {object} options 
 * @returns {object}
 */
function injectSafe(options = {}) {
    if (typeof options === 'string') options = { content: options };
    return { ...SAFE_DEFAULTS, ...options };
}

/**
 * Safely replies to a message or interaction with mention protection.
 * @param {import('discord.js').Message | import('discord.js').Interaction} target 
 * @param {object|string} options 
 * @returns {Promise<import('discord.js').Message>}
 */
async function safeReply(target, options) {
    const payload = injectSafe(options);
    if (target.replied || target.deferred) {
        return target.followUp(payload);
    }
    if (target.reply) {
        return target.reply(payload);
    }
    return null;
}

/**
 * Safely sends a message to a channel with mention protection.
 * @param {import('discord.js').TextChannel | import('discord.js').DMChannel} channel 
 * @param {object|string} options 
 * @returns {Promise<import('discord.js').Message>}
 */
async function safeSend(channel, options) {
    return channel.send(injectSafe(options));
}

/**
 * Safely edits a message or interaction response with mention protection.
 * @param {import('discord.js').Message | import('discord.js').Interaction} target 
 * @param {object|string} options 
 * @returns {Promise<import('discord.js').Message>}
 */
async function safeEdit(target, options) {
    const payload = injectSafe(options);
    if (target.editReply) {
        return target.editReply(payload);
    }
    if (target.edit) {
        return target.edit(payload);
    }
    return null;
}

/**
 * Safely updates an interaction with mention protection.
 * @param {import('discord.js').Interaction} interaction 
 * @param {object|string} options 
 */
async function safeUpdate(interaction, options) {
    const payload = injectSafe(options);
    if (interaction.update) {
        return interaction.update(payload).catch(() => {});
    }
    return null;
}

/**
 * Sanitizes content to prevent markdown breakages or pings.
 * @param {string} text 
 * @returns {string}
 */
function sanitizeContent(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/@/g, '@\u200b').replace(/`/g, '`\u200b');
}

/**
 * Creates a V2 Container for expired sessions.
 * @returns {import('discord.js').ContainerBuilder}
 */
function cv2Expire() {
    return new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Session Expired`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`This interaction has expired due to inactivity.\nPlease use the command again to continue.`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
}

/**
 * Safely deletes a message or interaction reply and ensures it is ignored by the ghost ping detector.
 * @param {import('discord.js').Message | import('discord.js').Interaction} target 
 */
async function safeDelete(target) {
    if (!target) return;
    
    const client = target.client;
    const msgId = target.id;
    if (client && msgId) {
        if (!client.ignoredDeletes || !(client.ignoredDeletes instanceof Set)) {
            client.ignoredDeletes = new Set();
        }
        client.ignoredDeletes.add(msgId);
        setTimeout(() => {
            if (client.ignoredDeletes) client.ignoredDeletes.delete(msgId);
        }, 15000);
    }

    if (typeof target.delete === 'function') {
        return target.delete().catch(() => { });
    }
    if (typeof target.deleteReply === 'function') {
        return target.deleteReply().catch(() => { });
    }
}

module.exports = { 
    sendAutoDelete, 
    sendUsage, 
    cv2Error, 
    cv2Expire, 
    safeReply, 
    safeSend, 
    safeEdit,
    safeUpdate,
    sanitizeContent,
    injectSafe,
    safeDelete,
    triggerReminder
};

/**
 * Shared utility to trigger a reminder (used by command and ready event)
 * @param {import('discord.js').Client} client 
 * @param {object} reminder 
 */
async function triggerReminder(client, reminder) {

    try {
        const channel = client.channels.cache.get(reminder.channelId) || await client.channels.fetch(reminder.channelId).catch(() => null);
        const allNotify = [...new Set([reminder.userId, ...(reminder.mentions || [])])];
        
        // Check if setter is Dev or Guild Owner
        const devIds = (process.env.DEV_ID || '').split(',');
        const isDev = devIds.includes(reminder.userId);
        let isOwner = false;
        
        if (channel && channel.guild) {
            if (channel.guild.ownerId === reminder.userId) isOwner = true;
        }

        if (channel) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf ${EMOJI_ARROW} Reminder`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_INFO} **Reminder:**\n${reminder.message}`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

            await channel.send({
                content: allNotify.map(id => `<@${id}>`).join(' '),
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { users: allNotify }
            }).catch(() => { });
        }

        // Send Raw DM ONLY IF setter is Dev or Guild Owner
        if (isDev || isOwner) {
            for (const uid of allNotify) {
                const user = client.users.cache.get(uid) || await client.users.fetch(uid).catch(() => null);
                if (user) {
                    await user.send(`**Reminder:** ${reminder.message}`).catch(() => { });
                }
            }
        }
    } catch (err) {
        // Silently catch or log properly
    }
}
