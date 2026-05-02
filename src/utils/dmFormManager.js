const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ChannelType } = require('discord.js');
const storage = require('./storageManager');
const { EMOJI_DOT, EMOJI_SUCCESS, EMOJI_INFO, FOOTER_TEXT } = require('./constants');
const { safeSend } = require('./messageHelper');

/**
 * Handles incoming Direct Messages from users.
 */
async function handleIncomingDM(client, message) {
    const config = storage.read('config.json');
    if (!config.dmLogChannelId) return;

    const logChannel = client.channels.cache.get(config.dmLogChannelId);
    if (!logChannel) return;

    const threads = storage.read('dmThreads.json');
    let threadId = threads[message.author.id];
    let thread;

    if (threadId) {
        thread = await client.channels.fetch(threadId).catch(() => null);
    }

    const isBot = message.author.id === client.user.id;
    const isOtherBot = message.author.bot && !isBot;
    const origin = isBot ? 'Response Sent' : (isOtherBot ? 'Other Bot DM' : 'New DM Received');
    const colorEmoji = isBot ? EMOJI_SUCCESS : EMOJI_INFO;

    // Format the "Form" log
    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 ${origin}`))
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${colorEmoji} **${isBot ? 'Bot' : 'From'}:** ${message.author.tag} (\`${message.author.id}\`)\n` +
            `${EMOJI_DOT} **Message:** ${message.content || '*No text content*'}`
        ));

    if (message.attachments.size > 0) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_DOT} **Attachments:** ${message.attachments.map(a => `[${a.name}](${a.url})`).join(', ')}`
        ));
    }

    container.addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

    if (!thread) {
        // Create new thread for this user
        try {
            const isForum = logChannel.type === ChannelType.GuildForum;
            const threadOptions = {
                name: `${message.author.tag} (${message.author.id})`,
                autoArchiveDuration: 10080,
                reason: `DM Conversation with ${message.author.tag}`,
            };

            if (isForum) {
                threadOptions.message = {
                    content: `**DM Conversation History: ${message.author.tag}**`,
                };
            } else {
                threadOptions.type = ChannelType.GuildPublicThread;
            }

            thread = await logChannel.threads.create(threadOptions);
            
            threads[message.author.id] = thread.id;
            threads[thread.id] = message.author.id;
            storage.write('dmThreads.json', threads);

            if (isForum) {
                // For forums, we must send the V2 container as a follow-up message
                await safeSend(thread, { components: [container] });
                return;
            }
        } catch (err) {
            console.error('[DM Manager] Failed to create thread:', err);
            return;
        }
    }


    await safeSend(thread, { components: [container] }).catch(() => {});
}

/**
 * Handles outgoing staff messages from the log thread.
 */
async function handleStaffReply(client, message) {
    const config = storage.read('config.json');
    if (!config.dmLogChannelId) return;
    if (!message.channel.isThread()) return;
    if (message.channel.parentId !== config.dmLogChannelId) return;

    const threads = storage.read('dmThreads.json');
    const userId = threads[message.channel.id];
    if (!userId) return;

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return;

    try {
        // Forward to user
        await user.send(`\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\n**Response from ${message.guild.name} Staff:**\n\n${message.content}\n\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC\u25AC`).catch(err => {
            message.reply({ content: `\u274C **Failed to DM user:** ${err.message}` });
            throw err;
        });

        // Confirm in thread
        const confirmContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Response Sent`))
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `${EMOJI_SUCCESS} **Staff Response Forwarded**\n` +
                `${EMOJI_DOT} **To:** ${user.tag}\n` +
                `${EMOJI_DOT} **By:** ${message.author.tag}`
            ));
        
        await message.delete().catch(() => {}); // Clean up the raw staff message
        await safeSend(message.channel, { components: [confirmContainer] });
        
    } catch (err) {
        // Error already handled in the send catch
    }
}

/**
 * Retroactively syncs existing DM conversations.
 */
async function syncDMs(client) {
    const config = storage.read('config.json');
    if (!config.dmLogChannelId) throw new Error('dmLogChannelId is not configured.');

    const logChannel = client.channels.cache.get(config.dmLogChannelId);
    if (!logChannel) throw new Error('Forms channel not found in cache.');

    const users = client.users.cache.filter(u => !u.bot);
    let syncedCount = 0;

    for (const [userId, user] of users) {
        try {
            const dmChannel = await user.createDM().catch(() => null);
            if (!dmChannel) continue;

            const messages = await dmChannel.messages.fetch({ limit: 50 }).catch(() => null);
            if (!messages || messages.size === 0) continue;

            // Check if user has sent any message
            const userMessages = messages.filter(m => m.author.id === userId);
            if (userMessages.size === 0) continue;

            // Sort messages by timestamp
            const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            // Re-use handleIncomingDM logic for each message to populate the thread
            // This will automatically create the thread if it doesn't exist
            for (const msg of sorted.values()) {
                await handleIncomingDM(client, msg);
            }
            syncedCount++;
        } catch (err) {
            console.error(`[DM Sync] Failed for ${userId}:`, err.message);
        }
    }
    return syncedCount;
}

module.exports = { handleIncomingDM, handleStaffReply, syncDMs };
