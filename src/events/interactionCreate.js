const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, InteractionType, MessageFlags } = require('discord.js');
const storage = require('../utils/storageManager');
const logger = require('../utils/logger');
const { LIMITS, EMOJI_OWNER, EMOJI_WARN, EMOJI_ERROR } = require('../utils/constants');
const { cv2Error } = require('../utils/messageHelper');

module.exports = {
  name: 'interactionCreate',
  once: false,
  execute: async (client, interaction) => {
    if (interaction.type === InteractionType.ApplicationCommand) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const runtimeConfig = storage.read('config.json');
      const devIds = process.env.DEV_ID ? process.env.DEV_ID.split(',').map(id => id.trim()) : [];
      const isDev = devIds.includes(interaction.user.id);

      if (runtimeConfig.disabledCommands?.includes(command.name)) {
        return interaction.reply({ components: [cv2Error('This command is currently disabled.')], flags: MessageFlags.IsComponentsV2, ephemeral: true }).catch(() => { });
      }
      if (runtimeConfig.maintenance && !isDev) {
        const maintContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 System Lockdown`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_OWNER} ${EMOJI_WARN} **Bot is currently under maintenance.**\nPlease try again later.`));
        return interaction.reply({ components: [maintContainer], flags: MessageFlags.IsComponentsV2, ephemeral: true });
      }

      const blacklistData = storage.read('blacklist.json');
      if (blacklistData.users?.includes(interaction.user.id)) return;

      if (command.staffOnly) {
        const staffData = storage.read('staff.json');
        const guildRoles = staffData[interaction.guildId]?.roles || [];
        const memberRoles = interaction.member ? interaction.member.roles.cache.map(r => r.id) : [];
        const isStaff = guildRoles.some(r => memberRoles.includes(r));
        if (!isStaff && !isDev) {
          return interaction.reply({ components: [cv2Error('You are not a **Staff member** of this server.')], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }
      }

      if (command.devOnly && !isDev) {
        return interaction.reply({ components: [cv2Error(`${EMOJI_OWNER} This is an **Owner Command**.`)], flags: MessageFlags.IsComponentsV2, ephemeral: true });
      }

      const cooldownAmount = (command.cooldown !== undefined ? command.cooldown : (LIMITS.COOLDOWN_DEFAULT || 3)) * 1000;
      if (cooldownAmount > 0) {
        const key = `${interaction.user.id}-${command.name}`;
        const now = Date.now();
        if (client.cooldowns.has(key)) {
          const expiresAt = client.cooldowns.get(key);
          if (now < expiresAt) {
            const remaining = ((expiresAt - now) / 1000).toFixed(1);
            return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_WARN} Cooldown active. Wait **${remaining}s**.`))], flags: MessageFlags.IsComponentsV2, ephemeral: true }).catch(() => { });
          }
        }
        client.cooldowns.set(key, now + cooldownAmount);
        setTimeout(() => client.cooldowns.delete(key), cooldownAmount);
      }

      try {
        await command.execute(client, interaction, []);
        logger.cmd(interaction.user.tag, `[Slash] ${command.name}`);
        const analytics = storage.read('analytics.json');
        if (!analytics[command.name]) analytics[command.name] = { uses: 0, lastUsed: 0, users: {} };
        analytics[command.name].uses++;
        analytics[command.name].lastUsed = Date.now();
        if (!analytics[command.name].users[interaction.user.id]) analytics[command.name].users[interaction.user.id] = 0;
        analytics[command.name].users[interaction.user.id]++;
        storage.write('analytics.json', analytics);
      } catch (error) {
        logger.error(`Slash Command ${command.name} failed: ${error.message}`);
        const errLogId = client.config.errorLogChannelId;
        if (errLogId) {
          const errLogCh = client.channels.cache.get(errLogId);
          if (errLogCh) {
            const logContainer = new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Slash Error Log`))
              .addSeparatorComponents(new SeparatorBuilder())
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_ERROR} **Slash Command Failed:** \`${command.name}\` \n\u25B8 **User:** ${interaction.user.tag}\n\u25B8 **Error:** \`\`\`\n${error.message}\n\`\`\``));
            errLogCh.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
          }
        }
        const resp = { components: [cv2Error(`Error: ${error.message}`)], flags: MessageFlags.IsComponentsV2, ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(resp).catch(() => { });
        else await interaction.reply(resp).catch(() => { });
      }
    } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      const command = client.commands.get(interaction.commandName);
      if (command && interaction.commandName === 'help') {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = client.commands.map(cmd => cmd.name);
        const filtered = choices.filter(choice => choice.startsWith(focusedValue)).slice(0, 25);
        await interaction.respond(filtered.map(choice => ({ name: choice, value: choice }))).catch(() => { });
      }
    } else if (interaction.type === InteractionType.MessageComponent) {
      if (interaction.customId.startsWith('automod_')) {
        const command = client.commands.get('automod');
        if (command) return command.execute(client, interaction);
      }
    } else if (interaction.type === InteractionType.ModalSubmit) {
      if (interaction.customId.startsWith('automod_modal_')) {
        const command = client.commands.get('automod');
        if (command) return command.execute(client, interaction);
      }
    }
  }
};
