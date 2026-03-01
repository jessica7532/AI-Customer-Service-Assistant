// ========================================
// 应用主控制器
// ========================================

const App = {
    selectedTagId: null,
    selectedTone: 'friendly', // 默认友好专业
    currentEditingTagId: null,

    /**
     * 初始化应用
     */
    async init() {
        try {
            await TagManager.init();
            UI.init();  // ← 只需要这一行，会自动创建侧边栏
            
            // 初始化数据提取器事件监听（监听Issue面板状态）
            if (typeof ExtractorEvents !== 'undefined') {
                ExtractorEvents.init();
            }
            
            console.log('✅ Helpshift AI助手初始化成功');
        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
        }
    },

    /**
     * 生成AI回复
     * @param {Object} options - 回复选项
     * @param {number} options.tagId - 标签ID（可选）
     * @param {string} options.tone - 语气（'friendly' 或 'soft'）
     * @param {string} options.customPrompt - 自定义提示词（可选）
     */
    async generateReply(options = {}) {
        console.log('[App] generateReply 被调用');
        console.log('[App] 接收到的 options:', options);
        console.log('[App] this.selectedTagId:', this.selectedTagId);
        
        // 支持参数传递或从DOM读取
        const conversationText = window.conversationHistory || '';
        
        if (!conversationText) {
            Utils.showNotification('⚠ 请先读取对话历史', 'warning');
            return;
        }

        // 优先使用传入的参数，否则从App状态读取
        const tagId = options.tagId !== undefined ? options.tagId : this.selectedTagId;
        const tone = options.tone || this.selectedTone || 'friendly';
        const customPrompt = options.customPrompt || '';

        console.log('[App] 最终使用的参数:');
        console.log('[App]   tagId:', tagId);
        console.log('[App]   tone:', tone);
        console.log('[App]   customPrompt:', customPrompt);

        // 更新CollapsiblePanel为加载状态
        if (typeof CollapsiblePanel !== 'undefined') {
            CollapsiblePanel.updateOriginal('生成回复中...');
            CollapsiblePanel.updateTranslation('生成回复中...');
            if (typeof CollapsiblePanel.updateTokenUsage === 'function') {
                CollapsiblePanel.updateTokenUsage(null);
            }
        }

        try {
            let result;
            
            // 如果选择了标签，使用TagProcessor处理
            if (tagId) {
                result = await TagProcessor.process(
                    tagId,
                    conversationText,
                    customPrompt,
                    tone
                );
            } else {
                // 没有标签时，也使用主回复prompt（但不带标签的replyLogic）
                const fullPrompt = await PromptBuilder.buildReplyPrompt(
                    conversationText,
                    null,  // 没有标签ID
                    tone,
                    customPrompt
                );
                
                // 获取当前选择的模型（从localStorage读取）
                const selectedModel = localStorage.getItem('helpshift_selected_model') || '';
                
                if (!selectedModel) {
                    Utils?.showNotification?.('请先在侧边栏选择一个 AI 模型', 'warning');
                    return { success: false };
                }
                
                const aiResponse = await AIService.callAPI(fullPrompt, selectedModel);
                
                // 解析回复（使用ReplyParser保持一致）
                const parsed = ReplyParser.parse(aiResponse.text);
                
                result = {
                    success: parsed.success,
                    originalReply: parsed.originalReply,
                    translation: parsed.translation,
                    type: 'direct',
                    warning: aiResponse.warning,
                    usage: aiResponse.usage
                };
            }

            console.log('[生成回复] 处理结果:', result);

            // 同步更新CollapsiblePanel（如果存在）
            if (typeof CollapsiblePanel !== 'undefined') {
                CollapsiblePanel.updateOriginal(result.originalReply);
                CollapsiblePanel.updateTranslation(result.translation);
                if (typeof CollapsiblePanel.updateTokenUsage === 'function') {
                    CollapsiblePanel.updateTokenUsage(result.usage || null);
                }
            }

            // 自动复制
            if (result.success) {
                await navigator.clipboard.writeText(result.originalReply);
                
                // 根据类型显示不同的提示
                if (result.type === 'template') {
                    Utils.showNotification(`✅ 已复制模板（${LanguageConfig.getLanguageName(result.detectedLang)}）`);
                } else {
                    Utils.showNotification('✅ 已自动复制回复');
                }
            }

            // 显示警告（仅logic类型可能有）
            if (result.warning) {
                console.warn('[App] 警告:', result.warning);
                Utils.showNotification('⚠️ ' + result.warning, 'warning');
            }
        } catch (error) {
            console.error('[生成回复] 处理失败:', error);
            
            // 更新CollapsiblePanel为错误状态
            if (typeof CollapsiblePanel !== 'undefined') {
                CollapsiblePanel.updateOriginal(`错误: ${error.message}`);
                CollapsiblePanel.updateTranslation('请检查浏览器控制台(F12)获取详情');
                if (typeof CollapsiblePanel.updateTokenUsage === 'function') {
                    CollapsiblePanel.updateTokenUsage(null);
                }
            }
            
            Utils.showNotification(`❌ 处理失败: ${error.message}`, 'error');
        }
    }
};

// 将 App 暴露到全局作用域，供 PromptEditor 调用
window.appEvents = App;