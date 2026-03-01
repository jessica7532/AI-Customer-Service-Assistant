/* ========================================
   标签推荐器 - AI推荐最匹配的标签
   ======================================== */

const TagRecommender = {
    /**
     * 推荐最匹配的标签
     * @param {string} conversationHistory - 会话历史
     * @param {Array} allTags - 所有标签数组
     * @returns {Promise<Object>} 推荐的标签对象（单个）
     */
    async recommend(conversationHistory, allTags) {
        if (!conversationHistory || conversationHistory.trim().length === 0) {
            throw new Error('会话历史为空，无法推荐标签');
        }

        if (!allTags || allTags.length === 0) {
            throw new Error('标签列表为空');
        }

        console.log('[标签推荐] 开始分析...');
        console.log('[标签推荐] 可用标签数量:', allTags.length);
        
        try {
            // 1. 构建prompt
            const prompt = this.buildPrompt(conversationHistory, allTags);
            console.log('[标签推荐] Prompt已构建');

            // 2. 读取用户配置的标签推荐模型
            const scenarioConfig = (typeof ApiSettingsPanel !== 'undefined')
                ? ApiSettingsPanel.getScenarioModel('helpshift_tag_recommend_model')
                : null;

            if (!scenarioConfig) {
                throw new Error('请在API密钥设置中选择使用模型');
            }

            const model = scenarioConfig.modelId;
            
            console.log('[标签推荐] 调用AI模型:', model);
            const aiResponse = await AIService.callAPI(prompt, model);
            
            // 3. 解析AI返回
            const recommendedTagNames = this.parseResponse(aiResponse.text);
            console.log('[标签推荐] 推荐完成:', recommendedTagNames);
            
            // 4. 验证标签是否存在
            const validTags = this.validateTags(recommendedTagNames, allTags);
            console.log('[标签推荐] 验证后的标签:', validTags);
            
            return validTags[0];
            
        } catch (error) {
            console.error('[标签推荐] 推荐失败:', error);
            throw error;
        }
    },

    /**
     * 构建AI推荐的Prompt
     * @param {string} conversationHistory - 会话历史
     * @param {Array} allTags - 所有标签
     * @returns {string} 完整的prompt
     */
    buildPrompt(conversationHistory, allTags) {
        // 构建标签列表（按分类分组）
        const tagsByCategory = {};
        allTags.forEach(tag => {
            if (!tagsByCategory[tag.category]) {
                tagsByCategory[tag.category] = [];
            }
            tagsByCategory[tag.category].push(tag.name);
        });

        const tagList = Object.entries(tagsByCategory).map(([category, names]) => 
            `${category}: ${names.join('、')}`
        ).join('\n');

        const prompt = `你是一个专业的客服标签推荐助手。你的任务是分析用户反馈对话，从可用标签中推荐最匹配的1个标签。

## 可用标签列表
${tagList}

## 推荐要求
1. **分析会话内容**：理解用户的核心诉求和问题类型
2. **精准匹配**：从可用标签中选择最贴合的1个二级标签名称

## 输出格式
严格按照JSON数组格式输出标签名称，只返回1个：

\`\`\`json
["标签名称"]
\`\`\`

## 会话历史
${conversationHistory}

请严格按照JSON数组格式输出推荐的标签名称：`;

        return prompt;
    },

    /**
     * 解析AI返回的标签名称数组
     * @param {string} responseText - AI返回的文本
     * @returns {Array} 标签名称数组
     */
    parseResponse(responseText) {
        try {
            // 移除可能的markdown代码块标记
            let cleanText = responseText.trim();
            
            // 移除 ```json 和 ``` 标记
            cleanText = cleanText.replace(/```json\s*/gi, '');
            cleanText = cleanText.replace(/```\s*/g, '');
            
            // 尝试提取JSON数组
            const jsonMatch = cleanText.match(/\[[\s\S]*?\]/);
            if (!jsonMatch) {
                throw new Error('AI返回中未找到JSON数组');
            }
            
            const jsonText = jsonMatch[0];
            const tagNames = JSON.parse(jsonText);
            
            // 验证是否为数组
            if (!Array.isArray(tagNames)) {
                throw new Error('AI返回的不是数组');
            }
            
            // 验证数量（只取1个）
            if (tagNames.length === 0) {
                throw new Error('AI返回的标签数量为0');
            }
            
            // 清理和规范化，只取第1个
            return [String(tagNames[0]).trim()].filter(Boolean);
            
        } catch (error) {
            console.error('[标签推荐] 解析AI响应失败:', error);
            console.error('[标签推荐] 原始响应:', responseText);
            throw new Error(`解析AI响应失败: ${error.message}`);
        }
    },

    /**
     * 验证推荐的标签是否在标签列表中
     * @param {Array} tagNames - AI推荐的标签名称
     * @param {Array} allTags - 所有标签
     * @returns {Array} 验证后的标签对象数组
     */
    validateTags(tagNames, allTags) {
        const validTags = [];
        
        tagNames.forEach(name => {
            // 在allTags中查找匹配的标签
            const matchedTag = allTags.find(tag => tag.name === name);
            
            if (matchedTag) {
                validTags.push({
                    id: matchedTag.id,
                    category: matchedTag.category,
                    name: matchedTag.name,
                    type: matchedTag.type
                });
            } else {
                console.warn(`[标签推荐] AI推荐的标签"${name}"不在标签列表中，已忽略`);
            }
        });
        
        if (validTags.length === 0) {
            throw new Error('AI推荐的标签都不在标签列表中');
        }
        
        return validTags;
    }
};