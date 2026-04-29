const { AutoModerationRuleEventType, AutoModerationRuleTriggerType, AutoModerationActionType } = require('discord.js');

/**
 * Synchronize custom automod configuration with Discord's native AutoMod rules.
 * @param {import('discord.js').Guild} guild 
 * @param {object} config 
 */
async function syncNativeRules(guild, config, force = false) {
  try {
    let me = guild.members.me;
    if (!me) me = await guild.members.fetch(guild.client.user.id).catch(() => null);
    
    if (!me || !me.permissions.has('ManageGuild')) return { success: false, error: 'Missing ManageGuild permission' };

    const existingRules = await guild.autoModerationRules.fetch();
    const modules = config.modules;
    let syncedCount = 0;

    // 1. Sync Content / Blocked Words (Keywords - Max 6 rules allowed per guild)
    const blockedWords = [...(modules.content.blockedWords || []), ...(modules.content.partialBlockedWords || [])];
    const currentKeywordRules = existingRules.filter(r => r.triggerType === AutoModerationRuleTriggerType.Keyword);
    
    if (force || (modules.content.enabled && blockedWords.length > 0)) {
      const ruleNames = [
        'Wild Wolf Blocked Words',
        'Wild Wolf Filter Layer 2',
        'Wild Wolf Filter Layer 3',
        'Wild Wolf Filter Layer 4',
        'Wild Wolf Filter Layer 5',
        'Wild Wolf Filter Layer 6'
      ];

      let usedSlots = currentKeywordRules.size;

      for (let i = 0; i < 6; i++) {
        try {
          const ruleName = ruleNames[i];
          const existing = existingRules.find(r => r.name === ruleName);
          
          const start = i * 10;
          const end = (i + 1) * 10;
          let filter = blockedWords.slice(start, end);
          if (filter.length === 0) filter = [`*placeholder${i + 1}*`];

          const ruleData = {
            name: ruleName,
            eventType: AutoModerationRuleEventType.MessageSend,
            triggerType: AutoModerationRuleTriggerType.Keyword,
            triggerMetadata: { keywordFilter: filter },
            actions: [
              {
                type: AutoModerationActionType.BlockMessage,
                metadata: {
                  customMessage: modules.content.responseMessage?.replace('{user}', '') || 'Message blocked by Wild Wolf AutoMod.'
                }
              }
            ],
            enabled: true
          };

          if (existing) {
            await existing.edit(ruleData).catch(async (err) => {
                if (err.code === 10062 || err.status === 404) {
                    if (usedSlots < 6) await guild.autoModerationRules.create(ruleData);
                } else throw err;
            });
            syncedCount++;
          } else if (usedSlots < 6) {
            await guild.autoModerationRules.create(ruleData);
            usedSlots++;
            syncedCount++;
          }
        } catch (e) {
          // Ignore "Max rules reached" errors silently as we are now slot-aware
          if (!e.message.includes('trigger type 1 is 6')) {
            console.error(`[AutoMod Sync] Keyword Layer ${i + 1} Failed for ${guild.id}: ${e.message}`);
          }
        }
      }
    }

    // 2. Sync Spam
    try {
      if (force || modules.spam.enabled) {
        const ruleName = 'Wild Wolf Anti-Spam';
        const existing = existingRules.find(r => r.triggerType === AutoModerationRuleTriggerType.Spam);
        
        const ruleData = {
          name: ruleName,
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.Spam,
          actions: [
            {
              type: AutoModerationActionType.BlockMessage,
              metadata: {
                customMessage: modules.spam.responseMessage?.replace('{user}', '') || 'Spam detected by Wild Wolf AutoMod.'
              }
            }
          ],
          enabled: true
        };

        if (existing) await existing.edit(ruleData);
        else await guild.autoModerationRules.create(ruleData);
        syncedCount++;
      }
    } catch (e) { console.error(`[AutoMod Sync] Spam Rule Failed for ${guild.id}: ${e.message}`); }

    // 3. Sync Mention Spam
    try {
      if (force || modules.content.ghostPing || modules.spam.enabled) {
        const ruleName = 'Wild Wolf Anti-MassPing';
        const existing = existingRules.find(r => r.triggerType === AutoModerationRuleTriggerType.MentionSpam);

        const ruleData = {
          name: ruleName,
          eventType: AutoModerationRuleEventType.MessageSend,
          triggerType: AutoModerationRuleTriggerType.MentionSpam,
          triggerMetadata: { mentionTotalLimit: 5 },
          actions: [
            {
              type: AutoModerationActionType.BlockMessage,
              metadata: { customMessage: 'Mass pings are not allowed.' }
            }
          ],
          enabled: true
        };

        if (existing) await existing.edit(ruleData);
        else await guild.autoModerationRules.create(ruleData);
        syncedCount++;
      }
    } catch (e) { console.error(`[AutoMod Sync] MentionSpam Rule Failed for ${guild.id}: ${e.message}`); }

    // 4. Keyword Presets
    try {
      if (force || modules.content.enabled) {
        const ruleNamePreset = 'Wild Wolf Safety Preset';
        const existingPreset = existingRules.find(r => r.triggerType === AutoModerationRuleTriggerType.KeywordPreset);
        const ruleData = {
            name: ruleNamePreset,
            eventType: AutoModerationRuleEventType.MessageSend,
            triggerType: AutoModerationRuleTriggerType.KeywordPreset,
            triggerMetadata: { presets: [1, 2, 3] },
            actions: [
                {
                    type: AutoModerationActionType.BlockMessage,
                    metadata: { customMessage: 'Inappropriate content blocked.' }
                }
            ],
            enabled: true
        };
        if (existingPreset) await existingPreset.edit(ruleData);
        else await guild.autoModerationRules.create(ruleData);
        syncedCount++;
      }
    } catch (e) { console.error(`[AutoMod Sync] Preset Rule Failed for ${guild.id}: ${e.message}`); }

    return { success: syncedCount > 0, syncedCount };
  } catch (error) {
    console.error('Global Native AutoMod Sync Error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { syncNativeRules };
