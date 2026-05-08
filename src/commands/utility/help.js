const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const storage = require('../../utils/storageManager');
const {
  SEP,
  EMOJI_DOT,
  EMOJI_ARROW,
  EMOJI_ARROW_LEFT,
  EMOJI_ARROW_RIGHT,
  FOOTER_TEXT
} = require('../../utils/constants');
const { cv2Error, cv2Expire } = require('../../utils/messageHelper');

const CATEGORY_META = {
  moderation: { label: 'Moderation', desc: 'Server moderation tools' },
  utility: { label: 'Utility', desc: 'General purpose commands' },
  config: { label: 'Config', desc: 'Bot configuration' },
  security: { label: 'Security', desc: 'Anti-nuke & protection' },
  staff: { label: 'Staff', desc: 'Staff role management' },
  blacklist: { label: 'Blacklist', desc: 'Blacklist management' },
  roles: { label: 'Roles', desc: 'Role automation' },
  vouch: { label: 'Vouch', desc: 'Reputation system' },
  snipe: { label: 'Snipe', desc: 'Message recovery' },
  developer: { label: 'Developer', desc: 'Developer tools' },
  automod: { label: 'AutoMod', desc: 'Auto-moderation system' },
  voice: { label: 'Voice', desc: 'Voice channel commands' },
  additional_info: { label: 'Additional Info', desc: 'Detailed guides & documentation' }
};

