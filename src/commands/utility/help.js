const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, SlashCommandBuilder } = require('discord.js');
const { 
  SEP, 
  EMOJI_DOT, 
  EMOJI_ERROR, 
  EMOJI_SUCCESS, 
  EMOJI_ARROW, 
  EMOJI_ARROW_LEFT, 
  EMOJI_ARROW_RIGHT 
} = require('../../utils/constants');

const ARROW_ICON = '\u25B8';

const CATEGORY_META = {
  moderation: { label: 'Moderation', desc: 'Server moderation and member management tools' },
  utility: { label: 'Utility', desc: 'Information, lookup, and general purpose commands' },
  config: { label: 'Config', desc: 'Bot configuration and server settings' },
  security: { label: 'Security', desc: 'Anti-nuke, anti-spam, and protection systems' },
  staff: { label: 'Staff', desc: 'Staff role and permission management' },
  blacklist: { label: 'Blacklist', desc: 'User and command blacklist management' },
  roles: { label: 'Roles', desc: 'Alias roles, voice roles, and role automation' },
  vouch: { label: 'Vouch', desc: 'Vouch channel and reputation system' },
  snipe: { label: 'Snipe', desc: 'Deleted message recovery and management' },
  dev: { label: 'Developer', desc: 'Bot developer tools and diagnostics' }
};

