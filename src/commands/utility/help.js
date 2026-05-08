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
  developer: { label: 'Developer', desc: 'Developer toolFs' },
  automod: { label: 'automod', desc: 'Auto-moderation system' },
  voice: { label: 'voice', desc: 'Voice channel commands' },
  additional_info: { label: 'Additional Info', desc: 'Extra guides and info' }
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

      // Inject virtual commands for Additional Info
      categories['additional_info'] = [
        { name: 'Durations', description: 'Guide for time durations (m, h, d, etc.)', category: 'additional_info' },
        { name: 'Aliases', description: 'Learn how command and role aliases work', category: 'additional_info' },
        { name: 'Staff System', description: 'Overview of staff roles and permissions', category: 'additional_info' },
        { name: 'Automod System', description: 'How the automod protection works', category: 'additional_info' }
      ];

      let state = { view: 'home', category: null, page: 0 };

      const injectComponents = (container) => {
        // Dropdowns
        const availableCats = Object.keys(CATEGORY_META).filter(k => categories[k]);
        const catMenu = new StringSelectMenuBuilder()
          .setCustomId('help_cat')
          .setPlaceholder('Select a Category')
          .addOptions(availableCats.map(cat => ({
            label: CATEGORY_META[cat].label,
            value: cat,
            description: `${categories[cat].length} entries`
          })));

        container.addActionRowComponents(new ActionRowBuilder().addComponents(catMenu));

        if (state.view === 'category' && categories[state.category]) {
          const cmdMenu = new StringSelectMenuBuilder()
            .setCustomId('help_cmd')
            .setPlaceholder('Select an entry for details')
            .addOptions(categories[state.category].slice(0, 25).map(c => ({
              label: c.name,
              value: c.name
            })));
          container.addActionRowComponents(new ActionRowBuilder().addComponents(cmdMenu));
        }

        // Buttons
        const buttonRow = new ActionRowBuilder();
        buttonRow.addComponents(new ButtonBuilder().setCustomId('help_home').setLabel('Home').setStyle(ButtonStyle.Success).setDisabled(state.view === 'home'));
        buttonRow.addComponents(new ButtonBuilder().setCustomId('help_back').setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(state.view === 'home'));
        buttonRow.addComponents(new ButtonBuilder().setCustomId('help_all').setLabel('All').setStyle(ButtonStyle.Primary).setDisabled(state.view === 'all'));

        if (state.view === 'all') {
          buttonRow.addComponents(
            new ButtonBuilder().setCustomId('help_prev').setEmoji(EMOJI_ARROW_LEFT).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help_next').setEmoji(EMOJI_ARROW_RIGHT).setStyle(ButtonStyle.Secondary)
          );
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
          .map(cat => `${EMOJI_ARROW} **${CATEGORY_META[cat].label}** \u2014 \`${categories[cat].length}\` entries`)
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
        const cmdList = cmds.map(c => `${EMOJI_DOT}\`${c.name}\``).join('\n');

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 ${meta.label}`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Entries [${cmds.length}]**\n${cmdList}`
          ));

        return injectComponents(container);
      };

      const buildAllContainer = (page) => {
        const blocks = [];
        Object.keys(categories).forEach(cat => {
          if (cat === 'additional_info') return; // Hide virtual category from "All" list
          const catLabel = (CATEGORY_META[cat]?.label || cat).toUpperCase();
          const catCmds = categories[cat].map(c => `\`${c.name}\``);
          
          let block = [`${EMOJI_ARROW} **${catLabel}**`];
          for (let i = 0; i < catCmds.length; i += 3) {
            const row = catCmds.slice(i, i + 3).join(' \u2022 ');
            block.push(`${EMOJI_DOT} ${row}`);
          }
          blocks.push(block.join('\n'));
        });

        const perPage = 5; // 5 Categories per page
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
          if (state.commandObj.category === 'additional_info') {
            if (state.commandObj.name === 'Durations') container = buildDurationGuideContainer();
            else if (state.commandObj.name === 'Aliases') container = buildAliasesGuideContainer();
            else if (state.commandObj.name === 'Staff System') container = buildStaffGuideContainer();
            else if (state.commandObj.name === 'Automod System') container = buildAutomodGuideContainer();
          } else {
            container = buildCommandContainer(client, state.commandObj);
          }
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
        else if (i.customId === 'help_back') {
          if (state.view === 'command') state.view = 'category';
          else state = { view: 'home', category: null, page: 0 };
        }
        else if (i.customId === 'help_cat') state = { view: 'category', category: i.values[0], page: 0 };
        else if (i.customId === 'help_cmd') {
          const selected = categories[state.category].find(c => c.name === i.values[0]);
          state = { ...state, view: 'command', commandObj: selected };
        }
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
  const perms = command.staffOnly ? 'Staff Only' : command.userPermissions?.join(', ') || 'Everyone';
  const trigger = command.slash ? '/' : client.config.prefix;

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 ${command.name}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${command.description || 'No description'}\n\n` +
      `**Usage:** \`${trigger}${command.usage || command.name}\`\n` +
      `**Aliases:** ${command.aliases?.map(a => `\`${a}\``).join(', ') || 'None'}\n` +
      `**Permissions:** \`${perms}\`\n` +
      `**Cooldown:** \`${command.cooldown || 0}s\``
    ));
}

