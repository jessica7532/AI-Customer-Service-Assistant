// ========================================
// 模板翻译服务
// 使用AI翻译模板到多种语言
// ========================================

const TemplateTranslator = {
    /**
     * 翻译模板到所有支持的语言
     * @param {string} baseText - 基准文本内容
     * @param {string} baseLang - 基准语言代码（默认中文简体）
     * @returns {Promise<Object>} 包含所有语言的对象
     */
    async translateAll(baseText, baseLang = 'zh-Hans') {
        try {
            if (!baseText || !baseText.trim()) {
                throw new Error('基准文本不能为空');
            }

            console.log('[模板翻译] 开始翻译，基准语言:', baseLang);
            console.log('[模板翻译] 基准文本:', baseText);

            // 构建翻译prompt
            const prompt = this.buildTranslationPrompt(baseText, baseLang);
            
            // 读取用户配置的翻译模型
            const scenarioConfig = (typeof ApiSettingsPanel !== 'undefined')
                ? ApiSettingsPanel.getScenarioModel('helpshift_translate_model')
                : null;

            if (!scenarioConfig) {
                throw new Error('请在API密钥设置中选择使用模型');
            }

            const translateModel = scenarioConfig.modelId;
            console.log('[模板翻译] 使用模型:', translateModel);
            const response = await AIService.callAPI(prompt, translateModel);
            if (typeof CollapsiblePanel !== 'undefined' && typeof CollapsiblePanel.updateScenarioTokenUsage === 'function') {
                CollapsiblePanel.updateScenarioTokenUsage('template', response.usage || null);
            }
            
            // 解析JSON响应
            const translations = this.parseTranslations(response.text);  // 注意：callAPI返回{text, warning}
            
            // 添加基准语言的原文
            translations[baseLang] = baseText;
            
            console.log('[模板翻译] 翻译完成，语言数量:', Object.keys(translations).length);
            
            return translations;
        } catch (error) {
            if (typeof CollapsiblePanel !== 'undefined' && typeof CollapsiblePanel.updateScenarioTokenUsage === 'function') {
                CollapsiblePanel.updateScenarioTokenUsage('template', null);
            }
            console.error('[模板翻译] 翻译失败:', error);
            throw error;
        }
    },

    /**
     * 构建翻译prompt
     * @param {string} baseText - 基准文本
     * @param {string} baseLang - 基准语言代码
     * @returns {string}
     */
    buildTranslationPrompt(baseText, baseLang) {
        const baseLangName = LanguageConfig.getLanguageName(baseLang);
        const baseLangNameEn = LanguageConfig.getLanguageNameEn(baseLang);
        
        // 获取需要翻译的目标语言（排除基准语言）
        const targetLangs = LanguageConfig.getLanguageCodes()
            .filter(code => code !== baseLang);
        
        // 构建语言列表说明
        const langListText = targetLangs
            .map(code => `- ${code}: ${LanguageConfig.getLanguageNameEn(code)}`)
            .join('\n');

        return `请将以下客服回复模板翻译成多种语言。

重要要求：
1. 保持专业、礼貌的客服语气
2. 保持原文的意思和语气
3. 翻译要准确、自然
4. 只返回JSON格式，不要其他任何内容

原文（${baseLangName} / ${baseLangNameEn}）：
"""
${baseText}
"""

请翻译成以下语言：
${langListText}

返回格式（只返回JSON，不要markdown代码块标记）：
{
  "zh-Hant": "繁体中文翻译",
  "en-US": "English translation",
  "ja": "日本語の翻訳",
  "ko": "한국어 번역",
  ...
}

你的回答（只返回JSON）：`.trim();
    },

    /**
     * 解析AI返回的翻译JSON
     * @param {string} response - AI返回的原始内容
     * @returns {Object} 翻译对象
     */
    parseTranslations(response) {
        try {
            // 清理可能的markdown代码块标记
            let cleanedResponse = response.trim();
            cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
            cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
            cleanedResponse = cleanedResponse.trim();
            
            // 尝试直接解析
            let translations;
            try {
                translations = JSON.parse(cleanedResponse);
            } catch (directParseError) {
                // 直接解析失败，尝试修复常见问题
                console.log('[模板翻译] 直接解析失败，尝试修复JSON...');
                
                // 方法1: 修复JSON字符串中的换行符
                // 在JSON字符串值内部，换行符需要转义为 \n
                let fixedResponse = cleanedResponse;
                
                // 匹配 "key": "value" 模式，处理value中的真实换行
                fixedResponse = fixedResponse.replace(
                    /"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g,
                    (match, key, value) => {
                        // 将值中的实际换行符替换为 \\n
                        const fixedValue = value
                            .replace(/\r\n/g, '\\n')
                            .replace(/\n/g, '\\n')
                            .replace(/\r/g, '\\n');
                        return `"${key}": "${fixedValue}"`;
                    }
                );
                
                try {
                    translations = JSON.parse(fixedResponse);
                } catch (fixError) {
                    // 方法2: 逐行提取键值对
                    console.log('[模板翻译] 修复后仍失败，尝试逐行解析...');
                    translations = this.extractKeyValuePairs(cleanedResponse);
                }
            }
            
            // 验证是否是对象
            if (!translations || typeof translations !== 'object') {
                throw new Error('翻译结果不是有效的对象');
            }
            
            // 验证是否至少有一些翻译
            const validTranslations = Object.values(translations)
                .filter(text => text && typeof text === 'string' && text.trim().length > 0);
            
            if (validTranslations.length === 0) {
                throw new Error('没有有效的翻译结果');
            }
            
            console.log('[模板翻译] 成功解析翻译:', Object.keys(translations).length, '种语言');
            
            return translations;
        } catch (error) {
            console.error('[模板翻译] 解析翻译失败:', error);
            console.error('[模板翻译] 原始响应:', response);
            throw new Error('解析翻译结果失败：' + error.message);
        }
    },

    /**
     * 从响应中提取键值对（备用解析方法）
     * @param {string} response - AI返回的原始内容
     * @returns {Object} 翻译对象
     */
    extractKeyValuePairs(response) {
        const translations = {};
        const validLangCodes = LanguageConfig.getLanguageCodes();
        
        // 匹配语言代码和对应的值
        // 支持格式: "zh-Hant": "翻译内容" 或 "zh-Hant": "多行\n翻译内容"
        for (const langCode of validLangCodes) {
            // 构建正则表达式匹配该语言代码的值
            // 匹配从 "langCode": " 开始到下一个 "langCode": 或 } 结束
            const escapedCode = langCode.replace(/-/g, '\\-');
            const regex = new RegExp(`"${escapedCode}"\\s*:\\s*"([\\s\\S]*?)(?:"|(?="[a-z]{2}(?:-[A-Za-z]+)?"\\s*:)|(?=\\s*\\}\\s*$))`, 'i');
            const match = response.match(regex);
            
            if (match && match[1]) {
                // 清理提取的值
                let value = match[1];
                // 移除尾部可能的引号和逗号
                value = value.replace(/[",\s]+$/, '');
                // 处理转义字符
                value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                
                if (value.trim()) {
                    translations[langCode] = value.trim();
                }
            }
        }
        
        if (Object.keys(translations).length === 0) {
            throw new Error('无法从响应中提取翻译内容');
        }
        
        console.log('[模板翻译] 通过逐行解析提取到', Object.keys(translations).length, '种语言');
        return translations;
    },

    /**
     * 翻译单个语言
     * @param {string} baseText - 基准文本
     * @param {string} baseLang - 基准语言
     * @param {string} targetLang - 目标语言
     * @returns {Promise<string>} 翻译后的文本
     */
    async translateSingle(baseText, baseLang, targetLang) {
        try {
            const baseLangName = LanguageConfig.getLanguageName(baseLang);
            const targetLangName = LanguageConfig.getLanguageNameEn(targetLang);
            
            const prompt = `请将以下${baseLangName}客服回复翻译成${targetLangName}。
保持专业、礼貌的客服语气，翻译要准确、自然。

原文：
"""
${baseText}
"""

只返回翻译后的文本，不要其他任何内容。

翻译：`.trim();

            // 读取用户配置的翻译模型
            const scenarioConfig = (typeof ApiSettingsPanel !== 'undefined')
                ? ApiSettingsPanel.getScenarioModel('helpshift_translate_model')
                : null;

            if (!scenarioConfig) {
                throw new Error('请在API密钥设置中选择使用模型');
            }

            const translateModel = scenarioConfig.modelId;
            const result = await AIService.callAPI(prompt, translateModel);
            return result.text.trim();
        } catch (error) {
            console.error('[模板翻译] 单个翻译失败:', error);
            throw error;
        }
    },

    /**
     * 验证翻译结果
     * @param {Object} translations - 翻译对象
     * @returns {Object} 验证结果 { valid: boolean, missing: Array, errors: Array }
     */
    validateTranslations(translations) {
        const allLanguages = LanguageConfig.getLanguageCodes();
        const missing = [];
        const errors = [];
        
        for (const langCode of allLanguages) {
            if (!translations[langCode]) {
                missing.push(langCode);
            } else if (typeof translations[langCode] !== 'string') {
                errors.push(`${langCode}: 不是字符串类型`);
            } else if (translations[langCode].trim().length === 0) {
                errors.push(`${langCode}: 内容为空`);
            }
        }
        
        return {
            valid: missing.length === 0 && errors.length === 0,
            missing,
            errors,
            coverage: ((allLanguages.length - missing.length) / allLanguages.length * 100).toFixed(1) + '%'
        };
    }
};