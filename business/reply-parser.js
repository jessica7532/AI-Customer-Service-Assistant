// ========================================
// 回复解析模块
// ========================================

const ReplyParser = {
    /**
     * 解析AI返回的回复
     * @param {string} aiReply - AI的原始回复
     * @returns {Object} 解析结果 {success, originalReply, translation}
     */
    parse(aiReply) {
        try {
            // 支持中英文格式的正则匹配
            const originalMatch = aiReply.match(/(?:用户语言回复|User Language Reply)[：:]\s*([\s\S]*?)(?=\n\n?(?:中文翻译|Chinese Translation)[：:]|$)/i);
            const translationMatch = aiReply.match(/(?:中文翻译|Chinese Translation)[：:]\s*([\s\S]*)$/i);

            const originalReply = originalMatch?.[1]?.trim() || null;
            const translation = translationMatch?.[1]?.trim() || null;

            // 如果没有解析到原始回复，返回失败
            if (!originalReply) {
                return {
                    success: false,
                    originalReply: `解析失败，原始输出：\n\n${aiReply}`,
                    translation: '解析失败，请查看用户语言回复框'
                };
            }

            return {
                success: true,
                originalReply: originalReply,
                translation: translation || '未提供翻译'
            };
        } catch (error) {
            console.error('解析AI回复错误:', error);
            return {
                success: false,
                originalReply: aiReply,
                translation: '解析失败'
            };
        }
    }
};
