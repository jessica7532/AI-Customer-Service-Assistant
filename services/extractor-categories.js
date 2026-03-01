/* ========================================
   数据提取分类管理服务
   用户可编辑的一级/二级分类
   存储结构与 EXTRACTOR_CONFIG.categories 相同:
   { '一级分类名': ['二级分类1', '二级分类2', ...], ... }
   ======================================== */

const ExtractorCategories = {
    STORAGE_KEY: 'helpshift_extractor_categories_v1',
    _cache: null,

    // ========== 读取 ==========

    /**
     * 加载分类数据（优先读存储，无则用 EXTRACTOR_CONFIG 默认值并写入存储）
     */
    async load() {
        if (this._cache) return this._cache;

        try {
            let data = null;

            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                const result = await new Promise(resolve =>
                    chrome.storage.local.get([this.STORAGE_KEY], resolve)
                );
                data = result[this.STORAGE_KEY] || null;
            } else {
                const raw = localStorage.getItem(this.STORAGE_KEY);
                if (raw) data = JSON.parse(raw);
            }

            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                this._cache = data;
                return data;
            }
        } catch (e) {
            console.warn('[ExtractorCategories] load failed:', e);
        }

        // 首次使用：从 EXTRACTOR_CONFIG 初始化
        const defaults = (typeof EXTRACTOR_CONFIG !== 'undefined' && EXTRACTOR_CONFIG.categories)
            ? JSON.parse(JSON.stringify(EXTRACTOR_CONFIG.categories))
            : {};

        this._cache = defaults;
        await this._save(defaults);
        return defaults;
    },

    /**
     * 内部保存
     */
    async _save(data) {
        this._cache = data;
        try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                await new Promise(resolve =>
                    chrome.storage.local.set({ [this.STORAGE_KEY]: data }, resolve)
                );
            } else {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            }
        } catch (e) {
            console.warn('[ExtractorCategories] save failed:', e);
        }
    },

    // ========== 一级分类 CRUD ==========

    async addCategory1(name) {
        const data = await this.load();
        if (data[name]) throw new Error(`一级分类"${name}"已存在`);
        data[name] = [];
        await this._save(data);
        return data;
    },

    async renameCategory1(oldName, newName) {
        const data = await this.load();
        if (!data[oldName]) throw new Error(`一级分类"${oldName}"不存在`);
        if (data[newName]) throw new Error(`一级分类"${newName}"已存在`);
        data[newName] = data[oldName];
        delete data[oldName];
        await this._save(data);
        return data;
    },

    async deleteCategory1(name) {
        const data = await this.load();
        if (!data[name]) throw new Error(`一级分类"${name}"不存在`);
        delete data[name];
        await this._save(data);
        return data;
    },

    // ========== 二级分类 CRUD ==========

    async addCategory2(parent, name) {
        const data = await this.load();
        if (!data[parent]) throw new Error(`一级分类"${parent}"不存在`);
        if (data[parent].includes(name)) throw new Error(`二级分类"${name}"已存在`);
        data[parent].push(name);
        await this._save(data);
        return data;
    },

    async deleteCategory2(parent, name) {
        const data = await this.load();
        if (!data[parent]) throw new Error(`一级分类"${parent}"不存在`);
        data[parent] = data[parent].filter(n => n !== name);
        await this._save(data);
        return data;
    },

    // ========== 工具 ==========

    /**
     * 重置为默认值
     */
    async resetToDefaults() {
        const defaults = (typeof EXTRACTOR_CONFIG !== 'undefined' && EXTRACTOR_CONFIG.categories)
            ? JSON.parse(JSON.stringify(EXTRACTOR_CONFIG.categories))
            : {};
        await this._save(defaults);
        return defaults;
    },

    /**
     * 清除缓存（外部修改后需要刷新时调用）
     */
    clearCache() {
        this._cache = null;
    }
};
