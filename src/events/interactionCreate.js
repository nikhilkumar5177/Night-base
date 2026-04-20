const { EmbedBuilder, InteractionType, ComponentType } = require('discord.js');
const storage = require('../utils/storageManager');
const logger = require('../utils/logger');
const { LIMITS, resolveEmbedEmojis, resolveEmojis } = require('../utils/constants');

module.exports = {
  name: 'interactionCreate',
  once: false,
  execute: async (client, interaction) => {
    // --- Slash Commands ---
    if (interaction.type === InteractionType.ApplicationCommand) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // --- Security & Permissions ---
      const runtimeConfig = storage.read('config.json');
      const disabledCommands = runtimeConfig.disabledCommands || [];
      if (disabledCommands.includes(command.name)) {
        return interaction.reply({ content: resolveEmojis('{EMOJI_ERROR} This command is currently disabled.'), ephemeral: true });
      }

      const blacklistData = storage.read('blacklist.json');
      if (blacklistData.users && blacklistData.users.includes(interaction.user.id)) return;

      if (command.staffOnly) {
        const staffData = storage.read('staff.json');
        const memberRoles = interaction.member ? interaction.member.roles.cache.map(r => r.id) : [];
        const isStaff = staffData.roles && staffData.roles.some(r => memberRoles.includes(r));
        const isDev = interaction.user.id === process.env.DEV_ID;

        if (!isStaff && !isDev) {
          return interaction.reply({
            embeds: [
              resolveEmbedEmojis(new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
                .setDescription('{EMOJI_ERROR} You are not a **Staff member** of this server.').toJSON())
            ],
            ephemeral: true
          });
        }
      }

      if (command.devOnly && interaction.user.id !== process.env.DEV_ID) {
        return interaction.reply({
          embeds: [
            resolveEmbedEmojis(new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription('{EMOJI_OWNER} This is an **Owner Command**.').toJSON())
          ],
          ephemeral: true
        });
      }

      // --- Cooldowns ---
      const cooldownAmount = (command.cooldown !== undefined ? command.cooldown : (LIMITS.COOLDOWN_DEFAULT || 3)) * 1000;
      if (cooldownAmount > 0) {
        const key = `${interaction.user.id}-${command.name}`;
        const now = Date.now();
        if (client.cooldowns.has(key)) {
          const expiresAt = client.cooldowns.get(key);
          if (now < expiresAt) {
            const remaining = ((expiresAt - now) / 1000).toFixed(1);
            return interaction.reply({ content: resolveEmojis(`{EMOJI_WARN} Cooldown active. Wait **${remaining}s**.`), ephemeral: true });
          }
        }
        client.cooldowns.set(key, now + cooldownAmount);
        setTimeout(() => client.cooldowns.delete(key), cooldownAmount);
      }

      // --- Execution ---
      try {
        await command.execute(client, interaction, []);
        logger.cmd(interaction.user.tag, `[Slash] ${command.name}`);

        // Analytics
        const analytics = storage.read('analytics.json');
        if (!analytics[command.name]) analytics[command.name] = { uses: 0, lastUsed: 0, users: {} };
        analytics[command.name].uses++;
        analytics[command.name].lastUsed = Date.now();
        if (!analytics[command.name].users[interaction.user.id]) analytics[command.name].users[interaction.user.id] = 0;
        analytics[command.name].users[interaction.user.id]++;
        storage.write('analytics.json', analytics);
      } catch (error) {
        logger.error(`Slash Command ${command.name} failed: ${error.message}`);
        if (interaction.replied || interaction.deferred) {
          interaction.followUp({ content: resolveEmojis(`{EMOJI_ERROR} Error: ${error.message}`), ephemeral: true }).catch(() => { });
        } else {
          interaction.reply({ content: resolveEmojis(`{EMOJI_ERROR} Error: ${error.message}`), ephemeral: true }).catch(() => { });
        }
      }
    }
    // --- Autocomplete ---
    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        if (interaction.commandName === 'help') {
          const focusedValue = interaction.options.getFocused().toLowerCase();
          const choices = client.commands.map(cmd => cmd.name);
          const filtered = choices.filter(choice => choice.startsWith(focusedValue)).slice(0, 25);
          await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice }))
          );
        }
      } catch (error) {
        logger.error(`Autocomplete error: ${error.message}`);
      }
    }

    // --- Message Components (Buttons, Select Menus) ---
    if (interaction.type === InteractionType.MessageComponent) {
      if (interaction.customId.startsWith('automod_')) {
        const command = client.commands.get('automod');
        if (command) return command.execute(client, interaction);
      }
    }

    // --- Modal Submits ---
    if (interaction.type === InteractionType.ModalSubmit) {
      if (interaction.customId.startsWith('automod_modal_')) {
        const command = client.commands.get('automod');
        if (command) return command.execute(client, interaction);
      }
    }
  }
};
