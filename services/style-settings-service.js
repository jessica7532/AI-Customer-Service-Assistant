// ========================================
// Style settings service
// ========================================

const StyleSettingsService = {
    STORAGE_KEY: 'helpshift_style_settings_v1',
    TONE_KEYS: ['friendly', 'soft'],

    _supportsChromeStorage() {
        return typeof chrome !== 'undefined' && !!chrome.storage?.local;
    },

    _normalizeSingleLine(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim();
    },

    _normalizeMultiLine(value) {
        if (typeof value !== 'string') {
            return '';
        }
        const trimmed = value.trim();
        return trimmed ? value : '';
    },

    _getDefaultSettings() {
        const defaultTonePresets = (typeof CONFIG !== 'undefined' && CONFIG?.tonePresets)
            ? CONFIG.tonePresets
            : {};

        return {
            tonePresets: {
                friendly: {
                    name: defaultTonePresets.friendly?.name || '友好专业',
                    prompt: defaultTonePresets.friendly?.prompt || ''
                },
                soft: {
                    name: defaultTonePresets.soft?.name || '软萌亲和',
                    prompt: defaultTonePresets.soft?.prompt || ''
                }
            },
            product: {
                name: '',
                description: ''
            }
        };
    },

    _normalizeOverrides(raw) {
        const normalized = {
            tones: {},
            product: {}
        };

        if (!raw || typeof raw !== 'object') {
            return normalized;
        }

        const rawTones = raw.tones && typeof raw.tones === 'object' ? raw.tones : {};
        for (const tone of this.TONE_KEYS) {
            const source = rawTones[tone] && typeof rawTones[tone] === 'object' ? rawTones[tone] : {};
            const name = this._normalizeSingleLine(source.name);
            const prompt = this._normalizeMultiLine(source.prompt);

            if (name || prompt) {
                normalized.tones[tone] = {};
                if (name) {
                    normalized.tones[tone].name = name;
                }
                if (prompt) {
                    normalized.tones[tone].prompt = prompt;
                }
            }
        }

        const rawProduct = raw.product && typeof raw.product === 'object' ? raw.product : {};
        const productName = this._normalizeSingleLine(rawProduct.name);
        const productDescription = this._normalizeMultiLine(rawProduct.description);
        if (productName) {
            normalized.product.name = productName;
        }
        if (productDescription) {
            normalized.product.description = productDescription;
        }

        return normalized;
    },

    _hasAnyOverride(overrides) {
        const tones = overrides?.tones || {};
        const product = overrides?.product || {};
        if (Object.keys(product).length > 0) {
            return true;
        }
        return this.TONE_KEYS.some((tone) => {
            const toneConfig = tones[tone];
            return !!toneConfig && Object.keys(toneConfig).length > 0;
        });
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
            console.warn('[StyleSettingsService] Failed to parse local fallback:', error);
            return {};
        }
    },

    async _writeRaw(value) {
        if (this._supportsChromeStorage()) {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: value });
            return;
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(value));
    },

    async _removeRaw() {
        if (this._supportsChromeStorage()) {
            await chrome.storage.local.remove([this.STORAGE_KEY]);
            return;
        }

        localStorage.removeItem(this.STORAGE_KEY);
    },

    async getRawOverrides() {
        const raw = await this._readRaw();
        return this._normalizeOverrides(raw);
    },

    async getResolvedSettings() {
        const defaults = this._getDefaultSettings();
        const overrides = await this.getRawOverrides();

        const resolved = {
            tonePresets: {
                friendly: { ...defaults.tonePresets.friendly },
                soft: { ...defaults.tonePresets.soft }
            },
            product: {
                ...defaults.product
            }
        };

        for (const tone of this.TONE_KEYS) {
            if (overrides.tones[tone]?.name) {
                resolved.tonePresets[tone].name = overrides.tones[tone].name;
            }
            if (overrides.tones[tone]?.prompt) {
                resolved.tonePresets[tone].prompt = overrides.tones[tone].prompt;
            }
        }

        if (overrides.product.name) {
            resolved.product.name = overrides.product.name;
        }
        if (overrides.product.description) {
            resolved.product.description = overrides.product.description;
        }

        return resolved;
    },

    async saveOverrides(input) {
        const normalized = this._normalizeOverrides(input);
        if (!this._hasAnyOverride(normalized)) {
            await this._removeRaw();
            return {
                tones: {},
                product: {}
            };
        }

        await this._writeRaw(normalized);
        return normalized;
    },

    async clearAllOverrides() {
        await this._removeRaw();
    }
};