module.exports = {
  name: 'help',
  aliases: ['h', 'commands', 'menu'],
  description: 'Interactive help dashboard with category navigation',
  usage: 'help [command]',
  cooldown: 5,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Interactive help dashboard with category navigation')
    .addStringOption(opt => opt.setName('command').setDescription('The command to get help for').setRequired(false).setAutocomplete(true)),
  staffOnly: false,
  devOnly: false,
  execute: async (client, message, args) => {
    const isInteraction = !message.author;
    const user = isInteraction ? message.user : message.author;
    const guild = message.guild;
    const cmdInput = isInteraction ? message.options.getString('command') : args[0];
    try {
      // ── Single command detail (text shortcut) ──
      if (cmdInput) {
        const cmdName = cmdInput.toLowerCase();
        const command = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
        if (!command) {
          const errEmbed = new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} No command found with name \`${cmdName}\`.`).setTimestamp();
          return isInteraction ? message.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => {}) : message.reply({ embeds: [errEmbed] }).catch(() => {});
        }
        const embed = buildCommandEmbed(client, message, command);
        return isInteraction ? message.reply({ embeds: [embed], components: [buildHomeButton()] }).catch(() => {}) : message.reply({ embeds: [embed], components: [buildHomeButton()] }).catch(() => {});
      }

      // ── Build categories map (cached per invocation) ──
      const categories = {};
      client.commands.forEach(cmd => {
        if (cmd.devOnly && user.id !== process.env.DEV_ID) return;
        const cat = cmd.category || 'uncategorized';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd);
      });

      // Sort commands alphabetically within each category
      for (const cat of Object.keys(categories)) {
        categories[cat].sort((a, b) => a.name.localeCompare(b.name));
      }

      let state = { view: 'home', category: null, page: 0 };

      // ══════════════════════════════════════════════
      // ── EMBED BUILDERS
      // ══════════════════════════════════════════════

      function buildHomeEmbed() {
        const totalCmds = client.commands.size;

        const catOrder = Object.keys(CATEGORY_META);
        const allCatKeys = [...catOrder.filter(k => categories[k]), ...Object.keys(categories).filter(k => !catOrder.includes(k))];

        const categoryList = allCatKeys.map(cat => {
          const meta = CATEGORY_META[cat] || { label: cat };
          const count = categories[cat].length;
          return `${EMOJI_ARROW} **${meta.label}** \u2014 \`${count}\` commands`;
        }).join('\n');

        return new EmbedBuilder()
          .setColor('#2B2D31')
          .setAuthor({ name: 'Wild Wolf \u2502 Command Center', iconURL: client.user.displayAvatarURL() })
          .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
          .setDescription(
            `${SEP}\n\n` +
            `Welcome to **Wild Wolf** command center.\n` +
            `Use the dropdown below to browse categories,\n` +
            `or type \`${client.config.prefix}help <command>\` for details.\n\n` +
            `${SEP}\n\n` +
            categoryList +
            `\n\n${EMOJI_DOT} **Total Commands:** \`${totalCmds}\`\n` +
            `${EMOJI_DOT} **Prefix:** \`${client.config.prefix}\`\n` +
            `${EMOJI_DOT} **Support:** ${client.config.supportServer}\n\n` +
            `${SEP}`
          )
          .setFooter({ text: 'Wild Wolf \u2022 Select a category below', iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
      }

      function buildCategoryEmbed(catKey) {
        const cmds = categories[catKey];
        if (!cmds) return buildHomeEmbed();
        const meta = CATEGORY_META[catKey] || { label: catKey, desc: '' };

        const cmdList = cmds.map(c => {
          return `\`${client.config.prefix}${c.name}\` \n${EMOJI_DOT} ${c.description || 'No description'}`;
        }).join('\n\n');

        return new EmbedBuilder()
          .setColor('#5865F2')
          .setAuthor({ name: `Wild Wolf \u2502 ${meta.label}`, iconURL: client.user.displayAvatarURL() })
          .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setDescription(
            `${SEP}\n` +
            `**${meta.label} Commands**\n` +
            `${meta.desc}\n` +
            `${SEP}\n\n` +
            cmdList +
            `\n\n${SEP}`
          )
          .setFooter({ text: `Wild Wolf \u2022 ${cmds.length} commands \u2502 Select a command below for details`, iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
      }

      function buildAllCommandsEmbed(page) {
        const allCmds = [];
        const catOrder = Object.keys(CATEGORY_META);
        const allCatKeys = [...catOrder.filter(k => categories[k]), ...Object.keys(categories).filter(k => !catOrder.includes(k))];

        for (const cat of allCatKeys) {
          const meta = CATEGORY_META[cat] || { label: cat };
          allCmds.push({ header: true, label: meta.label });
          for (const cmd of categories[cat]) {
            allCmds.push({ header: false, cmd });
          }
        }

        const perPage = 20;
        const totalPages = Math.ceil(allCmds.length / perPage);
        const slice = allCmds.slice(page * perPage, (page + 1) * perPage);

        let text = '';
        for (const item of slice) {
          if (item.header) {
            text += `\n**${ARROW_ICON} ${item.label}**\n`;
          } else {
            text += `${EMOJI_DOT} \`${client.config.prefix}${item.cmd.name}\` \u2014 ${item.cmd.description || 'No description'}\n`;
          }
        }

        return {
          embed: new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'Wild Wolf \u2502 All Commands', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n${text}\n${SEP}`)
            .setFooter({ text: `Wild Wolf \u2022 Page ${page + 1}/${totalPages} \u2502 ${client.commands.size} total commands`, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp(),
          totalPages
        };
      }

      // ══════════════════════════════════════════════
      // ── COMPONENT BUILDERS
      // ══════════════════════════════════════════════

      function buildCategoryDropdown() {
        const catOrder = Object.keys(CATEGORY_META);
        const availableCats = [...catOrder.filter(k => categories[k]), ...Object.keys(categories).filter(k => !catOrder.includes(k))];

        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('help_cat')
            .setPlaceholder('Select a Category')
            .addOptions(availableCats.map(cat => {
              const meta = CATEGORY_META[cat] || { label: cat, desc: '' };
              return {
                label: meta.label,
                value: cat,
                description: `${(categories[cat] || []).length} commands`
              };
            }))
        );
      }

      function buildCommandDropdown(catKey) {
        const cmds = categories[catKey];
        if (!cmds || cmds.length === 0) return null;

        const options = cmds.slice(0, 25).map(c => ({
          label: c.name,
          value: c.name,
          description: (c.description || 'No description').substring(0, 100)
        }));

        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('help_cmd')
            .setPlaceholder('Select a Command for Details')
            .addOptions(options)
        );
      }

      function buildButtons(view, allPageData) {
        const btns = [];
        btns.push(new ButtonBuilder().setCustomId('help_home').setLabel('Home').setStyle(view === 'home' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(view === 'home'));
        btns.push(new ButtonBuilder().setCustomId('help_all').setLabel('All Commands').setStyle(view === 'all' ? ButtonStyle.Success : ButtonStyle.Primary));

        if (view === 'all' && allPageData) {
          btns.push(new ButtonBuilder().setCustomId('help_prev').setEmoji(EMOJI_ARROW_LEFT).setStyle(ButtonStyle.Secondary).setDisabled(state.page === 0));
          btns.push(new ButtonBuilder().setCustomId('help_next').setEmoji(EMOJI_ARROW_RIGHT).setStyle(ButtonStyle.Secondary).setDisabled(state.page >= allPageData.totalPages - 1));
        }

        btns.push(new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(client.config.supportServer));
        return new ActionRowBuilder().addComponents(...btns);
      }

      function buildHomeButton() {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('help_home').setLabel('Home').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(client.config.supportServer)
        );
      }

      // ══════════════════════════════════════════════
      // ── RENDER FUNCTION
      // ── Using straight embeds since resolveEmbedEmojis is gone ──
      // ══════════════════════════════════════════════

      function render() {
        const components = [];
        let embed;

        if (state.view === 'home') {
          embed = buildHomeEmbed();
          components.push(buildCategoryDropdown());
          components.push(buildButtons('home'));
        } else if (state.view === 'category') {
          embed = buildCategoryEmbed(state.category);
          components.push(buildCategoryDropdown());
          const cmdDd = buildCommandDropdown(state.category);
          if (cmdDd) components.push(cmdDd);
          components.push(buildButtons('category'));
        } else if (state.view === 'all') {
          const data = buildAllCommandsEmbed(state.page);
          embed = data.embed;
          components.push(buildCategoryDropdown());
          components.push(buildButtons('all', data));
        } else if (state.view === 'command') {
          embed = buildCommandEmbed(client, message, state.commandObj);
          components.push(buildCategoryDropdown());
          if (state.category) {
            const cmdDd = buildCommandDropdown(state.category);
            if (cmdDd) components.push(cmdDd);
          }
          components.push(buildButtons('command'));
        }

        return { embeds: [embed], components };
      }

      // ── SEND INITIAL ──
      const sent = isInteraction ? await message.reply({ ...render(), fetchReply: true }).catch(() => null) : await message.reply(render()).catch(() => null);
      if (!sent) return;
      if (!isInteraction) message.delete().catch(() => { });

      // ══════════════════════════════════════════════
      // ── COLLECTOR
      // ══════════════════════════════════════════════

      const collector = sent.createMessageComponentCollector({
        filter: (i) => i.user.id === user.id,
        time: 300000
      });

      collector.on('collect', async (i) => {
        try {
          // ── BUTTONS ──
          if (i.customId === 'help_home') {
            state = { view: 'home', category: null, page: 0 };
          } else if (i.customId === 'help_all') {
            state = { view: 'all', category: state.category, page: 0 };
          } else if (i.customId === 'help_prev') {
            if (state.page > 0) state.page--;
          } else if (i.customId === 'help_next') {
            state.page++;
          }

          // ── CATEGORY DROPDOWN ──
          else if (i.customId === 'help_cat') {
            const selected = i.values[0];
            state = { view: 'category', category: selected, page: 0 };
          }

          // ── COMMAND DROPDOWN ──
          else if (i.customId === 'help_cmd') {
            const cmdName = i.values[0];
            const cmd = client.commands.get(cmdName);
            if (cmd) {
              state = { ...state, view: 'command', commandObj: cmd };
            }
          }

          await i.update(render());
        } catch (err) {
          try {
            await i.reply({ content: `${EMOJI_ERROR} Interaction failed. Try again.`, ephemeral: true });
          } catch { }
        }
      });

      collector.on('end', () => {
        const disabledRows = sent.components.map(row => {
          const newRow = ActionRowBuilder.from(row);
          newRow.components.forEach(c => {
            try { c.setDisabled(true); } catch { }
          });
          return newRow;
        });

        const timeoutEmbed = EmbedBuilder.from(sent.embeds[0])
          .setFooter({ text: 'Wild Wolf \u2022 Session expired \u2022 Run the command again to interact' })
          .setColor('#2B2D31');

        sent.edit({ embeds: [timeoutEmbed], components: disabledRows }).catch(() => { });
      });

    } catch (error) {
      const errEmbed = new EmbedBuilder().setColor('#ED4245').setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() }).setDescription(`${EMOJI_ERROR} ${error.message}`).setTimestamp();
      isInteraction ? message.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => { }) : message.reply({ embeds: [errEmbed] }).catch(() => { });
    }
  }
};

// ══════════════════════════════════════════════
// ── COMMAND DETAIL EMBED (shared builder)
// ══════════════════════════════════════════════

function buildCommandEmbed(client, message, command) {
  const aliasStr = command.aliases?.length > 0
    ? command.aliases.map(a => `\`${a}\``).join(' \u2502 ')
    : '\`None\`';

  const permStr = [];
  if (command.staffOnly) permStr.push('\`Staff Only\`');
  if (command.devOnly) permStr.push('\`Developer Only\`');
  if (command.userPerms?.length) permStr.push(...command.userPerms.map(p => `\`${p}\``));
  if (permStr.length === 0) permStr.push('\`Everyone\`');

  const trigger = command.slash ? '/' : client.config.prefix;

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setAuthor({ name: 'Wild Wolf \u2502 Command Reference', iconURL: client.user.displayAvatarURL() })
    .setDescription(
      `${SEP}\n` +
      `**${command.name}**\n` +
      `${command.description || 'No description available.'}\n` +
      `${SEP}`
    )
    .addFields(
      { name: `${ARROW_ICON} Usage`, value: `\`\`\`fix\n${trigger}${command.usage || command.name}\n\`\`\``, inline: false },
      { name: `${ARROW_ICON} Aliases`, value: aliasStr, inline: true },
      { name: `${ARROW_ICON} Cooldown`, value: `\`${command.cooldown || 0}s\``, inline: true },
      { name: `${ARROW_ICON} Category`, value: `\`${(command.category || 'Unknown').charAt(0).toUpperCase() + (command.category || 'unknown').slice(1)}\``, inline: true },
      { name: `${ARROW_ICON} Permissions`, value: permStr.join(', ') },
      { name: `${ARROW_ICON} Status`, value: command.enabled ? `${EMOJI_DOT} \`\u25CF Enabled\`` : `${EMOJI_DOT} \`\u25CB Disabled\``, inline: true }
    );

  if (command.details) {
    embed.addFields({ name: `${ARROW} Setup & Info`, value: command.details });
  }

  return embed
    .setFooter({ text: 'Wild Wolf \u2022 Command Details', iconURL: message.guild.iconURL({ dynamic: true }) })
    .setTimestamp();
}
