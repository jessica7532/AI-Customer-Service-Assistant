// ========================================
// 存储服务
// 使用 chrome.storage.local 替代 localStorage
// ========================================

const StorageService = {
    /**
     * 保存数据
     */
    async set(key, value) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, resolve);
        });
    },

    /**
     * 获取数据
     */
    async get(key, defaultValue = null) {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key] !== undefined ? result[key] : defaultValue);
            });
        });
    },

    /**
     * 删除数据
     */
    async remove(key) {
        return new Promise((resolve) => {
            chrome.storage.local.remove(key, resolve);
        });
    },

    /**
     * 清空所有数据
     */
    async clear() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(resolve);
        });
    }
};
