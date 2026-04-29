const { AutoModerationRuleEventType, AutoModerationRuleTriggerType, AutoModerationActionType } = require('discord.js');

/**
 * Synchronize custom automod configuration with Discord's native AutoMod rules.
 * @param {import('discord.js').Guild} guild 
 * @param {object} config 
 */
async function syncNativeRules(guild, config) {
  try {
    let me = guild.members.me;
    if (!me) me = await guild.members.fetch(guild.client.user.id).catch(() => null);
    
    if (!me || !me.permissions.has('ManageGuild')) return { success: false, error: 'Missing ManageGuild permission' };

    const existingRules = await guild.autoModerationRules.fetch();
    const modules = config.modules;

    // 1. Sync Content / Blocked Words (Keywords)
    // We can have up to 6 keyword rules. We'll use 1 for now or split if words are many.
    const blockedWords = [...(modules.content.blockedWords || []), ...(modules.content.partialBlockedWords || [])];
    
    if (modules.content.enabled && blockedWords.length > 0) {
      // Consolidate into chunks of 1000 chars or whatever Discord limit is (usually 1000 per rule metadata)
      const ruleName = 'Wild Wolf Content Filter';
      const existing = existingRules.find(r => r.name === ruleName);

      const ruleData = {
        name: ruleName,
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: {
          keywordFilter: blockedWords.slice(0, 1000) // Native limit is 1000 words total across all keyword rules, but per rule is also limited
        },
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
        await existing.edit(ruleData);
      } else {
        await guild.autoModerationRules.create(ruleData);
      }
    }

    // 2. Sync Spam
    if (modules.spam.enabled) {
      const ruleName = 'Wild Wolf Anti-Spam';
      const existing = existingRules.find(r => r.name === ruleName);
      
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

      if (existing) {
        await existing.edit(ruleData);
      } else {
        await guild.autoModerationRules.create(ruleData);
      }
    }

    // 3. Sync Mention Spam (Native supports this)
    if (modules.content.ghostPing || modules.spam.enabled) {
      const ruleName = 'Wild Wolf Anti-MassPing';
      const existing = existingRules.find(r => r.name === ruleName);

      const ruleData = {
        name: ruleName,
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.MentionSpam,
        triggerMetadata: {
          mentionTotalLimit: 5 // Default limit
        },
        actions: [
          {
            type: AutoModerationActionType.BlockMessage,
            metadata: {
              customMessage: 'Mass pings are not allowed.'
            }
          }
        ],
        enabled: true
      };

      if (existing) {
        await existing.edit(ruleData);
      } else {
        await guild.autoModerationRules.create(ruleData);
      }
    }

    // 4. Keyword Presets (Profanity, etc.)
    const ruleNamePreset = 'Wild Wolf Safety Preset';
    const existingPreset = existingRules.find(r => r.name === ruleNamePreset);
    if (modules.content.enabled) {
        const ruleData = {
            name: ruleNamePreset,
            eventType: AutoModerationRuleEventType.MessageSend,
            triggerType: AutoModerationRuleTriggerType.KeywordPreset,
            triggerMetadata: {
                presets: [1, 2, 3] // Profanity, Sexual Content, Slurs
            },
            actions: [
                {
                    type: AutoModerationActionType.BlockMessage,
                    metadata: {
                        customMessage: 'Inappropriate content blocked.'
                    }
                }
            ],
            enabled: true
        };
        if (existingPreset) {
            await existingPreset.edit(ruleData);
        } else {
            await guild.autoModerationRules.create(ruleData);
        }
    }

    return { success: true };
  } catch (error) {
    console.error('Native AutoMod Sync Error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { syncNativeRules };