module.exports = {
  name: 'help',
  aliases: ['h', 'commands', 'menu'],
  description: 'Interactive help dashboard',
  usage: 'help [command]',
  cooldown: 5,
  enabled: true,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Interactive help dashboard')
    .addStringOption(opt => opt.setName('command').setDescription('The command to get help for').setRequired(false)),
  staffOnly: false,
  devOnly: false,
  premiumOnly: false,
  execute: async (client, message, args) => {
    const isInteraction = !message.author;
    const user = isInteraction ? message.user : message.author;
    const cmdInput = isInteraction ? message.options.getString('command') : args[0];

    try {
      if (cmdInput) {
        const cmdName = cmdInput.toLowerCase();
        const command = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
        if (!command) {
          return message.reply({ components: [cv2Error(`No command found with name \`${cmdName}\`.`)], flags: MessageFlags.IsComponentsV2, ephemeral: true }).catch(() => { });
        }
        return message.reply({ components: [buildCommandContainer(client, command)], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
      }

      const categories = {};
      client.commands.forEach(cmd => {
        if (cmd.devOnly && user.id !== process.env.DEV_ID) return;
        const cat = cmd.category?.toLowerCase() || 'uncategorized';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd);
      });

      // Virtual "Guide" commands for Additional Info
      categories.additional_info = [
        { name: 'durations_guide', description: 'Learn how to use time strings (e.g., 30d, 3mo)', category: 'additional_info', isGuide: true },
        { name: 'alias_guide', description: 'Learn about the fast role-giving system', category: 'additional_info', isGuide: true },
        { name: 'staff_guide', description: 'Learn how the staff permission system works', category: 'additional_info', isGuide: true },
        { name: 'automod_guide', description: 'Learn how to configure advanced protection', category: 'additional_info', isGuide: true }
      ];

      let state = { view: 'home', category: null, page: 0 };

      const injectComponents = (container) => {
        const availableCats = Object.keys(CATEGORY_META).filter(k => categories[k]);
        const catMenu = new StringSelectMenuBuilder()
          .setCustomId('help_cat')
          .setPlaceholder('Select a Category')
          .addOptions(availableCats.map(cat => ({
            label: CATEGORY_META[cat].label,
            value: cat,
            description: `${categories[cat].length} commands`
          })));

        container.addActionRowComponents(new ActionRowBuilder().addComponents(catMenu));

        if (state.view === 'category' && categories[state.category]) {
          const cmdMenu = new StringSelectMenuBuilder()
            .setCustomId('help_cmd')
            .setPlaceholder('Select a Command for Details')
            .addOptions(categories[state.category].slice(0, 25).map(c => ({
              label: c.name,
              value: c.name
            })));
          container.addActionRowComponents(new ActionRowBuilder().addComponents(cmdMenu));
        }

        const buttonRow = new ActionRowBuilder();
        buttonRow.addComponents(new ButtonBuilder().setCustomId('help_home').setLabel('Home').setStyle(ButtonStyle.Success).setDisabled(state.view === 'home'));
        buttonRow.addComponents(new ButtonBuilder().setCustomId('help_all').setLabel('All').setStyle(ButtonStyle.Primary).setDisabled(state.view === 'all'));

        if (state.view === 'all') {
          buttonRow.addComponents(
            new ButtonBuilder().setCustomId('help_prev').setEmoji(EMOJI_ARROW_LEFT).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help_next').setEmoji(EMOJI_ARROW_RIGHT).setStyle(ButtonStyle.Secondary)
          );
        }

        if (state.view === 'command' && state.historyView) {
          buttonRow.addComponents(new ButtonBuilder().setCustomId('help_back').setLabel('Back').setStyle(ButtonStyle.Secondary));
        }

        buttonRow.addComponents(new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(client.config.supportServer));
        container.addActionRowComponents(buttonRow);

        return container;
      };

      const buildHomeContainer = () => {
        const config = storage.read('config.json');
        const prefix = config.prefix || client.config.prefix;
        const totalCmds = client.commands.size;

        const catList = Object.keys(CATEGORY_META)
          .filter(cat => categories[cat])
          .map(cat => `${EMOJI_ARROW} **${CATEGORY_META[cat].label}** \u2014 \`${categories[cat].length}\` commands`)
          .join('\n');

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**WILD WOLF**\n` +
            `Your Ultimate Discord Companion`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${EMOJI_DOT} **The most powerful modular bot for your server**\n` +
            `${EMOJI_DOT} **Server Prefix:** \`${prefix}\` \n` +
            `${EMOJI_DOT} **Total Commands:** \`${totalCmds}\``
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            ` > **Available Categories**\n\n${catList}`
          ))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));

        return injectComponents(container);
      };

      const buildCategoryContainer = (catKey) => {
        const cmds = categories[catKey];
        const meta = CATEGORY_META[catKey] || { label: catKey };
        const cmdList = cmds.map(c => `${EMOJI_DOT}\`${c.name}\`${c.premiumOnly ? ' 👑' : ''}`).join('\n');

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 ${meta.label}`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Commands [${cmds.length}]**\n${cmdList}`
          ));

        return injectComponents(container);
      };

      const buildAllContainer = (page) => {
        const blocks = [];
        Object.keys(categories).forEach(cat => {
          const catLabel = (CATEGORY_META[cat]?.label || cat).toUpperCase();
          const catCmds = categories[cat].map(c => `\`${c.name}\``);
          
          let block = [`${EMOJI_ARROW} **${catLabel}**`];
          for (let i = 0; i < catCmds.length; i += 3) {
            const row = catCmds.slice(i, i + 3).map(name => {
              const cmd = client.commands.get(name);
              return `\`${name}\`${cmd?.premiumOnly ? '👑' : ''}`;
            }).join(' \u2022 ');
            block.push(`${EMOJI_DOT} ${row}`);
          }
          blocks.push(block.join('\n'));
        });

        const perPage = 5;
        const totalPages = Math.ceil(blocks.length / perPage) || 1;
        if (page >= totalPages) page = totalPages - 1;
        if (page < 0) page = 0;

        const slice = blocks.slice(page * perPage, (page + 1) * perPage);
        const content = slice.join('\n\n').trim() || 'No commands found.';

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 All Commands (Page ${page + 1}/${totalPages})`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

        return injectComponents(container);
      };

      const render = () => {
        let container;
        if (state.view === 'home') container = buildHomeContainer();
        else if (state.view === 'category') container = buildCategoryContainer(state.category);
        else if (state.view === 'all') container = buildAllContainer(state.page);
        else if (state.view === 'command') {
          container = buildCommandContainer(client, state.commandObj);
          injectComponents(container);
        }

        return { components: [container], flags: MessageFlags.IsComponentsV2 };
      };

      const sent = await message.reply(render()).catch(() => null);
      if (!sent) return;

      const coll = sent.createMessageComponentCollector({ filter: i => i.user.id === user.id, time: 300000 });
      coll.on('collect', async i => {
        if (i.customId === 'help_home') state = { view: 'home', category: null, page: 0 };
        else if (i.customId === 'help_all') state = { view: 'all', category: null, page: 0 };
        else if (i.customId === 'help_cat') state = { view: 'category', category: i.values[0], page: 0 };
        else if (i.customId === 'help_cmd') {
          let cmd = client.commands.get(i.values[0]);
          if (!cmd && state.category === 'additional_info') {
            cmd = categories.additional_info.find(c => c.name === i.values[0]);
          }
          state = { ...state, historyView: state.view, view: 'command', commandObj: cmd };
        }
        else if (i.customId === 'help_back') state = { ...state, view: state.historyView || 'category', commandObj: null };
        else if (i.customId === 'help_prev' && state.page > 0) state.page--;
        else if (i.customId === 'help_next') state.page++;

        await i.update(render()).catch(() => { });
      });

      coll.on('end', () => sent.edit({ components: [cv2Expire()] }).catch(() => { }));

    } catch (error) {
      message.reply({ components: [cv2Error(error.message)], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
    }
  }
};

function buildCommandContainer(client, command) {
  if (command.isGuide) return buildGuideContainer(command.name);
  const perms = command.staffOnly ? 'Staff Only' : command.userPermissions?.join(', ') || 'Everyone';
  const trigger = command.slash ? '/' : client.config.prefix;

  let extraDoc = '';
  if (command.name === 'automod') {
    extraDoc = `\n\n**AutoMod Guide:**\n${EMOJI_DOT} AutoMod allows you to automatically delete messages that contain banned words, links, or excessive spam.\n${EMOJI_DOT} **Auto Escalation:** Configure the bot to automatically warn, mute, or ban users who trigger AutoMod multiple times. Use the dashboard to set rules like \`3:warn, 5:mute:1h\`.\n${EMOJI_DOT} **Webhook Security:** Zero-tolerance detection for phishing and mass mentions.`;
  } else if (command.name === 'aliasrole' || command.name === 'addalias' || command.name === 'aliases' || command.category === 'roles') {
    extraDoc = `\n\n**Alias Guide:**\n${EMOJI_DOT} Aliases are used for fast role giving.\n${EMOJI_DOT} Only members with \`Manage Roles\` permissions (or Staff) can give or use them.\n${EMOJI_DOT} **Usage:** \`?aliasrole addalias <primary> <newAlias>\` — Links a quick word (newAlias) to a role name (primary), so typing the quick word instantly gives the role.`;
  } else if (command.name === 'staff' || command.category === 'staff') {
    extraDoc = `\n\n**Staff System Guide:**\n${EMOJI_DOT} The staff system allows you to define which roles are considered "Staff".\n${EMOJI_DOT} Users with these roles can bypass certain restrictions and use moderation commands without needing raw Discord permissions.`;
  }

  if (command.premiumOnly) {
    extraDoc += `\n\n**Premium Feature:**\n${EMOJI_DOT} This command requires the server to have an active Premium subscription.`;
  }

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf │ ${command.name}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${command.description || 'No description'}\n\n` +
      `**Usage:** \`${trigger}${command.usage || command.name}\`\n` +
      `**Aliases:** ${command.aliases?.map(a => `\`${a}\``).join(', ') || 'None'}\n` +
      `**Permissions:** \`${perms}\`\n` +
      `**Cooldown:** \`${command.cooldown || 0}s\`` +
      extraDoc
    ));
}

