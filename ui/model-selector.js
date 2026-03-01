/* ========================================
   模型选择菜单
   点击侧边栏模型按钮弹出
   - 从 ApiSettingsPanel 存储动态读取模型
   - 支持拖拽排序（跨 provider 全局排序）
   - 排序结果独立存储，不影响 api-settings 的数据
   ======================================== */

const ModelSelectorMenu = {
    menu: null,
    isVisible: false,
    isSortMode: false,

    // provider key → 显示名映射（和 ApiSettingsPanel.providers 保持一致）
    PROVIDER_LABELS: {
        openrouter: 'OpenRouter',
        deepseek: 'DeepSeek',
        zhipu: '智谱 AI',
        doubao: '豆包',
        googleAIStudio: 'Google AI Studio'
    },

    // 全局排序存储 key
    // 存储格式: [ { provider: 'openrouter', id: 'anthropic/claude-sonnet-4' }, ... ]
    SORT_ORDER_KEY: 'helpshift_model_sort_order_v1',

    // ========== 数据读取 ==========

    /**
     * 从 ApiSettingsPanel 的存储读取所有 provider 的模型
     * 返回: { providerKey: [ { id, name }, ... ], ... }
     */
    async _loadModelsFromStorage() {
        if (typeof ApiSettingsPanel !== 'undefined' && ApiSettingsPanel.loadAllModels) {
            return await ApiSettingsPanel.loadAllModels();
        }
        // fallback：直接读 storage
        const storageKey = 'helpshift_provider_models_v1';
        try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                const result = await chrome.storage.local.get([storageKey]);
                if (result[storageKey]) return result[storageKey];
            } else {
                const raw = localStorage.getItem(storageKey);
                if (raw) return JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[ModelSelectorMenu] _loadModelsFromStorage failed:', e);
        }
        return {};
    },

    /**
     * 读取用户保存的全局排序
     */
    _loadSortOrder() {
        try {
            const raw = localStorage.getItem(this.SORT_ORDER_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return null;
    },

    /**
     * 保存全局排序
     */
    _saveSortOrder(order) {
        try {
            localStorage.setItem(this.SORT_ORDER_KEY, JSON.stringify(order));
        } catch (e) {
            console.warn('[ModelSelectorMenu] _saveSortOrder failed:', e);
        }
    },

    /**
     * 把 provider 分组数据 + 排序信息合并，生成最终的扁平列表
     * 返回: [ { provider, id, name, providerLabel }, ... ]
     */
    async _buildModelList() {
        const allModels = await this._loadModelsFromStorage();
        const sortOrder = this._loadSortOrder();

        // 构建完整的扁平列表（未排序）
        const flatAll = [];
        for (const [providerKey, models] of Object.entries(allModels)) {
            if (!Array.isArray(models)) continue;
            const providerLabel = this.PROVIDER_LABELS[providerKey] || providerKey;
            for (const m of models) {
                flatAll.push({
                    provider: providerKey,
                    id: m.id,
                    name: m.name,
                    providerLabel
                });
            }
        }

        // 如果没有自定义排序，按 provider 分组顺序返回
        if (!sortOrder || !Array.isArray(sortOrder) || sortOrder.length === 0) {
            return flatAll;
        }

        // 有自定义排序：按排序表排，新增的模型追加到末尾
        const sorted = [];
        const remaining = [...flatAll];

        for (const entry of sortOrder) {
            const idx = remaining.findIndex(m => m.provider === entry.provider && m.id === entry.id);
            if (idx !== -1) {
                sorted.push(remaining.splice(idx, 1)[0]);
            }
        }
        // 追加排序表里没有的新模型
        sorted.push(...remaining);

        return sorted;
    },

    // ========== 菜单渲染 ==========

    create() {
        const menu = document.createElement('div');
        menu.className = 'model-selector-menu';
        menu.id = 'modelSelectorMenu';
        menu.style.display = 'none';
        menu.setAttribute('translate', 'no');
        menu.setAttribute('data-immersive-translate-walked', 'true');

        document.body.appendChild(menu);
        this.menu = menu;

        this._bindGlobalEvents();
        return menu;
    },

    /**
     * 渲染菜单内容（每次 show 时调用，保证数据最新）
     */
    async _renderModels() {
        if (!this.menu) return;

        const modelList = await this._buildModelList();

        if (modelList.length === 0) {
            this.menu.innerHTML = `
                <div class="model-selector-empty">
                    <div class="model-selector-empty-text">暂无可用模型</div>
                    <div class="model-selector-empty-hint">请在 API 设置中配置模型</div>
                </div>
            `;
            return;
        }

        const currentModel = this.getCurrentModel();

        if (this.isSortMode) {
            this._renderSortMode(modelList, currentModel);
        } else {
            this._renderNormalMode(modelList, currentModel);
        }
    },

    /**
     * 普通模式：按 provider 分组显示
     */
    _renderNormalMode(modelList, currentModel) {
        // 按 provider 分组，保持全局排序中的出现顺序
        const groups = new Map();
        for (const m of modelList) {
            if (!groups.has(m.providerLabel)) {
                groups.set(m.providerLabel, []);
            }
            groups.get(m.providerLabel).push(m);
        }

        // provider 组顺序取决于模型列表中第一次出现的位置
        const groupOrder = [];
        for (const m of modelList) {
            if (!groupOrder.includes(m.providerLabel)) {
                groupOrder.push(m.providerLabel);
            }
        }

        // 当前选中模型名（标题副标题显示）
        const currentModelObj = modelList.find(m => m.id === currentModel);
        const currentModelName = currentModelObj ? this._escapeHtml(currentModelObj.name) : '未选择';

        let html = `
            <div class="model-selector-header">
                <span class="model-selector-title">模型选择</span>
                <span class="model-selector-current">${currentModelName}</span>
            </div>
            <div class="model-selector-body">
        `;

        for (const label of groupOrder) {
            const items = groups.get(label);
            if (!items || items.length === 0) continue;

            const itemsHTML = items.map(m => {
                const active = m.id === currentModel ? ' active' : '';
                return `<div class="model-item${active}" data-value="${this._escapeAttr(m.id)}" data-provider="${this._escapeAttr(m.provider)}">${this._escapeHtml(m.name)}</div>`;
            }).join('');

            html += `
                <div class="model-group">
                    <div class="model-group-title">${this._escapeHtml(label)}</div>
                    ${itemsHTML}
                </div>
            `;
        }

        html += `</div>`;

        // 底部操作栏
        html += `
            <div class="model-selector-footer">
                <button class="model-selector-sort-btn" id="modelSortEnterBtn" type="button">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 5h10"/><path d="M11 9h7"/><path d="M11 13h4"/>
                        <path d="M3 17l3 3 3-3"/><path d="M6 18V4"/>
                    </svg>
                    排序
                </button>
            </div>
        `;

        this.menu.innerHTML = html;
        this._bindMenuEvents();
    },

    /**
     * 排序模式：扁平列表 + 拖拽 / 上下按钮
     */
    _renderSortMode(modelList, currentModel) {
        const itemsHTML = modelList.map((m, idx) => {
            const active = m.id === currentModel ? ' active' : '';
            return `
                <div class="model-sort-item${active}" data-idx="${idx}" draggable="true">
                    <span class="model-sort-drag-handle">⠿</span>
                    <span class="model-sort-name">${this._escapeHtml(m.name)}</span>
                    <span class="model-sort-provider">${this._escapeHtml(m.providerLabel)}</span>
                </div>
            `;
        }).join('');

        this.menu.innerHTML = `
            <div class="model-sort-header">
                <span class="model-sort-title">拖拽排序</span>
                <button class="model-sort-done-btn" id="modelSortDoneBtn" type="button">完成</button>
            </div>
            <div class="model-sort-list" id="modelSortList">
                ${itemsHTML}
            </div>
        `;

        this._bindSortEvents(modelList);
    },

    // ========== 事件绑定 ==========

    _bindGlobalEvents() {
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (this.isVisible && this.menu && !this.menu.contains(e.target) && !e.target.closest('#ai-sidebar')) {
                this.hide();
            }
        });

        // 监听 api-settings 模型变更事件
        window.addEventListener('helpshift:models-changed', () => {
            if (this.isVisible) {
                this._renderModels();
            }
        });
    },

    _bindMenuEvents() {
        if (!this.menu) return;

        // 点击模型项
        this.menu.querySelectorAll('.model-item').forEach(item => {
            item.addEventListener('click', () => {
                const modelValue = item.dataset.value;
                const modelName = item.textContent.trim();
                this.selectModel(modelValue, modelName);
            });
        });

        // 排序按钮
        const sortBtn = this.menu.querySelector('#modelSortEnterBtn');
        if (sortBtn) {
            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isSortMode = true;
                this._renderModels();
            });
        }
    },

    _bindSortEvents(modelList) {
        if (!this.menu) return;

        // 完成按钮
        const doneBtn = this.menu.querySelector('#modelSortDoneBtn');
        if (doneBtn) {
            doneBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isSortMode = false;
                this._renderModels();
                Utils?.showNotification?.('排序已保存', 'success');
            });
        }

        // 拖拽排序
        const list = this.menu.querySelector('#modelSortList');
        if (list) {
            this._initDragSort(list, modelList);
        }
    },

    _initDragSort(listEl, modelList) {
        let dragIdx = null;

        listEl.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.model-sort-item');
            if (!item) return;
            dragIdx = parseInt(item.dataset.idx, 10);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        listEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const item = e.target.closest('.model-sort-item');
            if (!item) return;
            const overIdx = parseInt(item.dataset.idx, 10);
            if (dragIdx === null || overIdx === dragIdx) return;

            listEl.querySelectorAll('.model-sort-item').forEach(el => el.classList.remove('drag-over'));
            item.classList.add('drag-over');
        });

        listEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const item = e.target.closest('.model-sort-item');
            if (!item || dragIdx === null) return;
            const dropIdx = parseInt(item.dataset.idx, 10);
            if (dropIdx === dragIdx) return;

            const [moved] = modelList.splice(dragIdx, 1);
            modelList.splice(dropIdx, 0, moved);

            const order = modelList.map(m => ({ provider: m.provider, id: m.id }));
            this._saveSortOrder(order);
            this._renderSortMode(modelList, this.getCurrentModel());
        });

        listEl.addEventListener('dragend', () => {
            dragIdx = null;
            listEl.querySelectorAll('.model-sort-item').forEach(el => {
                el.classList.remove('dragging', 'drag-over');
            });
        });
    },

    // ========== 模型选择 ==========

    selectModel(value, name) {
        localStorage.setItem('helpshift_selected_model', value);
        localStorage.setItem('helpshift_selected_model_name', name);

        // 更新侧边栏 tooltip
        const modelBtn = document.getElementById('model-btn');
        if (modelBtn) {
            const tooltip = modelBtn.querySelector('.sidebar-tooltip');
            if (tooltip) {
                tooltip.textContent = `当前模型：${name}`;
            }
        }

        Utils?.showNotification?.(`✅ 已切换模型：${name}`);
        this.hide();
    },

    // ========== 显示/隐藏 ==========

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

        // 每次打开都重新渲染（保证数据最新）
        this.isSortMode = false;
        await this._renderModels();

        const rect = buttonElement.getBoundingClientRect();
        const menuWidth = 240;
        const left = (rect.left - menuWidth - 8) + 'px';
        const top = rect.top + 'px';

        // 只通过 JS 控制位置和显隐，其余样式由 CSS 管理
        this.menu.style.position = 'fixed';
        this.menu.style.left = left;
        this.menu.style.top = top;
        this.menu.style.display = 'block';

        this.isVisible = true;
    },

    hide() {
        if (this.menu) {
            this.menu.style.display = 'none';
            this.isVisible = false;
            this.isSortMode = false;
        }
    },

    getCurrentModel() {
        return localStorage.getItem('helpshift_selected_model') || '';
    },

    // ========== 工具方法 ==========

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _escapeAttr(text) {
        if (!text) return '';
        return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};

// 初始化（只创建 DOM 壳，不渲染内容，show 时再渲染）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ModelSelectorMenu.create());
} else {
    ModelSelectorMenu.create();
}