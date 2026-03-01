// ========================================
// 标签管理服务 V2
// 支持回复逻辑(logic)和回复模板(template)两种类型
// ========================================

const TagManager = {
    STORAGE_KEY: 'sudoku_tags_v2',

    normalizeQuickTagOrder(value) {
        if (value === null || value === undefined) return null;
        const normalized = Number(value);
        if (!Number.isFinite(normalized) || normalized < 0) return null;
        return Math.floor(normalized);
    },

    normalizeTag(tag = {}) {
        const normalizedDisplay = !!(tag.showInQuickGrid || tag.displayInQuickTag);
        const normalizedType = tag.type || (tag.languages ? 'template' : 'logic');
        return {
            ...tag,
            type: normalizedType,
            displayInQuickTag: normalizedDisplay,
            quickTagOrder: this.normalizeQuickTagOrder(tag.quickTagOrder),
            replyLogic: tag.replyLogic || tag.prompt || null,
            languages: tag.languages || null
        };
    },

    normalizeTags(tags = []) {
        return (Array.isArray(tags) ? tags : []).map(tag => this.normalizeTag(tag));
    },

    /**
     * 初始化标签数据
     * @returns {Promise<Array>}
     */
    async init() {
        const saved = await this.getTags();
        if (!saved || saved.length === 0) {
            await this.saveTags(DEFAULT_TAGS);
            return DEFAULT_TAGS;
        }
        return saved;
    },

    /**
     * 获取所有标签
     * @returns {Promise<Array>}
     */
    async getTags() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.STORAGE_KEY], (result) => {
                const tags = Array.isArray(result[this.STORAGE_KEY]) ? result[this.STORAGE_KEY] : DEFAULT_TAGS;
                resolve(this.normalizeTags(tags));
            });
        });
    },

    /**
     * 保存标签
     * @param {Array} tags - 标签数组
     * @returns {Promise<void>}
     */
    async saveTags(tags) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.STORAGE_KEY]: this.normalizeTags(tags) }, () => {
                resolve();
            });
        });
    },

    /**
     * 根据ID获取单个标签
     * @param {number} id - 标签ID
     * @returns {Promise<Object|null>}
     */
    async getTagById(id) {
        const tags = await this.getTags();
        return tags.find(t => t.id === id) || null;
    },

    /**
     * 添加回复逻辑标签
     * @param {string} category - 分类
     * @param {string} name - 名称
     * @param {string} replyLogic - 回复逻辑
     * @param {boolean} displayInQuickTag - 是否显示在快捷标签
     * @returns {Promise<number>} 新标签ID
     */
    async addLogicTag(category, name, replyLogic, displayInQuickTag = false, quickTagOrder = null) {
        const tags = await this.getTags();
        const newId = Math.max(0, ...tags.map(t => t.id)) + 1;
        
        const newTag = {
            id: newId,
            category,
            name,
            type: 'logic',
            displayInQuickTag,
            quickTagOrder: this.normalizeQuickTagOrder(quickTagOrder),
            replyLogic,
            languages: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        tags.push(newTag);
        await this.saveTags(tags);
        return newId;
    },

    /**
     * 添加回复模板标签
     * @param {string} category - 分类
     * @param {string} name - 名称
     * @param {Object} languages - 多语言内容 { 'zh-Hans': '...', 'en-US': '...', ... }
     * @param {boolean} displayInQuickTag - 是否显示在快捷标签
     * @returns {Promise<number>} 新标签ID
     */
    async addTemplateTag(category, name, languages, displayInQuickTag = false, quickTagOrder = null) {
        const tags = await this.getTags();
        const newId = Math.max(0, ...tags.map(t => t.id)) + 1;
        
        const newTag = {
            id: newId,
            category,
            name,
            type: 'template',
            displayInQuickTag,
            quickTagOrder: this.normalizeQuickTagOrder(quickTagOrder),
            replyLogic: null,
            languages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        tags.push(newTag);
        await this.saveTags(tags);
        return newId;
    },

    /**
     * 更新回复逻辑标签
     * @param {number} id - 标签ID
     * @param {string} category - 分类
     * @param {string} name - 名称
     * @param {string} replyLogic - 回复逻辑
     * @param {boolean} displayInQuickTag - 是否显示在快捷标签
     * @returns {Promise<boolean>}
     */
    async updateLogicTag(id, category, name, replyLogic, displayInQuickTag = false, quickTagOrder = null) {
        const tags = await this.getTags();
        const index = tags.findIndex(t => t.id === id);
        
        if (index !== -1) {
            tags[index] = {
                ...tags[index],
                category,
                name,
                type: 'logic',
                displayInQuickTag,
                quickTagOrder: this.normalizeQuickTagOrder(quickTagOrder),
                replyLogic,
                languages: null,
                updatedAt: new Date().toISOString()
            };
            await this.saveTags(tags);
            return true;
        }
        return false;
    },

    /**
     * 更新回复模板标签
     * @param {number} id - 标签ID
     * @param {string} category - 分类
     * @param {string} name - 名称
     * @param {Object} languages - 多语言内容
     * @param {boolean} displayInQuickTag - 是否显示在快捷标签
     * @returns {Promise<boolean>}
     */
    async updateTemplateTag(id, category, name, languages, displayInQuickTag = false, quickTagOrder = null) {
        const tags = await this.getTags();
        const index = tags.findIndex(t => t.id === id);
        
        if (index !== -1) {
            tags[index] = {
                ...tags[index],
                category,
                name,
                type: 'template',
                displayInQuickTag,
                quickTagOrder: this.normalizeQuickTagOrder(quickTagOrder),
                replyLogic: null,
                languages,
                updatedAt: new Date().toISOString()
            };
            await this.saveTags(tags);
            return true;
        }
        return false;
    },

    /**
     * 删除标签
     * @param {number} id - 标签ID
     * @returns {Promise<void>}
     */
    async deleteTag(id) {
        const tags = await this.getTags();
        const filtered = tags.filter(t => t.id !== id);
        await this.saveTags(filtered);
    },

    /**
     * 根据类型获取标签
     * @param {string} type - 'logic' | 'template' | 'all'
     * @returns {Promise<Array>}
     */
    async getTagsByType(type) {
        const tags = await this.getTags();
        if (type === 'all') return tags;
        return tags.filter(t => t.type === type);
    },

    /**
     * 根据分类获取标签
     * @param {string} category - 分类名称
     * @returns {Promise<Array>}
     */
    async getTagsByCategory(category) {
        const tags = await this.getTags();
        return tags.filter(t => t.category === category);
    },

    /**
     * 导出标签为JSON文件
     */
    async exportTags() {
        const tags = await this.getTags();
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const filename = `sudoku_tags_${date}.json`;
        const blob = new Blob([JSON.stringify(tags, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * 从JSON文件导入标签
     * @param {File} file - 文件对象
     * @returns {Promise<Array>}
     */
    async importTags(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const tags = JSON.parse(e.target.result);
                    if (Array.isArray(tags)) {
                        // 数据验证和规范化
                        const normalizedTags = tags.map(tag => {
                            // 兼容旧版数据结构
                            if (tag.prompt && !tag.replyLogic && !tag.languages) {
                                return {
                                    id: tag.id,
                                    category: tag.category,
                                    name: tag.name,
                                    type: 'logic',
                                    displayInQuickTag: tag.showInQuickGrid || tag.displayInQuickTag || false,
                                    quickTagOrder: this.normalizeQuickTagOrder(tag.quickTagOrder),
                                    replyLogic: tag.prompt,
                                    languages: null,
                                    createdAt: tag.createdAt || new Date().toISOString(),
                                    updatedAt: tag.updatedAt || new Date().toISOString()
                                };
                            }
                            // 新版数据结构
                            return {
                                id: tag.id,
                                category: tag.category,
                                name: tag.name,
                                type: tag.type || 'logic',
                                displayInQuickTag: tag.displayInQuickTag || false,
                                quickTagOrder: this.normalizeQuickTagOrder(tag.quickTagOrder),
                                replyLogic: tag.replyLogic || null,
                                languages: tag.languages || null,
                                createdAt: tag.createdAt || new Date().toISOString(),
                                updatedAt: tag.updatedAt || new Date().toISOString()
                            };
                        });
                        
                        await this.saveTags(normalizedTags);
                        resolve(normalizedTags);
                    } else {
                        reject(new Error('无效的标签文件格式'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }
};

// 支持的语言列表（24种）
const SUPPORTED_LANGUAGES = {
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
};

// 默认标签数据（示例）
const DEFAULT_TAGS = [
    // 回复逻辑示例
    {
        id: 1,
        category: '广告问题',
        name: '广告未加载',
        type: 'logic',
        displayInQuickTag: true,
        quickTagOrder: 1,
        replyLogic: 'User reports ads not loading. Acknowledge the issue, ask for device/OS info, suggest checking internet connection and app updates.',
        languages: null,
        createdAt: '2026-01-04T00:00:00.000Z',
        updatedAt: '2026-01-04T00:00:00.000Z'
    },
    {
        id: 2,
        category: 'Bug',
        name: '游戏崩溃',
        type: 'logic',
        displayInQuickTag: true,
        quickTagOrder: 2,
        replyLogic: 'User reports game crashes. Express concern, ask when it happens, request device info, suggest reinstalling.',
        languages: null,
        createdAt: '2026-01-04T00:00:00.000Z',
        updatedAt: '2026-01-04T00:00:00.000Z'
    },
    // 回复模板示例
    {
        id: 3,
        category: '广告问题',
        name: '物流查询标准回复',
        type: 'template',
        displayInQuickTag: true,
        quickTagOrder: 3,
        replyLogic: null,
        languages: {
            'zh-Hans': '您的订单将在3-5个工作日内送达。您可以通过订单号在我们的官网查询物流信息。',
            'zh-Hant': '您的訂單將在3-5個工作日內送達。您可以通過訂單號在我們的官網查詢物流信息。',
            'en-US': 'Your order will arrive in 3-5 business days. You can track your order on our website using your order number.',
            'ja': 'ご注文は3〜5営業日以内に到着予定です。注文番号を使用して、当社のウェブサイトで注文を追跡できます。',
            'ko': '주문하신 상품은 영업일 기준 3-5일 이내에 도착할 예정입니다. 주문 번호를 사용하여 웹사이트에서 주문을 추적할 수 있습니다.'
        },
        createdAt: '2026-01-04T00:00:00.000Z',
        updatedAt: '2026-01-04T00:00:00.000Z'
    }
];
