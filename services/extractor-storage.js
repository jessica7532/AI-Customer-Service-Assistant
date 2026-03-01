// ========================================
// 数据提取存储服务
// localStorage → chrome.storage.local
// ========================================

const ExtractorStorage = {
    /**
     * 保存所有记录
     * @param {Array} data - 记录数组
     */
    async save(data) {
        await chrome.storage.local.set({ 
            [EXTRACTOR_CONFIG.storageKey]: data 
        });
    },

    /**
     * 加载所有记录
     * @returns {Promise<Array>} 记录数组
     */
    async load() {
        const result = await chrome.storage.local.get([EXTRACTOR_CONFIG.storageKey]);
        return result[EXTRACTOR_CONFIG.storageKey] || [];
    },

    /**
     * 清空所有记录
     */
    async clear() {
        await chrome.storage.local.remove(EXTRACTOR_CONFIG.storageKey);
    },

    /**
     * 添加单条记录
     * @param {Object} record - 单条记录对象
     */
    async add(record) {
        let data = await this.load();
        // 确保data是数组
        if (!Array.isArray(data)) {
            console.warn('ExtractorStorage: 加载的数据不是数组，重置为空数组');
            data = [];
        }
        data.push(record);
        await this.save(data);
    },

    /**
     * 更新最后一条记录（用于AI总结后更新）
     * @param {Object} record - 要更新的记录对象
     */
    async updateLast(record) {
        let data = await this.load();
        if (!Array.isArray(data)) {
            data = [];
        }
        if (data.length > 0) {
            // 更新最后一条记录
            data[data.length - 1] = record;
            await this.save(data);
            console.log('[ExtractorStorage] 最后一条记录已更新');
        } else {
            // 如果没有记录，就添加一条
            data.push(record);
            await this.save(data);
            console.log('[ExtractorStorage] 添加新记录');
        }
    },

    /**
     * 保存单条记录（别名）
     */
    async saveRecord(record) {
        return this.add(record);
    },

    /**
     * 获取所有记录（别名）
     */
    async getAllRecords() {
        return this.load();
    },

    /**
     * 删除指定索引的记录
     * @param {number} index - 记录索引
     */
    async deleteRecord(index) {
        const data = await this.load();
        if (index >= 0 && index < data.length) {
            data.splice(index, 1);
            await this.save(data);
        }
    },

    /**
     * 清空所有数据（别名）
     */
    async clearAll() {
        return this.clear();
    }
};