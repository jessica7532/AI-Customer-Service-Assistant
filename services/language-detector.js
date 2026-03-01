// ========================================
// 语言识别服务
// 专门用于模板标签，识别用户使用的语言
// 支持两种模式：Google Translate API / AI 模型识别
// ========================================

const LanguageDetector = {
    // 我们支持的语言代码列表（即 template 标签的 key）
    SUPPORTED_LANG_CODES: [
        'zh-Hans', 'zh-Hant', 'en-US', 'ja', 'ko',
        'es-ES', 'pt-BR', 'fr-FR', 'de-DE', 'ru-RU',
        'it-IT', 'ar-SA', 'tr-TR', 'vi-VN', 'id-ID',
        'th-TH', 'nl-NL', 'pl-PL', 'ro-RO', 'sv-SE',
        'hi-IN', 'uk-UA', 'cs-CZ', 'el-GR'
    ],

    // Google语言代码 -> 我们的语言代码 映射
    langCodeMap: {
        'zh-CN': 'zh-Hans',
        'zh-TW': 'zh-Hant',
        'zh': 'zh-Hans',
        'en': 'en-US',
        'ja': 'ja',
        'ko': 'ko',
        'es': 'es-ES',
        'pt': 'pt-BR',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'ru': 'ru-RU',
        'it': 'it-IT',
        'ar': 'ar-SA',
        'tr': 'tr-TR',
        'vi': 'vi-VN',
        'id': 'id-ID',
        'th': 'th-TH',
        'nl': 'nl-NL',
        'pl': 'pl-PL',
        'ro': 'ro-RO',
        'sv': 'sv-SE',
        'hi': 'hi-IN',
        'uk': 'uk-UA',
        'cs': 'cs-CZ',
        'el': 'el-GR'
    },

    async resolveGoogleApiKey() {
        if (typeof ApiKeyStore !== 'undefined' && typeof ApiKeyStore.resolve === 'function') {
            return await ApiKeyStore.resolve('google');
        }

        return '';
    },

    /**
     * 读取用户在 API 配置面板选择的语言识别模型
     * @returns {{ mode: 'google' | 'ai', provider?: string, modelId?: string }}
     */
    _getDetectConfig() {
        const saved = localStorage.getItem('helpshift_lang_detect_model') || 'google-translate';

        if (saved === 'google-translate') {
            return { mode: 'google' };
        }

        // 格式: "providerKey::modelId"
        const sep = saved.indexOf('::');
        if (sep === -1) {
            console.warn('[语言识别] 无法解析配置值:', saved, '，回退 Google Translate');
            return { mode: 'google' };
        }

        return {
            mode: 'ai',
            provider: saved.substring(0, sep),
            modelId: saved.substring(sep + 2)
        };
    },

    /**
     * 识别用户语言（仅用于template标签）
     * 根据用户配置选择 Google Translate 或 AI 模型
     * @param {string} conversationHistory - 会话历史内容
     * @returns {Promise<string>} 语言代码（如 'zh-Hans', 'en-US' 等）
     */
    async detect(conversationHistory) {
        try {
            // 提取用户消息用于语言检测
            const userText = this.extractUserText(conversationHistory);

            if (!userText || userText.trim().length === 0) {
                console.warn('[语言识别] 无法提取用户文本，使用默认值 en-US');
                return 'en-US';
            }

            const config = this._getDetectConfig();
            console.log('[语言识别] 使用模式:', config.mode, config.modelId || '');

            let langCode;

            if (config.mode === 'ai') {
                // AI 模型识别
                langCode = await this.callAIDetect(userText, config.modelId);
            } else {
                // Google Translate API
                const googleLangCode = await this.callGoogleDetect(userText);
                langCode = this.mapLanguageCode(googleLangCode);
            }

            console.log('[语言识别] 用户文本:', userText.substring(0, 100) + '...');
            console.log('[语言识别] 最终结果:', langCode);

            return langCode;
        } catch (error) {
            console.error('[语言识别] 识别失败:', error);
            return 'en-US';
        }
    },

    // ========== AI 模型识别 ==========

    /**
     * 使用 AI 模型识别语言
     * @param {string} text - 用户消息文本
     * @param {string} model - 模型ID
     * @returns {Promise<string>} 我们的语言代码
     */
    async callAIDetect(text, model) {
        if (typeof AIService === 'undefined' || !AIService.callAPI) {
            throw new Error('AIService 不可用，无法使用 AI 识别语言');
        }

        const prompt = this._buildAIDetectPrompt(text);

        console.log('[语言识别] 调用 AI 模型:', model);
        const response = await AIService.callAPI(prompt, model);
        const result = this._parseAIDetectResponse(response.text);

        console.log('[语言识别] AI 原始返回:', response.text);
        console.log('[语言识别] AI 解析结果:', result);

        return result;
    },

    /**
     * 构建语言识别 Prompt
     * @param {string} text - 用户消息文本
     * @returns {string}
     */
    _buildAIDetectPrompt(text) {
        const codeList = this.SUPPORTED_LANG_CODES.join(', ');

        return `Detect the language of the following user message and return ONLY the matching language code from this list:

${codeList}

Rules:
- Return EXACTLY one code from the list above, nothing else.
- No explanation, no quotes, no punctuation — just the code.
- Simplified Chinese → zh-Hans
- Traditional Chinese → zh-Hant
- If unsure, return en-US

User message:
${text.substring(0, 500)}`;
    },

    /**
     * 解析 AI 返回的语言代码
     * @param {string} responseText - AI 返回的文本
     * @returns {string} 语言代码
     */
    _parseAIDetectResponse(responseText) {
        const cleaned = responseText.trim().replace(/["`']/g, '');

        // 直接匹配
        if (this.SUPPORTED_LANG_CODES.includes(cleaned)) {
            return cleaned;
        }

        // AI 可能返回多余内容，逐行查找
        const lines = cleaned.split(/[\n\r]+/);
        for (const line of lines) {
            const candidate = line.trim().replace(/["`'.,;:]/g, '');
            if (this.SUPPORTED_LANG_CODES.includes(candidate)) {
                return candidate;
            }
        }

        // 尝试在文本中搜索任意匹配的代码
        for (const code of this.SUPPORTED_LANG_CODES) {
            if (cleaned.includes(code)) {
                return code;
            }
        }

        console.warn('[语言识别] AI 返回无法解析:', responseText, '，回退 en-US');
        return 'en-US';
    },

    // ========== Google Translate 识别 ==========

    /**
     * 从会话历史中提取用户最后一条消息的文本
     * @param {string} conversationHistory - 会话历史
     * @returns {string} 用户消息文本
     */
    extractUserText(conversationHistory) {
        const lines = conversationHistory.split('\n');

        // 从后往前找，找到最后一条 User 消息
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();

            // 匹配 [日期时间 | User] 格式
            const userMatch = line.match(/\|\s*User\]\s*(.+)$/i);
            if (userMatch && userMatch[1]) {
                const text = userMatch[1].trim();
                if (text.length > 0) {
                    console.log('[语言识别] 提取到用户最后一条消息:', text);
                    return text;
                }
            }
        }

        // 备用方案：尝试匹配 [User] 开头的格式
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.match(/^\[User\]/i)) {
                const text = line.replace(/^\[User\]/i, '').trim();
                if (text.length > 0) {
                    console.log('[语言识别] 提取到用户消息(备用):', text);
                    return text;
                }
            }
        }

        console.warn('[语言识别] 未找到用户消息，使用最后100字符');
        return conversationHistory.slice(-100);
    },

    /**
     * 调用 Google Cloud Translation API 检测语言
     * @param {string} text - 要检测的文本
     * @returns {Promise<string>} Google 语言代码
     */
    async callGoogleDetect(text) {
        const apiKey = await this.resolveGoogleApiKey();
        if (!apiKey) {
            throw new Error('Missing Google Translate API key. Please configure it in API Settings.');
        }

        const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`;

        console.log('[语言识别] 调用 Google Cloud Translation API');

        const response = await Utils.request({
            method: 'POST',
            url: url,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                q: text.substring(0, 500)
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google API错误 (${response.status}): ${errorData.error?.message || '未知错误'}`);
        }

        const data = await response.json();

        const detections = data.data?.detections?.[0];
        if (!detections || detections.length === 0) {
            throw new Error('Google API 未返回检测结果');
        }

        const bestMatch = detections.reduce((best, current) =>
            (current.confidence > best.confidence) ? current : best
        );

        console.log('[语言识别] Google检测结果:', bestMatch);

        return bestMatch.language;
    },

    /**
     * 将 Google 语言代码映射为我们的格式
     * @param {string} googleCode - Google 语言代码
     * @returns {string} 我们的语言代码
     */
    mapLanguageCode(googleCode) {
        if (this.langCodeMap[googleCode]) {
            return this.langCodeMap[googleCode];
        }

        const prefix = googleCode.split('-')[0];
        if (this.langCodeMap[prefix]) {
            return this.langCodeMap[prefix];
        }

        if (this.SUPPORTED_LANG_CODES.includes(googleCode)) {
            return googleCode;
        }

        console.warn('[语言识别] 未知语言代码:', googleCode, '使用默认值 en-US');
        return 'en-US';
    },

    /**
     * 批量识别（用于未来扩展）
     * @param {Array<string>} conversations - 多个会话历史
     * @returns {Promise<Array<string>>} 语言代码数组
     */
    async batchDetect(conversations) {
        const results = [];
        for (const conversation of conversations) {
            const langCode = await this.detect(conversation);
            results.push(langCode);
        }
        return results;
    }
};