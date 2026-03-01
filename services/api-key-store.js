// ========================================
// API key storage helper
// ========================================

const ApiKeyStore = {
    STORAGE_KEY: 'helpshift_user_api_keys_v1',
    SUPPORTED_KEYS: [
        'openrouter',
        'deepseek',
        'zhipu',
        'doubao',
        'google',
        'googleAIStudio'
    ],

    _isSupportedKey(key) {
        return this.SUPPORTED_KEYS.includes(key);
    },

    _normalizeValue(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim();
    },

    _normalizePayload(payload) {
        const normalized = {};
        if (!payload || typeof payload !== 'object') {
            return normalized;
        }

        for (const key of this.SUPPORTED_KEYS) {
            const value = this._normalizeValue(payload[key]);
            if (value) {
                normalized[key] = value;
            }
        }

        return normalized;
    },

    _supportsChromeStorage() {
        return typeof chrome !== 'undefined' && !!chrome.storage?.local;
    },

    async _readRaw() {
        if (this._supportsChromeStorage()) {
            const result = await chrome.storage.local.get([this.STORAGE_KEY]);
            return result[this.STORAGE_KEY] || {};
        }

        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.warn('[ApiKeyStore] Failed to parse fallback storage:', error);
            return {};
        }
    },

    async _writeRaw(value) {
        const normalized = this._normalizePayload(value);

        if (this._supportsChromeStorage()) {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: normalized });
            return;
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
    },

    async getAll() {
        const raw = await this._readRaw();
        return this._normalizePayload(raw);
    },

    async get(key) {
        if (!this._isSupportedKey(key)) {
            return '';
        }

        const allKeys = await this.getAll();
        return allKeys[key] || '';
    },

    async resolve(key) {
        return await this.get(key);
    },

    async setMany(partialKeys) {
        const current = await this.getAll();
        const next = { ...current };

        if (!partialKeys || typeof partialKeys !== 'object') {
            return current;
        }

        for (const key of this.SUPPORTED_KEYS) {
            if (!(key in partialKeys)) {
                continue;
            }

            const value = this._normalizeValue(partialKeys[key]);
            if (value) {
                next[key] = value;
            } else {
                delete next[key];
            }
        }

        await this._writeRaw(next);
        return next;
    },

    async clearAll() {
        await this._writeRaw({});
    }
};
