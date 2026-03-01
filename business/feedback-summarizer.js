/* ========================================
   反馈总结器 - AI自动分析用户反馈
   ======================================== */

const FeedbackSummarizer = {
    /**
     * 分析用户反馈并返回分类和总结
     * @param {string} conversationHistory - 会话历史文本
     * @param {object} categories - 分类配置对象 (EXTRACTOR_CONFIG.categories)
     * @returns {Promise<Object>} { category1, category2, summary, content }
     */
    async summarize(conversationHistory, categories) {
        if (!conversationHistory || conversationHistory.trim().length === 0) {
            throw new Error('会话历史为空，无法分析');
        }

        console.log('[反馈总结] 开始分析会话历史...');
        
        try {
            // 1. 构建prompt
            const prompt = this.buildPrompt(conversationHistory, categories);
            console.log('[反馈总结] Prompt已构建');

            // 2. 读取用户配置的总结模型
            const scenarioConfig = (typeof ApiSettingsPanel !== 'undefined')
                ? ApiSettingsPanel.getScenarioModel('helpshift_summary_model')
                : null;

            if (!scenarioConfig) {
                // 用户选择了"不调用AI执行"，静默跳过
                console.log('[反馈总结] 用户未配置总结模型，跳过AI总结');
                return null;
            }

            const model = scenarioConfig.modelId;
            
            console.log('[反馈总结] 调用AI模型:', model);
            const aiResponse = await AIService.callAPI(prompt, model);
            if (typeof CollapsiblePanel !== 'undefined' && typeof CollapsiblePanel.updateScenarioTokenUsage === 'function') {
                CollapsiblePanel.updateScenarioTokenUsage('summary', aiResponse.usage || null);
            }
            
            // 3. 解析AI返回
            const result = this.parseResponse(aiResponse.text);
            console.log('[反馈总结] 分析完成:', result);
            
            return result;
            
        } catch (error) {
            if (typeof CollapsiblePanel !== 'undefined' && typeof CollapsiblePanel.updateScenarioTokenUsage === 'function') {
                CollapsiblePanel.updateScenarioTokenUsage('summary', null);
            }
            console.error('[反馈总结] 分析失败:', error);
            throw error;
        }
    },

    /**
     * 构建AI分析的Prompt
     * @param {string} conversationHistory - 会话历史
     * @param {object} categories - 分类配置
     * @returns {string} 完整的prompt
     */
    buildPrompt(conversationHistory, categories) {
        // 压缩分类列表以节省token
        const categoryList = Object.entries(categories).map(([cat1, cat2List]) => 
            `${cat1}: ${cat2List.join('、')}`
        ).join('\n');

        const prompt = `分析客服对话，提取用户核心问题。

## 分类标签
${categoryList}

## 要求
1. 找到用户最近一次实质性反馈（忽略催促、致谢等）
2. 选择合适的分类标签，必须使用提供的分类

## summary字段要求
- 只写问题本身是什么+必要细节，20-120字
- 不要写时间、不要写用户做了什么、不要写客服说了什么
- 不要写"用户反馈"、"用户报告"这类词
- 直接描述问题现象
- 错误示例："用户反馈设置界面中计时器选项未显示的问题持续存在，用户在1月16日首次报告..."
- 正确示例："设置界面中计时器选项未显示"

## content字段要求
- 提取用户原话，保持原语言，不翻译
- 完整保留用户描述，不要截断或精简
- 多条消息用 | 分隔

## 输出JSON
\`\`\`json
{
  "category1": "一级分类",
  "category2": "二级分类",
  "summary": "20-120字问题描述",
  "content": "用户完整原话"
}
\`\`\`

⚠️ 字段值中不要用英文双引号(")或反斜杠(\\)

## 会话历史
${conversationHistory}

输出JSON：`;

        return prompt;
    },

    /**
     * 解析AI返回的JSON响应
     * @param {string} responseText - AI返回的文本
     * @returns {Object} { category1, category2, summary, content }
     */
    parseResponse(responseText) {
        try {
            // 移除可能的markdown代码块标记
            let cleanText = responseText.trim();
            
            // 移除 ```json 和 ``` 标记
            cleanText = cleanText.replace(/```json\s*/gi, '');
            cleanText = cleanText.replace(/```\s*/g, '');
            
            // 尝试提取JSON对象
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('AI返回中未找到JSON对象');
            }
            
            let jsonText = jsonMatch[0];
            
            // 简单处理：移除字符串值内的实际换行符
            // 将JSON字符串内的真实换行替换为空格
            jsonText = jsonText.replace(/:\s*"([^"]*)"/g, (match, content) => {
                const fixed = content.replace(/[\r\n]+/g, ' ');
                return `: "${fixed}"`;
            });
            
            const parsed = JSON.parse(jsonText);
            
            // 验证必需字段
            if (!parsed.category1 || !parsed.category2 || !parsed.summary || !parsed.content) {
                throw new Error('AI返回的JSON缺少必需字段');
            }
            
            // 清理和规范化数据
            return {
                category1: String(parsed.category1).trim(),
                category2: String(parsed.category2).trim(),
                summary: String(parsed.summary).trim(),
                content: String(parsed.content).trim()
            };
            
        } catch (error) {
            console.error('[反馈总结] 解析AI响应失败:', error);
            console.error('[反馈总结] 原始响应:', responseText);
            throw new Error(`解析AI响应失败: ${error.message}`);
        }
    }
};