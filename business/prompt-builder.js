// ========================================
// Prompt 生成模块
// ========================================

const PromptBuilder = {
    async getRuntimeSettings() {
        if (typeof StyleSettingsService !== 'undefined' && typeof StyleSettingsService.getResolvedSettings === 'function') {
            return await StyleSettingsService.getResolvedSettings();
        }

        return {
            tonePresets: {
                friendly: { ...(CONFIG?.tonePresets?.friendly || {}) },
                soft: { ...(CONFIG?.tonePresets?.soft || {}) }
            },
            product: {
                name: '',
                description: ''
            }
        };
    },

    /**
     * 根据语气获取角色描述
     * @param {string} tone - 语气类型
     * @returns {string} 角色描述
     */
    getRoleDescription(tone) {
        const roles = {
            friendly: 'a friendly customer service representative',
            soft: 'a warm, caring support companion'
        };
        return roles[tone] || roles.friendly;
    },

    /**
    * 判断是否是新对话（需要打招呼）
    * 基于对话历史中是否有客服回复过
    * @param {string} conversationText - 对话内容
    * @returns {boolean}
    */
    isNewConversation(conversationText) {
    return !/\| Agent\]/.test(conversationText);
    },

    /**
     * 构建AI回复的Prompt
     * @param {string} conversationText - 对话内容
     * @param {number|null} selectedTag - 选中的标签ID
     * @param {string} selectedTone - 选中的语气
     * @param {string} customRequirements - 自定义要求
     * @returns {Promise<string>} 完整的Prompt
     */
    async buildReplyPrompt(conversationText, selectedTag, selectedTone, customRequirements) {
        const runtimeSettings = await this.getRuntimeSettings();

        // 获取标签的Prompt
        let tagPrompt = '';
        if (selectedTag) {
            const tags = await TagManager.getTags();
            const tag = tags.find(t => t.id === selectedTag);
            // Logic标签使用replyLogic字段
            tagPrompt = tag?.replyLogic || '';
        }

        // 获取语气的Prompt
        const tonePresets = runtimeSettings.tonePresets || {};
        const toneKey = tonePresets[selectedTone] ? selectedTone : 'friendly';
        const tonePrompt = tonePresets[toneKey]?.prompt || tonePresets.friendly?.prompt || '';

        // 处理自定义要求
        const requirements = customRequirements || 'None';

        // 判断是否需要打招呼
        const isNew = this.isNewConversation(conversationText);
        const greetingInstruction = isNew 
            ? '- This is a NEW conversation, start with a brief greeting (e.g., "Hi!", "Hey there!")\n' 
            : '- This is an ONGOING conversation, do NOT greet again\n';

        // 构建完整的Prompt
        const productName = (runtimeSettings.product?.name || '').trim();
        const productDescription = (runtimeSettings.product?.description || '').trim();
        const productScope = productName ? ` for ${productName}` : '';
        const productLine = productDescription ? `Product: ${productDescription}\n\n` : '';

        return `You are ${this.getRoleDescription(selectedTone)}${productScope}.

${productLine}Context: Review the conversation history. ${isNew ? 'This is the user\'s first message.' : 'You have already been talking with this user.'}

Reply Guidelines:
${greetingInstruction}- Tone & Style: ${tonePrompt}
- Emoji Usage: Use no more than 2 emojis in total
- Identify user's language and reply in that language
- Provide Chinese translation after the reply

${tagPrompt ? `Scenario Rules:\n${tagPrompt}\n` : ''}${requirements !== 'None' ? `Special Instructions:\n${requirements}\n` : ''}User Message History:
${conversationText}

Output Format (strictly follow, no extra text):
User Language Reply: [your reply in user's language]
Chinese Translation: [Chinese translation]

⚠️ Important:
- Must fully consider all rules above, do not omit
- Must reply using the user's detected language`;
    }
};
