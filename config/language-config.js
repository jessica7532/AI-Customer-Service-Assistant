// ========================================
// 语言配置
// 定义系统支持的24种语言
// ========================================

const LanguageConfig = {
    // 支持的语言列表（24种）
    SUPPORTED_LANGUAGES: {
        'zh-Hans': { name: '中文简体', nameEn: 'Simplified Chinese', order: 1 },
        'zh-Hant': { name: '中文繁体', nameEn: 'Traditional Chinese', order: 2 },
        'en-US': { name: '英语', nameEn: 'English', order: 3 },
        'ja': { name: '日语', nameEn: 'Japanese', order: 4 },
        'ko': { name: '韩语', nameEn: 'Korean', order: 5 },
        'es-ES': { name: '西班牙语', nameEn: 'Spanish', order: 6 },
        'pt-BR': { name: '葡萄牙语', nameEn: 'Brazilian Portuguese', order: 7 },
        'fr-FR': { name: '法语', nameEn: 'French', order: 8 },
        'de-DE': { name: '德语', nameEn: 'German', order: 9 },
        'ru-RU': { name: '俄语', nameEn: 'Russian', order: 10 },
        'it-IT': { name: '意大利语', nameEn: 'Italian', order: 11 },
        'ar-SA': { name: '阿拉伯语', nameEn: 'Arabic', order: 12 },
        'tr-TR': { name: '土耳其语', nameEn: 'Turkish', order: 13 },
        'vi-VN': { name: '越南语', nameEn: 'Vietnamese', order: 14 },
        'id-ID': { name: '印尼语', nameEn: 'Indonesian', order: 15 },
        'th-TH': { name: '泰语', nameEn: 'Thai', order: 16 },
        'nl-NL': { name: '荷兰语', nameEn: 'Dutch', order: 17 },
        'pl-PL': { name: '波兰语', nameEn: 'Polish', order: 18 },
        'ro-RO': { name: '罗马尼亚语', nameEn: 'Romanian', order: 19 },
        'sv-SE': { name: '瑞典语', nameEn: 'Swedish', order: 20 },
        'hi-IN': { name: '印地语', nameEn: 'Hindi', order: 21 },
        'uk-UA': { name: '乌克兰语', nameEn: 'Ukrainian', order: 22 },
        'cs-CZ': { name: '捷克语', nameEn: 'Czech', order: 23 },
        'el-GR': { name: '希腊语', nameEn: 'Greek', order: 24 }
    },

    /**
     * 获取所有语言代码（按order排序）
     * @returns {Array<string>}
     */
    getLanguageCodes() {
        return Object.entries(this.SUPPORTED_LANGUAGES)
            .sort((a, b) => a[1].order - b[1].order)
            .map(([code]) => code);
    },

    /**
     * 获取语言的中文名称
     * @param {string} code - 语言代码
     * @returns {string}
     */
    getLanguageName(code) {
        return this.SUPPORTED_LANGUAGES[code]?.name || code;
    },

    /**
     * 获取语言的英文名称
     * @param {string} code - 语言代码
     * @returns {string}
     */
    getLanguageNameEn(code) {
        return this.SUPPORTED_LANGUAGES[code]?.nameEn || code;
    },

    /**
     * 验证语言代码是否有效
     * @param {string} code - 语言代码
     * @returns {boolean}
     */
    isValidLanguageCode(code) {
        return code in this.SUPPORTED_LANGUAGES;
    },

    /**
     * 获取默认语言（英文）
     * @returns {string}
     */
    getDefaultLanguage() {
        return 'en-US';
    },

    /**
     * 获取兜底语言（中文简体）
     * @returns {string}
     */
    getFallbackLanguage() {
        return 'zh-Hans';
    },

    /**
     * 创建空的多语言对象（所有语言为空字符串）
     * @returns {Object}
     */
    createEmptyLanguages() {
        const languages = {};
        for (const code of this.getLanguageCodes()) {
            languages[code] = '';
        }
        return languages;
    },

    /**
     * 验证多语言对象是否有效
     * @param {Object} languages - 多语言对象
     * @returns {boolean}
     */
    validateLanguages(languages) {
        if (!languages || typeof languages !== 'object') {
            return false;
        }
        // 至少要有一个语言有内容
        return Object.values(languages).some(text => text && text.trim().length > 0);
    }
};