function buildDurationGuideContainer() {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Duration Guide`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**How to use time durations:**\n` +
      `Many commands (like mute and reminder) require a duration. You can use numbers followed by unit nicknames.\n\n` +
      `${EMOJI_DOT} **s** \u2014 Seconds\n` +
      `${EMOJI_DOT} **m** \u2014 Minutes\n` +
      `${EMOJI_DOT} **h** \u2014 Hours\n` +
      `${EMOJI_DOT} **d** \u2014 Days\n` +
      `${EMOJI_DOT} **mo** \u2014 Months (30 days)\n\n` +
      `**Examples:**\n` +
      `\`10m\` \u2014 10 minutes\n` +
      `\`2h\` \u2014 2 hours\n` +
      `\`1d\` \u2014 1 day\n` +
      `\`2mo\` \u2014 2 months`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
}

function buildAliasesGuideContainer() {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Alias Guide`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Two types of aliases exist in Wild Wolf:**\n\n` +
      `**1. Command Aliases**\n` +
      `Shortened versions of common commands. For example, instead of typing \`?help\`, you can just type \`?h\`.\n\n` +
      `**2. Alias Roles (Fast Role Giving)**\n` +
      `Alias roles allow staff to give roles to users quickly. Instead of navigating through Discord's role menu, just type a keyword in chat to instantly toggle a role on someone.\n\n` +
      `${EMOJI_DOT} **Who can use it:** Only members with **Manage Roles** permission.\n` +
      `${EMOJI_DOT} **Setup:** Use \`?aliasrole add <keyword> <roleId>\` to create an alias.\n` +
      `${EMOJI_DOT} **Usage:** Type the keyword in chat to quickly assign or remove that role.\n` +
      `${EMOJI_DOT} **Add extra aliases:** Use \`?aliasrole addalias <primary> <newAlias>\` to add more keywords.\n` +
      `${EMOJI_DOT} **List all:** Use \`?aliasrole list\` to see configured aliases.\n` +
      `${EMOJI_DOT} **Remove:** Use \`?aliasrole remove <keyword>\` to delete an alias.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
}

function buildStaffGuideContainer() {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 Staff System`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**How the staff system works:**\n\n` +
      `${EMOJI_DOT} **Staff Roles:** Admins can add staff roles via \`?addstaff <role>\`. Members with these roles can use staff-only commands.\n` +
      `${EMOJI_DOT} **Hierarchy:** Moderation actions respect role positions. You cannot mute or warn someone with a higher or equal role than yours.\n` +
      `${EMOJI_DOT} **Permissions:** Some commands require native Discord permissions (like Manage Messages or Moderate Members).\n` +
      `${EMOJI_DOT} **Owner/Dev:** The server owner and bot developers bypass most staff restrictions.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
}

function buildAutomodGuideContainer() {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 AutoMod Guide`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Wild Wolf AutoModeration System**\n` +
      `A premium protection suite with 5 modules. Use \`/automod\` (slash command) to open the interactive dashboard.\n\n` +
      `${EMOJI_ARROW} **Modules Overview**\n\n` +
      `${EMOJI_DOT} **Spam** \u2014 Detects rapid messages and duplicate content. Configure message limit and time window.\n` +
      `${EMOJI_DOT} **Links** \u2014 Blocks unauthorized links, Discord invites, phishing URLs, and GIFs. Whitelist allowed domains.\n` +
      `${EMOJI_DOT} **Content** \u2014 Filters blocked words (exact and partial match), excessive caps, line spam, and ghost pings.\n` +
      `${EMOJI_DOT} **Raid** \u2014 Detects mass joins and auto-locks the server. Set join limits, time windows, and minimum account age.\n` +
      `${EMOJI_DOT} **Security** \u2014 Anti-nuke protection that tracks rapid destructive actions (channel/role deletions) and anti-webhook abuse.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${EMOJI_ARROW} **Actions & Escalation**\n\n` +
      `Each module can perform: \`delete\`, \`warn\`, \`mute\`, \`kick\`, \`ban\`.\n\n` +
      `**Auto-Escalation** (enabled by default):\n` +
      `${EMOJI_DOT} **3 warns** \u2192 Mute (1 hour)\n` +
      `${EMOJI_DOT} **5 warns** \u2192 Kick\n` +
      `${EMOJI_DOT} **7 warns** \u2192 Ban\n\n` +
      `${EMOJI_ARROW} **Global Settings**\n\n` +
      `${EMOJI_DOT} **Log Channel** \u2014 Set a channel to receive all automod logs.\n` +
      `${EMOJI_DOT} **Bypass Roles** \u2014 Roles that are immune to all automod checks.\n` +
      `${EMOJI_DOT} **Bypass Users** \u2014 Specific users exempt from automod.\n` +
      `${EMOJI_DOT} **Custom Messages** \u2014 Use \`{user}\` and \`{violation}\` placeholders in response messages.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${FOOTER_TEXT}`));
}
