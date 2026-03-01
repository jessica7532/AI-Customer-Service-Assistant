/* ========================================
   消息翻译器
   为每条聊天消息添加翻译按钮
   ======================================== */

const MessageTranslator = {
    // 翻译图标SVG
    icons: {
        translate: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
        loading: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>'
    },

    /**
     * 初始化翻译器
     */
    init() {
        console.log('[MessageTranslator] 初始化...');
        
        // 初始处理已有消息
        this.processAllMessages();
        
        // 监听DOM变化，处理新消息
        this.observeNewMessages();
        
        console.log('[MessageTranslator] 初始化完成');
    },

    /**
     * 处理页面上所有消息
     */
    processAllMessages() {
        const messages = document.querySelectorAll('.hs-msg__wrapper');
        messages.forEach(wrapper => this.addTranslateButton(wrapper));
    },

    /**
     * 监听新消息
     */
    observeNewMessages() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查是否是消息wrapper
                        if (node.classList?.contains('hs-msg__wrapper')) {
                            this.addTranslateButton(node);
                        }
                        // 检查子元素中是否有消息wrapper
                        const wrappers = node.querySelectorAll?.('.hs-msg__wrapper');
                        wrappers?.forEach(wrapper => this.addTranslateButton(wrapper));
                    }
                });
            });
        });

        // 监听整个文档
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    /**
     * 给消息添加翻译按钮
     * @param {HTMLElement} wrapper - 消息wrapper元素
     */
    addTranslateButton(wrapper) {
        // 检查是否已经添加过按钮
        if (wrapper.querySelector('.msg-translate-btn')) {
            return;
        }

        // 跳过系统消息
        const msg = wrapper.querySelector('.hs-msg');
        if (msg?.classList.contains('hs-msg--system') || msg?.classList.contains('hs-msg--bot-msg')) {
            return;
        }

        // 找到时间戳元素，按钮放在时间戳旁边
        const tsElement = wrapper.querySelector('.hs-msg__ts');
        if (!tsElement) {
            return;
        }

        // 创建翻译按钮
        const btn = document.createElement('button');
        btn.className = 'msg-translate-btn';
        btn.title = '翻译成中文';
        btn.innerHTML = this.icons.translate;
        btn.setAttribute('translate', 'no');

        // 绑定点击事件
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleTranslate(wrapper, btn);
        });

        // 插入按钮到时间戳后面
        tsElement.parentNode.insertBefore(btn, tsElement.nextSibling);
    },

    /**
     * 处理翻译
     * @param {HTMLElement} wrapper - 消息wrapper
     * @param {HTMLElement} btn - 翻译按钮
     */
    async handleTranslate(wrapper, btn) {
        // 检查是否已有翻译结果
        const existingResult = wrapper.querySelector('.msg-translation-result');
        if (existingResult) {
            // 已有结果，切换显示/隐藏
            existingResult.style.display = existingResult.style.display === 'none' ? 'block' : 'none';
            return;
        }

        // 获取消息内容
        const bodyElement = wrapper.querySelector('.hs-msg__body');
        if (!bodyElement) {
            console.error('[MessageTranslator] 未找到消息内容');
            return;
        }

        // 克隆并清理内容（移除翻译插件添加的元素）
        const clonedBody = bodyElement.cloneNode(true);
        const translateElements = clonedBody.querySelectorAll('[class*="immersive-translate"]');
        translateElements.forEach(el => el.remove());
        
        const text = clonedBody.textContent.trim();
        if (!text) {
            console.log('[MessageTranslator] 消息内容为空');
            return;
        }

        // 设置按钮为加载状态
        btn.classList.add('loading');
        btn.innerHTML = this.icons.loading;

        try {
            // 调用翻译
            const translation = await this.translate(text);
            
            // 显示翻译结果
            this.showTranslation(wrapper, bodyElement, translation);
            
        } catch (error) {
            console.error('[MessageTranslator] 翻译失败:', error);
            this.showTranslation(wrapper, bodyElement, '翻译失败: ' + error.message, true);
        } finally {
            // 恢复按钮状态
            btn.classList.remove('loading');
            btn.innerHTML = this.icons.translate;
        }
    },

    /**
     * 调用AI翻译
     * @param {string} text - 要翻译的文本
     * @returns {Promise<string>} 翻译结果
     */
    async translate(text) {
        const prompt = `将以下文本翻译成简体中文。只输出翻译结果，不要任何解释或额外内容：

${text}`;

        // 翻译固定使用 Gemini，节省成本
        const model = 'gemini-3-flash-preview';

        const response = await AIService.callAPI(prompt, model);
        return response.text.trim();
    },

    /**
     * 显示翻译结果
     * @param {HTMLElement} wrapper - 消息wrapper
     * @param {HTMLElement} bodyElement - 消息body元素
     * @param {string} translation - 翻译文本
     * @param {boolean} isError - 是否是错误
     */
    showTranslation(wrapper, bodyElement, translation, isError = false) {
        // 移除旧的翻译结果（如果有）
        const oldResult = wrapper.querySelector('.msg-translation-result');
        if (oldResult) {
            oldResult.remove();
        }

        // 创建翻译结果元素
        const resultDiv = document.createElement('div');
        resultDiv.className = 'msg-translation-result' + (isError ? ' error' : '');
        resultDiv.textContent = translation;
        resultDiv.setAttribute('translate', 'no');

        // 插入到消息body下方
        bodyElement.parentNode.insertBefore(resultDiv, bodyElement.nextSibling);
    }
};

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MessageTranslator.init());
} else {
    // 延迟一点初始化，确保页面消息已加载
    setTimeout(() => MessageTranslator.init(), 1000);
}
