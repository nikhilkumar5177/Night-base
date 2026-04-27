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
  automod: { label: 'automod', desc: 'Auto-moderation system' },
  voice: { label: 'voice', desc: 'Voice channel commands' }
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

      let state = { view: 'home', category: null, page: 0 };

      const injectComponents = (container) => {
        // Buttons
        const buttonRow = new ActionRowBuilder();
        buttonRow.addComponents(new ButtonBuilder().setCustomId('help_home').setLabel('Home').setStyle(ButtonStyle.Success).setDisabled(state.view === 'home'));
        buttonRow.addComponents(new ButtonBuilder().setCustomId('help_all').setLabel('All').setStyle(ButtonStyle.Primary).setDisabled(state.view === 'all'));

        if (state.view === 'all') {
          buttonRow.addComponents(
            new ButtonBuilder().setCustomId('help_prev').setEmoji(EMOJI_ARROW_LEFT).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help_next').setEmoji(EMOJI_ARROW_RIGHT).setStyle(ButtonStyle.Secondary)
          );
        }

        buttonRow.addComponents(new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL(client.config.supportServer));

        container.addActionRowComponents(buttonRow);

        // Dropdowns
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
        const cmdList = cmds.map(c => `${EMOJI_DOT}\`${c.name}\``).join('\n');

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 ${meta.label}`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `**Commands [${cmds.length}]**\n${cmdList}`
          ));

        return injectComponents(container);
      };

      const buildAllContainer = (page) => {
        const allCmds = [];
        Object.keys(categories).forEach(cat => {
          const catLabel = (CATEGORY_META[cat]?.label || cat).toUpperCase();
          const catCmds = categories[cat].map(c => `${EMOJI_DOT}\`${c.name}\``);

          allCmds.push(`${EMOJI_ARROW} **${catLabel}**`);

          // Column logic (3 columns)
          for (let i = 0; i < catCmds.length; i += 3) {
            const row = catCmds.slice(i, i + 3).join(`\n`);
            allCmds.push(row);
          }
          allCmds.push(''); // Spacer
        });

        const perPage = 15; // Adjusted perPage for multi-line column view
        const totalPages = Math.ceil(allCmds.length / perPage);
        const slice = allCmds.slice(page * perPage, (page + 1) * perPage);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wild Wolf \u2502 All Commands (Page ${page + 1}/${totalPages})`))
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(slice.join('\n')));

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
        else if (i.customId === 'help_cmd') state = { ...state, view: 'command', commandObj: client.commands.get(i.values[0]) };
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
