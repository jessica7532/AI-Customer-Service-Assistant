// ========================================
// API & 模型配置面板
// ========================================

const ApiSettingsPanel = {
    menu: null,
    isVisible: false,

    // Provider 配置定义
    // hasModels: true → 显示"配置"按钮，可管理模型列表
    // hasModels: false → 纯 API Key（如 Google Translate），只有眼睛图标
    // AI 模型 Provider（显示"配置"按钮）
    providers: [
        { key: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-...', hasModels: true },
        { key: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...', hasModels: true },
        { key: 'zhipu', label: '智谱 AI', placeholder: 'zhipu key', hasModels: true },
        { key: 'doubao', label: '豆包', placeholder: 'doubao key', hasModels: true },
        { key: 'googleAIStudio', label: 'Google AI Studio', placeholder: 'AIza...', hasModels: true }
    ],

    LANG_DETECT_STORAGE_KEY: 'helpshift_lang_detect_model',
    SUMMARY_MODEL_STORAGE_KEY: 'helpshift_summary_model',
    TRANSLATE_MODEL_STORAGE_KEY: 'helpshift_translate_model',
    TAG_RECOMMEND_MODEL_STORAGE_KEY: 'helpshift_tag_recommend_model',

    // 默认模型配置（首次使用时写入）
    DEFAULT_MODELS: {
        openrouter: [],
        deepseek: [],
        zhipu: [],
        doubao: [],
        googleAIStudio: []
    },

    MODELS_STORAGE_KEY: 'helpshift_provider_models_v1',

    // ========== 模型数据存取 ==========

    async loadAllModels() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                const result = await chrome.storage.local.get([this.MODELS_STORAGE_KEY]);
                const saved = result[this.MODELS_STORAGE_KEY];
                if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
                    return saved;
                }
            } else {
                const raw = localStorage.getItem(this.MODELS_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                        return parsed;
                    }
                }
            }
        } catch (e) {
            console.warn('[ApiSettingsPanel] loadAllModels failed:', e);
        }

        // 首次使用：写入默认值
        await this.saveAllModels(this.DEFAULT_MODELS);
        return { ...this.DEFAULT_MODELS };
    },

    async saveAllModels(allModels) {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                await chrome.storage.local.set({ [this.MODELS_STORAGE_KEY]: allModels });
            } else {
                localStorage.setItem(this.MODELS_STORAGE_KEY, JSON.stringify(allModels));
            }
        } catch (e) {
            console.error('[ApiSettingsPanel] saveAllModels failed:', e);
        }
    },

    async getModelsForProvider(providerKey) {
        const all = await this.loadAllModels();
        return all[providerKey] || [];
    },

    async setModelsForProvider(providerKey, models) {
        const all = await this.loadAllModels();
        all[providerKey] = models;
        await this.saveAllModels(all);
    },

    // ========== 面板创建 ==========

    create() {
        const panel = document.createElement('div');
        panel.id = 'apiSettingsPanel';
        panel.className = 'api-settings-menu';
        panel.style.display = 'none';
        panel.setAttribute('translate', 'no');
        panel.setAttribute('data-immersive-translate-walked', 'true');

        const rowsHtml = this.providers.map((p) => `
            <div class="api-settings-row">
                <label class="api-settings-label">${p.label}</label>
                <div class="api-settings-input-wrap">
                    <div class="api-settings-input-box">
                        <input
                            id="api-key-${p.key}"
                            data-key="${p.key}"
                            class="api-settings-input"
                            type="password"
                            autocomplete="off"
                            spellcheck="false"
                            placeholder="${p.placeholder}"
                        />
                        <button class="api-settings-eye-btn" data-target="api-key-${p.key}" type="button" title="显示/隐藏">
                            <svg class="eye-icon eye-off" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M2 10s3-4 10-4 10 4 10 4"/>
                                <path d="M2 14s3 4 10 4 10-4 10-4"/>
                                <line x1="4" y1="4" x2="20" y2="20" stroke-width="0" opacity="0"/>
                            </svg>
                            <svg class="eye-icon eye-on" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:none;">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>
                    ${p.hasModels
                        ? `<button class="api-settings-config-btn" data-provider="${p.key}" type="button">配置</button>`
                        : ''
                    }
                </div>
            </div>
        `).join('');

        panel.innerHTML = `
            <div class="api-settings-header">
                <div class="api-settings-title">API & 模型配置</div>
            </div>
            <div class="api-settings-body" id="apiSettingsBody">
                ${rowsHtml}

                <!-- 识别语言模型配置 -->
                <div class="api-settings-section-divider"></div>
                <div class="api-settings-section-title">识别语言模型配置</div>
                <div class="api-settings-section-desc">使用"回复模板"功能前，请选择用于识别语言的模型。</div>
                <div class="api-settings-row">
                    <div class="api-settings-input-wrap">
                        <select id="langDetectModelSelect" class="api-settings-select">
                            <!-- 异步填充 -->
                        </select>
                    </div>
                </div>
                <div class="api-settings-row">
                    <label class="api-settings-label">Google Translate API Key</label>
                    <div class="api-settings-input-wrap">
                        <div class="api-settings-input-box">
                            <input
                                id="api-key-google"
                                data-key="google"
                                class="api-settings-input"
                                type="password"
                                autocomplete="off"
                                spellcheck="false"
                                placeholder="AIza..."
                            />
                            <button class="api-settings-eye-btn" data-target="api-key-google" type="button" title="显示/隐藏">
                                <svg class="eye-icon eye-off" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M2 10s3-4 10-4 10 4 10 4"/>
                                    <path d="M2 14s3 4 10 4 10-4 10-4"/>
                                </svg>
                                <svg class="eye-icon eye-on" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:none;">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- AI会话内容总结模型配置 -->
                <div class="api-settings-section-divider"></div>
                <div class="api-settings-section-title">AI会话内容总结模型配置</div>
                <div class="api-settings-section-desc">提取数据时，调用AI总结会话要点</div>
                <div class="api-settings-row">
                    <div class="api-settings-input-wrap">
                        <select id="summaryModelSelect" class="api-settings-select">
                            <!-- 异步填充 -->
                        </select>
                    </div>
                </div>

                <!-- AI翻译所有语言模型配置 -->
                <div class="api-settings-section-divider"></div>
                <div class="api-settings-section-title">AI翻译所有语言模型配置</div>
                <div class="api-settings-section-desc">回复模板编辑界面，AI翻译所有语言 按钮调用此处模型翻译</div>
                <div class="api-settings-row">
                    <div class="api-settings-input-wrap">
                        <select id="translateModelSelect" class="api-settings-select">
                            <!-- 异步填充 -->
                        </select>
                    </div>
                </div>

                <!-- AI推荐标签模型配置 -->
                <div class="api-settings-section-divider"></div>
                <div class="api-settings-section-title">AI推荐标签模型配置</div>
                <div class="api-settings-section-desc">编辑提示词面板中，AI推荐 按钮调用此处模型推荐标签</div>
                <div class="api-settings-row">
                    <div class="api-settings-input-wrap">
                        <select id="tagRecommendModelSelect" class="api-settings-select">
                            <!-- 异步填充 -->
                        </select>
                    </div>
                </div>
            </div>
            <div class="api-settings-actions" id="apiSettingsActions">
                <button id="apiSettingsClearBtn" class="api-settings-btn danger" type="button">清空</button>
                <button id="apiSettingsSaveBtn" class="api-settings-btn primary" type="button">保存</button>
            </div>
            <!-- 模型配置 overlay（覆盖整个面板） -->
            <div class="api-settings-overlay" id="apiModelOverlay" style="display:none;">
                <div class="api-settings-overlay-inner" id="apiModelOverlayInner"></div>
            </div>
        `;

        document.body.appendChild(panel);
        this.menu = panel;
        this.bindEvents();
        return panel;
    },

    // ========== 事件绑定 ==========

    bindEvents() {
        this.menu.addEventListener('click', async (event) => {
            const target = event.target;

            // 保存
            if (target.id === 'apiSettingsSaveBtn') {
                try { await this.save(); }
                catch (e) { console.error('[ApiSettingsPanel] Save failed:', e); Utils?.showNotification?.(`保存失败: ${e.message}`, 'error'); }
                return;
            }

            // 清空
            if (target.id === 'apiSettingsClearBtn') {
                try { await this.clearAll(); }
                catch (e) { console.error('[ApiSettingsPanel] Clear failed:', e); Utils?.showNotification?.(`清空失败: ${e.message}`, 'error'); }
                return;
            }

            // 小眼睛按钮
            const eyeBtn = target.closest('.api-settings-eye-btn');
            if (eyeBtn) {
                const inputId = eyeBtn.getAttribute('data-target');
                const input = this.menu.querySelector(`#${inputId}`);
                if (!input) return;

                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                const eyeOff = eyeBtn.querySelector('.eye-off');
                const eyeOn = eyeBtn.querySelector('.eye-on');
                if (eyeOff) eyeOff.style.display = isPassword ? 'none' : '';
                if (eyeOn) eyeOn.style.display = isPassword ? '' : 'none';
                return;
            }

            // 配置按钮
            const configBtn = target.closest('.api-settings-config-btn');
            if (configBtn) {
                const providerKey = configBtn.dataset.provider;
                await this.showModelOverlay(providerKey);
                return;
            }
        });

        // 语言识别下拉框 — 选了就立即保存
        this.menu.addEventListener('change', (event) => {
            if (event.target.id === 'langDetectModelSelect') {
                this._saveLangDetectModel();
                const select = event.target;
                const selectedText = select.options[select.selectedIndex]?.text || '';
                Utils?.showNotification?.(`语言识别已切换：${selectedText}`, 'success');
            }

            // 三个 AI 场景下拉框 — 选了就立即保存
            if (event.target.id === 'summaryModelSelect') {
                this._saveScenarioModel(this.SUMMARY_MODEL_STORAGE_KEY, event.target);
                Utils?.showNotification?.(`会话总结模型已切换`, 'success');
            }
            if (event.target.id === 'translateModelSelect') {
                this._saveScenarioModel(this.TRANSLATE_MODEL_STORAGE_KEY, event.target);
                Utils?.showNotification?.(`翻译模型已切换`, 'success');
            }
            if (event.target.id === 'tagRecommendModelSelect') {
                this._saveScenarioModel(this.TAG_RECOMMEND_MODEL_STORAGE_KEY, event.target);
                Utils?.showNotification?.(`标签推荐模型已切换`, 'success');
            }
        });

        // 外部点击关闭由 sidebar.js 的 closeAllPanels() 统一处理
    },

    // ========== 模型配置 Overlay ==========

    async showModelOverlay(providerKey) {
        const overlay = this.menu.querySelector('#apiModelOverlay');
        const inner = this.menu.querySelector('#apiModelOverlayInner');
        if (!overlay || !inner) return;

        const provider = this.providers.find(p => p.key === providerKey);
        if (!provider) return;

        const models = await this.getModelsForProvider(providerKey);
        this.renderModelOverlay(inner, providerKey, provider.label, models);
        overlay.style.display = 'block';
    },

    renderModelOverlay(container, providerKey, providerLabel, models) {
        const modelRows = models.length === 0
            ? `<div class="model-config-empty">暂无模型，请添加</div>`
            : models.map((m, idx) => `
                <div class="model-config-row" data-idx="${idx}">
                    <div class="model-config-info">
                        <span class="model-config-name">${this._escapeHtml(m.name)}</span>
                        <span class="model-config-id">${this._escapeHtml(m.id)}</span>
                    </div>
                    <button class="model-config-delete-btn" data-idx="${idx}" type="button">删除</button>
                </div>
            `).join('');

        container.innerHTML = `
            <div class="model-overlay-header">
                <button class="model-overlay-back-btn" id="modelOverlayBackBtn" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    返回
                </button>
                <span class="model-overlay-title">${this._escapeHtml(providerLabel)}</span>
            </div>
            <div class="model-overlay-body">
                <div class="model-config-list" id="modelConfigList">
                    ${modelRows}
                </div>
                <div class="model-config-add">
                    <div class="model-config-add-label">添加模型</div>
                    <div class="model-config-add-row">
                        <input type="text" id="modelAddInput" class="model-config-add-input" placeholder="输入模型ID" />
                        <button class="model-config-add-btn" id="modelAddBtn" type="button">添加</button>
                    </div>
                    <div class="model-config-add-hint">显示名称自动生成：有 / 取斜杠后面，无 / 取全部</div>
                </div>
            </div>
        `;

        // 绑定 overlay 内事件
        container.querySelector('#modelOverlayBackBtn').addEventListener('click', () => {
            this.hideModelOverlay();
        });

        container.querySelector('#modelAddBtn').addEventListener('click', () => {
            this._handleAddModel(container, providerKey, providerLabel);
        });

        container.querySelector('#modelAddInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._handleAddModel(container, providerKey, providerLabel);
            if (e.key === 'Escape') this.hideModelOverlay();
        });

        container.querySelectorAll('.model-config-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.dataset.idx, 10);
                await this._handleDeleteModel(container, providerKey, providerLabel, idx);
            });
        });

        // 聚焦输入框
        setTimeout(() => {
            const input = container.querySelector('#modelAddInput');
            if (input) input.focus();
        }, 50);
    },

    async _handleAddModel(container, providerKey, providerLabel) {
        const input = container.querySelector('#modelAddInput');
        const modelId = (input?.value || '').trim();
        if (!modelId) {
            input?.focus();
            return;
        }

        const models = await this.getModelsForProvider(providerKey);

        // 检查重复
        if (models.some(m => m.id === modelId)) {
            Utils?.showNotification?.(`模型 "${modelId}" 已存在`, 'warning');
            input?.focus();
            input?.select();
            return;
        }

        // 生成显示名称：有 / 取后面，没有就全取
        const name = modelId.includes('/') ? modelId.split('/').pop() : modelId;

        models.push({ id: modelId, name });
        await this.setModelsForProvider(providerKey, models);

        Utils?.showNotification?.(`✅ 已添加模型：${name}`, 'success');

        // 重新渲染
        this.renderModelOverlay(container, providerKey, providerLabel, models);

        // 通知 ModelSelectorMenu 刷新
        this._notifyModelsChanged();
    },

    async _handleDeleteModel(container, providerKey, providerLabel, idx) {
        const models = await this.getModelsForProvider(providerKey);
        if (idx < 0 || idx >= models.length) return;

        const removed = models.splice(idx, 1)[0];
        await this.setModelsForProvider(providerKey, models);

        Utils?.showNotification?.(`已删除模型：${removed.name}`, 'info');

        this.renderModelOverlay(container, providerKey, providerLabel, models);
        this._notifyModelsChanged();
    },

    hideModelOverlay() {
        const overlay = this.menu?.querySelector('#apiModelOverlay');
        if (overlay) overlay.style.display = 'none';
    },

    _notifyModelsChanged() {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('helpshift:models-changed'));
        }
    },

    // ========== 主面板操作 ==========

    toggle(buttonElement) {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(buttonElement);
        }
    },

    async show(buttonElement) {
        if (!this.menu) {
            this.create();
        }

        await this.loadValues();
        this.hideModelOverlay();

        if (buttonElement) {
            const rect = buttonElement.getBoundingClientRect();
            const panelWidth = 360;
            const left = rect.left - panelWidth - 8;
            const top = Math.max(8, Math.min(rect.top - 120, window.innerHeight - 640));
            this.menu.style.left = `${left}px`;
            this.menu.style.top = `${top}px`;
        }

        this.menu.style.display = 'block';
        this.isVisible = true;
    },

    hide() {
        if (!this.menu) return;
        this.hideModelOverlay();
        this.menu.style.display = 'none';
        this.isVisible = false;
        this.clearVisibleValues();
    },

    clearVisibleValues() {
        if (!this.menu) return;
        this.menu.querySelectorAll('.api-settings-input').forEach((input) => {
            input.value = '';
            input.type = 'password';
        });
        this.menu.querySelectorAll('.api-settings-eye-btn').forEach(btn => {
            const eyeOff = btn.querySelector('.eye-off');
            const eyeOn = btn.querySelector('.eye-on');
            if (eyeOff) eyeOff.style.display = '';
            if (eyeOn) eyeOn.style.display = 'none';
        });
    },

    async loadValues() {
        const keyMap = (typeof ApiKeyStore !== 'undefined' && ApiKeyStore.getAll)
            ? await ApiKeyStore.getAll()
            : {};

        // AI provider keys
        this.providers.forEach((p) => {
            const input = this.menu.querySelector(`#api-key-${p.key}`);
            if (!input) return;
            input.value = keyMap[p.key] || '';
            input.type = 'password';
        });

        // Google Translate key
        const googleInput = this.menu.querySelector('#api-key-google');
        if (googleInput) {
            googleInput.value = keyMap['google'] || '';
            googleInput.type = 'password';
        }

        // 重置眼睛状态
        this.menu.querySelectorAll('.api-settings-eye-btn').forEach(btn => {
            const eyeOff = btn.querySelector('.eye-off');
            const eyeOn = btn.querySelector('.eye-on');
            if (eyeOff) eyeOff.style.display = '';
            if (eyeOn) eyeOn.style.display = 'none';
        });

        // 填充语言识别下拉框
        await this._populateLangDetectSelect();

        // 填充三个 AI 场景下拉框
        await this._populateScenarioSelect('summaryModelSelect', this.SUMMARY_MODEL_STORAGE_KEY);
        await this._populateScenarioSelect('translateModelSelect', this.TRANSLATE_MODEL_STORAGE_KEY);
        await this._populateScenarioSelect('tagRecommendModelSelect', this.TAG_RECOMMEND_MODEL_STORAGE_KEY);
    },

    async _populateLangDetectSelect() {
        const select = this.menu?.querySelector('#langDetectModelSelect');
        if (!select) return;

        select.setAttribute('translate', 'no');
        select.classList.add('notranslate');

        // 读取所有模型
        let allModels = {};
        try { allModels = await this.loadAllModels(); } catch (e) { /* ignore */ }

        // 读取当前选择
        const saved = this._getLangDetectModel();

        // 构建 options
        let html = '';

        // 机翻接口组
        html += `<optgroup label="机翻接口" translate="no">`;
        html += `<option value="google-translate" translate="no"${saved === 'google-translate' ? ' selected' : ''}>Google Translate</option>`;
        html += `</optgroup>`;

        // AI 识别组
        html += `<optgroup label="AI 识别" translate="no">`;
        const providerLabels = {
            openrouter: 'OpenRouter',
            deepseek: 'DeepSeek',
            zhipu: '智谱 AI',
            doubao: '豆包',
            googleAIStudio: 'Google AI Studio'
        };

        for (const [providerKey, models] of Object.entries(allModels)) {
            if (!Array.isArray(models)) continue;
            const pLabel = providerLabels[providerKey] || providerKey;
            for (const m of models) {
                const val = `${providerKey}::${m.id}`;
                const selected = saved === val ? ' selected' : '';
                html += `<option value="${val}" translate="no"${selected}>${m.name} (${pLabel})</option>`;
            }
        }
        html += `</optgroup>`;

        select.innerHTML = html;
    },

    _getLangDetectModel() {
        return localStorage.getItem(this.LANG_DETECT_STORAGE_KEY) || 'google-translate';
    },

    _saveLangDetectModel() {
        const select = this.menu?.querySelector('#langDetectModelSelect');
        if (!select) return;
        localStorage.setItem(this.LANG_DETECT_STORAGE_KEY, select.value);
    },

    // ========== AI 场景模型选择（通用） ==========

    /**
     * 填充一个场景下拉框（纯 AI 模型列表 + 留空选项）
     */
    async _populateScenarioSelect(selectId, storageKey) {
        const select = this.menu?.querySelector(`#${selectId}`);
        if (!select) return;

        select.setAttribute('translate', 'no');
        select.classList.add('notranslate');

        let allModels = {};
        try { allModels = await this.loadAllModels(); } catch (e) { /* ignore */ }

        const saved = localStorage.getItem(storageKey) || '';

        let html = `<option value="" translate="no"${saved === '' ? ' selected' : ''}>不调用AI执行</option>`;

        const providerLabels = {
            openrouter: 'OpenRouter',
            deepseek: 'DeepSeek',
            zhipu: '智谱 AI',
            doubao: '豆包',
            googleAIStudio: 'Google AI Studio'
        };

        for (const [providerKey, models] of Object.entries(allModels)) {
            if (!Array.isArray(models) || models.length === 0) continue;
            const pLabel = providerLabels[providerKey] || providerKey;
            html += `<optgroup label="${pLabel}" translate="no">`;
            for (const m of models) {
                const val = `${providerKey}::${m.id}`;
                const selected = saved === val ? ' selected' : '';
                html += `<option value="${val}" translate="no"${selected}>${m.name}</option>`;
            }
            html += `</optgroup>`;
        }

        select.innerHTML = html;
    },

    _saveScenarioModel(storageKey, selectEl) {
        if (!selectEl) return;
        localStorage.setItem(storageKey, selectEl.value);
    },

    /**
     * 静态方法：供外部模块读取某个场景配置的模型
     * 返回: { provider, modelId } 或 null（留空 = 不调用AI）
     */
    getScenarioModel(storageKey) {
        const val = localStorage.getItem(storageKey) || '';
        if (!val) return null;
        const parts = val.split('::');
        if (parts.length !== 2) return null;
        return { provider: parts[0], modelId: parts[1] };
    },

    async save() {
        if (typeof ApiKeyStore === 'undefined' || !ApiKeyStore.setMany) {
            throw new Error('ApiKeyStore 不可用');
        }

        const payload = {};
        // AI provider keys
        this.providers.forEach((p) => {
            const input = this.menu.querySelector(`#api-key-${p.key}`);
            payload[p.key] = input ? input.value : '';
        });
        // Google Translate key
        const googleInput = this.menu.querySelector('#api-key-google');
        payload['google'] = googleInput ? googleInput.value : '';

        const saved = await ApiKeyStore.setMany(payload);
        const count = Object.keys(saved).length;

        // 保存语言识别模型选择
        this._saveLangDetectModel();

        // 保存三个 AI 场景模型选择
        const summarySelect = this.menu.querySelector('#summaryModelSelect');
        if (summarySelect) this._saveScenarioModel(this.SUMMARY_MODEL_STORAGE_KEY, summarySelect);
        const translateSelect = this.menu.querySelector('#translateModelSelect');
        if (translateSelect) this._saveScenarioModel(this.TRANSLATE_MODEL_STORAGE_KEY, translateSelect);
        const tagRecommendSelect = this.menu.querySelector('#tagRecommendModelSelect');
        if (tagRecommendSelect) this._saveScenarioModel(this.TAG_RECOMMEND_MODEL_STORAGE_KEY, tagRecommendSelect);

        Utils?.showNotification?.(`已保存 ${count} 个 API 密钥`, 'success');
        this.hide();
    },

    async clearAll() {
        const shouldClear = window.confirm('确认清空所有 API 密钥吗？');
        if (!shouldClear) return;

        if (typeof ApiKeyStore !== 'undefined' && ApiKeyStore.clearAll) {
            await ApiKeyStore.clearAll();
        }

        await this.loadValues();
        Utils?.showNotification?.('已清空所有 API 密钥', 'info');
    },

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};