function buildGuideContainer(guideName) {
  let title = 'Guide';
  let content = '';

  if (guideName === 'durations_guide') {
    title = 'Duration Formats';
    content = `Wild Wolf uses a flexible duration system for premium keys, mutes, and temporary roles.\n\n` +
      `**Supported Formats:**\n` +
      `${EMOJI_DOT} \`s\` \u2014 Seconds\n` +
      `${EMOJI_DOT} \`m\` \u2014 Minutes\n` +
      `${EMOJI_DOT} \`h\` \u2014 Hours\n` +
      `${EMOJI_DOT} \`d\` \u2014 Days\n` +
      `${EMOJI_DOT} \`w\` \u2014 Weeks\n` +
      `${EMOJI_DOT} \`mo\` \u2014 Months (30 days)\n` +
      `${EMOJI_DOT} \`y\` \u2014 Years (365 days)\n\n` +
      `**Examples:**\n` +
      `\`30d\` (30 days), \`3mo\` (3 months), \`1h\` (1 hour), \`2y\` (2 years).`;
  } else if (guideName === 'alias_guide') {
    title = 'Alias System';
    content = `Aliases are designed for **Fast Role Management**.\n\n` +
      `${EMOJI_DOT} **Purpose:** Link a short "trigger word" to a specific role. When you type that word, the bot instantly gives you (or a mentioned user) that role.\n` +
      `${EMOJI_DOT} **Permissions:** Only users with \`Manage Roles\` or configured Staff roles can create or use aliases.\n` +
      `${EMOJI_DOT} **Premium Feature:** This system requires an active Premium subscription.\n\n` +
      `**Example:** If \`voter\` is aliased to the "Member" role, typing \`voter\` will instantly assign it.`;
  } else if (guideName === 'staff_guide') {
    title = 'Staff System';
    content = `The Staff System allows you to delegate bot management without giving raw Discord permissions.\n\n` +
      `${EMOJI_DOT} **Staff Roles:** You can define specific roles as "Staff". These users can then use moderation and configuration commands.\n` +
      `${EMOJI_DOT} **Bypass:** Staff members bypass standard permission checks for bot commands.\n` +
      `${EMOJI_DOT} **Premium Feature:** Configuring custom staff roles requires a Premium subscription. The Server Owner always has staff access regardless of premium.`;
  } else if (guideName === 'automod_guide') {
    title = 'AutoMod System';
    content = `Wild Wolf provides industrial-grade protection through its AutoMod modules.\n\n` +
      `**Protection Modules:**\n` +
      `${EMOJI_DOT} **Spam:** Detects message floods and duplicate text.\n` +
      `${EMOJI_DOT} **Links:** Blocks invites, phishing, and unauthorized URLs.\n` +
      `${EMOJI_DOT} **Security:** Anti-Webhook spam and mass-mention protection.\n` +
      `${EMOJI_DOT} **Escalations:** Automatically punish repeat offenders (e.g., 3 warns = 1h mute).\n\n` +
      `**Premium Feature:** The advanced AutoMod dashboard is a Premium feature.`;
  }

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 ${title}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}
