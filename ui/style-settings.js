// ========================================
// Style settings panel
// ========================================

const StyleSettingsPanel = {
    panel: null,
    isVisible: false,

    create() {
        const panel = document.createElement('div');
        panel.id = 'styleSettingsPanel';
        panel.className = 'style-settings-panel';
        panel.style.display = 'none';
        panel.setAttribute('translate', 'no');
        panel.setAttribute('data-immersive-translate-walked', 'true');

        panel.innerHTML = `
            <div class="style-settings-header">
                <div class="style-settings-title">风格自定义</div>
            </div>
            <div class="style-settings-body">
                <div class="style-settings-section">
                    <div class="style-settings-section-title">回复语气设置</div>

                    <label class="style-settings-label" for="styleToneFriendlyName">风格一名称</label>
                    <input id="styleToneFriendlyName" class="style-settings-input" type="text" placeholder="友好专业" />

                    <label class="style-settings-label" for="styleToneFriendlyPrompt">风格一 Prompt</label>
                    <textarea id="styleToneFriendlyPrompt" class="style-settings-textarea" placeholder="留空则使用默认 Prompt（默认内容不在此处展示）"></textarea>

                    <label class="style-settings-label" for="styleToneSoftName">风格二名称</label>
                    <input id="styleToneSoftName" class="style-settings-input" type="text" placeholder="软萌亲和" />

                    <label class="style-settings-label" for="styleToneSoftPrompt">风格二 Prompt</label>
                    <textarea id="styleToneSoftPrompt" class="style-settings-textarea" placeholder="留空则使用默认 Prompt（默认内容不在此处展示）"></textarea>
                </div>

                <div class="style-settings-section">
                    <div class="style-settings-section-title">产品信息设置</div>

                    <label class="style-settings-label" for="styleProductName">产品名称（可选）</label>
                    <input id="styleProductName" class="style-settings-input" type="text" placeholder="可留空" />

                    <label class="style-settings-label" for="styleProductDescription">产品描述（可选）</label>
                    <textarea id="styleProductDescription" class="style-settings-textarea short" placeholder="可留空"></textarea>
                </div>
            </div>
            <div class="style-settings-actions">
                <button id="styleSettingsClearBtn" class="style-settings-btn danger" type="button">清空</button>
                <button id="styleSettingsSaveBtn" class="style-settings-btn primary" type="button">保存</button>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;
        this.bindEvents();
        return panel;
    },

    bindEvents() {
        this.panel.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            if (target.id === 'styleSettingsSaveBtn') {
                await this.handleSave();
                return;
            }
            if (target.id === 'styleSettingsClearBtn') {
                await this.handleClear();
                return;
            }
        });

        // 外部点击关闭由 sidebar.js 的 closeAllPanels() 统一处理
    },

    async handleSave() {
        try {
            if (typeof StyleSettingsService === 'undefined' || !StyleSettingsService.saveOverrides) {
                throw new Error('StyleSettingsService is not available.');
            }

            const payload = {
                tones: {
                    friendly: {
                        name: this.getValue('#styleToneFriendlyName'),
                        prompt: this.getValue('#styleToneFriendlyPrompt')
                    },
                    soft: {
                        name: this.getValue('#styleToneSoftName'),
                        prompt: this.getValue('#styleToneSoftPrompt')
                    }
                },
                product: {
                    name: this.getValue('#styleProductName'),
                    description: this.getValue('#styleProductDescription')
                }
            };

            await StyleSettingsService.saveOverrides(payload);
            this.notifyUpdated();
            Utils?.showNotification?.('风格设置已保存', 'success');
            this.hide();
        } catch (error) {
            console.error('[StyleSettingsPanel] Save failed:', error);
            Utils?.showNotification?.(`保存失败: ${error.message}`, 'error');
        }
    },

    async handleClear() {
        try {
            const shouldClear = window.confirm('确认清空所有外层配置并恢复默认吗？');
            if (!shouldClear) {
                return;
            }

            if (typeof StyleSettingsService !== 'undefined' && StyleSettingsService.clearAllOverrides) {
                await StyleSettingsService.clearAllOverrides();
            }
            await this.loadValues();
            this.notifyUpdated();
            Utils?.showNotification?.('已恢复默认风格配置', 'info');
        } catch (error) {
            console.error('[StyleSettingsPanel] Clear failed:', error);
            Utils?.showNotification?.(`清空失败: ${error.message}`, 'error');
        }
    },

    notifyUpdated() {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('helpshift:style-settings-updated'));
        }
    },

    getValue(selector) {
        const el = this.panel?.querySelector(selector);
        return el ? el.value : '';
    },

    setValue(selector, value) {
        const el = this.panel?.querySelector(selector);
        if (el) {
            el.value = value || '';
        }
    },

    async loadValues() {
        if (typeof StyleSettingsService === 'undefined' || !StyleSettingsService.getRawOverrides) {
            return;
        }

        const overrides = await StyleSettingsService.getRawOverrides();
        this.setValue('#styleToneFriendlyName', overrides.tones?.friendly?.name || '');
        this.setValue('#styleToneFriendlyPrompt', overrides.tones?.friendly?.prompt || '');
        this.setValue('#styleToneSoftName', overrides.tones?.soft?.name || '');
        this.setValue('#styleToneSoftPrompt', overrides.tones?.soft?.prompt || '');
        this.setValue('#styleProductName', overrides.product?.name || '');
        this.setValue('#styleProductDescription', overrides.product?.description || '');
    },

    toggle(buttonElement) {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(buttonElement);
        }
    },

    async show(buttonElement) {
        if (!this.panel) {
            this.create();
        }

        await this.loadValues();

        if (buttonElement) {
            const rect = buttonElement.getBoundingClientRect();
            const panelWidth = 420;
            const left = rect.left - panelWidth - 8;
            const top = Math.max(8, Math.min(rect.top - 300, window.innerHeight - 660));
            this.panel.style.left = `${left}px`;
            this.panel.style.top = `${top}px`;
        }

        this.panel.style.display = 'block';
        this.isVisible = true;
    },

    hide() {
        if (!this.panel) {
            return;
        }
        this.panel.style.display = 'none';
        this.isVisible = false;
    }
};
