const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionsBitField } = require('discord.js');
const { SEP, EMOJI_ERROR, EMOJI_LOADING, EMOJI_SUCCESS, EMOJI_WARN, EMOJI_INFO } = require('../../utils/constants');


module.exports = {
  name: 'dedupe',
  aliases: ['cleardupes', 'clearemojis', 'dedupeemojis'],
  description: 'Scans the server for duplicate custom emojis and removes them.',
  usage: 'dedupe',
  cooldown: 30,
  enabled: true,
  staffOnly: true,
  devOnly: false,
  execute: async (client, message, args) => {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription(`${EMOJI_ERROR} You need **ManageGuildExpressions** permission to manage emojis.`)
              .setTimestamp()
          ]
        });
      }

      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ED4245')
              .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
              .setDescription(`${EMOJI_ERROR} I need **ManageGuildExpressions** permission to manage emojis.`)
              .setTimestamp()
          ]
        });
      }

      const loadEmbed = new EmbedBuilder()
        .setColor('#EB459E')
        .setAuthor({ name: 'Wild Wolf \u2502 Dedupe Emojis', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_LOADING} **Scanning server for duplicate emojis...**\n${SEP}`)
        .setTimestamp();
      
      const sentMsg = await message.reply({ embeds: [loadEmbed] });

      const emojis = await message.guild.emojis.fetch();
      
      // Group emojis by exact name
      const grouped = new Map();
      emojis.forEach(emoji => {
        if (!grouped.has(emoji.name)) {
          grouped.set(emoji.name, []);
        }
        grouped.get(emoji.name).push(emoji);
      });

      const emojisToDelete = [];
      let uniqueCount = 0;

      for (const [name, emojiGroup] of grouped.entries()) {
        uniqueCount++;
        if (emojiGroup.length > 1) {
          // Sort by creation timestamp so we keep the oldest one and delete newer ones
          emojiGroup.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
          
          // Add all except the first one to the deletion list
          for (let i = 1; i < emojiGroup.length; i++) {
            emojisToDelete.push(emojiGroup[i]);
          }
        }
      }

      if (emojisToDelete.length === 0) {
        return sentMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('#00e676')
              .setAuthor({ name: 'Wild Wolf \u2502 Dedupe Emojis', iconURL: client.user.displayAvatarURL() })
              .setDescription(`${SEP}\n${EMOJI_SUCCESS} **No duplicate emojis found!**\nAll ${uniqueCount} emojis are unique.\n${SEP}`)
              .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
              .setTimestamp()
          ]
        });
      }

      const confirmEmbed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setAuthor({ name: 'Wild Wolf \u2502 Dedupe Emojis', iconURL: client.user.displayAvatarURL() })
        .setDescription(`${SEP}\n${EMOJI_WARN} **Found ${emojisToDelete.length} duplicate emoji(s)!**\n\nAre you sure you want to permanently delete them?\n${SEP}`)
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_dedupe')
          .setLabel('Yes, Delete Them')
          .setEmoji(EMOJI_SUCCESS)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_dedupe')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      await sentMsg.edit({ embeds: [confirmEmbed], components: [row] });

      const collector = sentMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000,
        filter: i => i.user.id === message.author.id
      });

      collector.on('collect', async i => {
        if (i.customId === 'cancel_dedupe') {
          collector.stop('cancelled');
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#2B2D31')
                .setDescription(`${SEP}\n${EMOJI_INFO} **Deduplication cancelled.**\n${SEP}`)
            ],
            components: []
          });
        } else if (i.customId === 'confirm_dedupe') {
          collector.stop('confirmed');
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#EB459E')
                .setAuthor({ name: 'Wild Wolf \u2502 Dedupe Emojis', iconURL: client.user.displayAvatarURL() })
                .setDescription(`${SEP}\n${EMOJI_LOADING} **Deleting ${emojisToDelete.length} emoji(s)...**\nThis might take a moment to avoid rate limits.\n${SEP}`)
            ],
            components: []
          });

          let deleted = 0;
          let failed = 0;

          for (const emoji of emojisToDelete) {
            try {
              await emoji.delete();
              deleted++;
            } catch (err) {
              failed++;
            }
            // Small delay to prevent API rate limits
            await new Promise(r => setTimeout(r, 500));
          }

          const resultEmbed = new EmbedBuilder()
            .setColor(failed === 0 ? '#00e676' : '#FEE75C')
            .setAuthor({ name: 'Wild Wolf \u2502 Dedupe Results', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${SEP}\n${EMOJI_SUCCESS} **Successfully deleted ${deleted} duplicate emoji(s).**\n${failed > 0 ? `${EMOJI_ERROR} Failed to delete ${failed} emoji(s).\n` : ''}${SEP}`)
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

          await sentMsg.edit({ embeds: [resultEmbed] });
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          sentMsg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor('#ED4245')
                .setDescription(`${SEP}\n${EMOJI_ERROR} **Deduplication timed out.**\n${SEP}`)
            ],
            components: []
          }).catch(() => {});
        }
      });

    } catch (error) {
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({ name: 'Wild Wolf', iconURL: client.user.displayAvatarURL() })
            .setDescription(`${EMOJI_ERROR} ${error.message}`)
            .setTimestamp()
        ]
      }).catch(() => {});
    }
  }
};
