// ========================================
// 标签处理器
// 统一处理 logic 和 template 两种类型的标签
// ========================================

const TagProcessor = {
    /**
     * 处理标签点击并生成回复
     * @param {number} tagId - 标签ID
     * @param {string} conversationHistory - 会话历史
     * @param {string} customPrompt - 用户手动补充的prompt
     * @param {string} tone - 回复语气
     * @returns {Promise<Object>} { success, originalReply, translation, type }
     */
    async process(tagId, conversationHistory, customPrompt = '', tone = 'friendly') {
        try {
            console.log('[TagProcessor] process 被调用');
            console.log('[TagProcessor] tagId:', tagId);
            console.log('[TagProcessor] tone:', tone);
            
            // 获取标签
            const tag = await TagManager.getTagById(tagId);
            
            if (!tag) {
                throw new Error('标签不存在');
            }

            console.log('[TagProcessor] 获取到的标签:', tag);
            console.log('[TagProcessor] 标签类型 tag.type:', tag.type);

            // 根据类型分流
            if (tag.type === 'logic') {
                console.log('[TagProcessor] 走 logic 分支');
                return await this.processLogicTag(tag, conversationHistory, customPrompt, tone);
            } else if (tag.type === 'template') {
                console.log('[TagProcessor] 走 template 分支');
                return await this.processTemplateTag(tag, conversationHistory);
            } else {
                throw new Error('未知的标签类型: ' + tag.type);
            }
        } catch (error) {
            console.error('[标签处理] 处理失败:', error);
            throw error;
        }
    },

    /**
     * 处理回复逻辑标签
     * @param {Object} tag - 标签对象
     * @param {string} conversationHistory - 会话历史
     * @param {string} customPrompt - 自定义prompt
     * @param {string} tone - 语气
     * @returns {Promise<Object>}
     */
    async processLogicTag(tag, conversationHistory, customPrompt, tone) {
        console.log('[Logic标签] 开始处理');

        // 构建完整的prompt
        const fullPrompt = await PromptBuilder.buildReplyPrompt(
            conversationHistory,
            tag.id,
            tone,
            customPrompt
        );

        console.log('[Logic标签] Prompt已构建');

        // 获取当前选择的模型（从localStorage读取）
        const model = localStorage.getItem('helpshift_selected_model') || '';
        if (!model) {
            throw new Error('请先在侧边栏选择一个 AI 模型');
        }
        console.log('[Logic标签] 使用模型:', model);

        // 调用AI生成回复
        const result = await AIService.callAPI(fullPrompt, model);

        console.log('[Logic标签] AI调用完成');

        // 解析回复
        const parsed = ReplyParser.parse(result.text);

        return {
            success: parsed.success,
            originalReply: parsed.originalReply,
            translation: parsed.translation,
            type: 'logic',
            warning: result.warning,
            usage: result.usage
        };
    },

    /**
     * 处理回复模板标签
     * @param {Object} tag - 标签对象
     * @param {string} conversationHistory - 会话历史
     * @returns {Promise<Object>}
     */
    async processTemplateTag(tag, conversationHistory) {
        console.log('[Template标签] 开始处理');

        // Step 1: 识别用户语言（使用Haiku）
        console.log('[Template标签] Step 1: 识别用户语言');
        const userLang = await LanguageDetector.detect(conversationHistory);
        console.log('[Template标签] 识别到的语言:', userLang);

        // Step 2: 从模板中匹配对应语言
        console.log('[Template标签] Step 2: 匹配模板');
        
        if (!tag.languages) {
            throw new Error('模板标签缺少languages字段');
        }

        // 获取用户语言的回复
        let originalReply = tag.languages[userLang];
        
        // 如果没有匹配到，尝试兜底到英文
        if (!originalReply || originalReply.trim().length === 0) {
            console.warn('[Template标签] 未找到匹配的语言:', userLang, '使用英文兜底');
            originalReply = tag.languages['en-US'];
        }

        // 如果英文也没有，使用中文简体
        if (!originalReply || originalReply.trim().length === 0) {
            console.warn('[Template标签] 未找到英文，使用中文简体兜底');
            originalReply = tag.languages['zh-Hans'];
        }

        // 如果还是没有，报错
        if (!originalReply || originalReply.trim().length === 0) {
            throw new Error('模板中没有任何可用的语言内容');
        }

        // 获取中文翻译（用于显示在"中文翻译"框）
        let translation = tag.languages['zh-Hans'];
        
        // 如果中文简体为空，尝试中文繁体
        if (!translation || translation.trim().length === 0) {
            translation = tag.languages['zh-Hant'];
        }

        // 如果都没有，用原文
        if (!translation || translation.trim().length === 0) {
            translation = originalReply;
        }

        console.log('[Template标签] 处理完成');
        console.log('[Template标签] 用户语言版本:', originalReply.substring(0, 50) + '...');
        console.log('[Template标签] 中文翻译:', translation.substring(0, 50) + '...');

        return {
            success: true,
            originalReply,
            translation,
            type: 'template',
            detectedLang: userLang,
            usage: null
        };
    },

    /**
     * 快速验证标签是否可用
     * @param {number} tagId - 标签ID
     * @returns {Promise<Object>} { valid, reason }
     */
    async validateTag(tagId) {
        try {
            const tag = await TagManager.getTagById(tagId);
            
            if (!tag) {
                return { valid: false, reason: '标签不存在' };
            }

            if (tag.type === 'logic') {
                if (!tag.replyLogic || tag.replyLogic.trim().length === 0) {
                    return { valid: false, reason: '回复逻辑为空' };
                }
            } else if (tag.type === 'template') {
                if (!tag.languages) {
                    return { valid: false, reason: '缺少languages字段' };
                }
                
                // 检查是否至少有一个语言有内容
                const hasContent = Object.values(tag.languages)
                    .some(text => text && text.trim().length > 0);
                
                if (!hasContent) {
                    return { valid: false, reason: '模板中没有任何语言内容' };
                }
            } else {
                return { valid: false, reason: '未知的标签类型: ' + tag.type };
            }

            return { valid: true };
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }
};