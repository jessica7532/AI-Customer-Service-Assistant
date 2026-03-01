/* ========================================
   标签管理弹窗 - 逻辑
   支持 Logic(回复逻辑) 和 Template(回复模板) 两种类型
   对接 TagManager 服务 (tag-service.js)
   ======================================== */

const TagManagerUI = {
    panel: null,
    isVisible: false,
    currentTab: 'logic', // 'logic' | 'template'
    editModal: null,
    editingItem: null,
    tagsData: [], // 本地缓存
    customCategories: [], // 用户自定义的一级分类
    
    // 固定的一级分类（从CONFIG读取）
    get categories() {
        return (typeof CONFIG !== 'undefined' && CONFIG.categories) 
            ? CONFIG.categories 
            : ['广告问题', 'Bug', '建议'];
    },

    // 合并系统分类 + 自定义分类 + 当前所有标签中已有的分类
    getAllCategories() {
        const fromTags = this.tagsData.map(t => t.category).filter(Boolean);
        const merged = [...new Set([...this.categories, ...this.customCategories, ...fromTags])];
        return merged;
    },

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
            replyLogic: tag.replyLogic || (tag.prompt || null),
            languages: tag.languages || null
        };
    },

    normalizeTags(tags = []) {
        return (Array.isArray(tags) ? tags : []).map(tag => this.normalizeTag(tag));
    },

    // 加载自定义分类（从 chrome.storage 读取）
    async loadCustomCategories() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await new Promise(resolve => {
                    chrome.storage.local.get(['helpshift_custom_categories'], resolve);
                });
                this.customCategories = result.helpshift_custom_categories || [];
            }
        } catch (e) {
            this.customCategories = [];
        }
    },

    // 保存自定义分类
    async saveCustomCategories() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await new Promise(resolve => {
                    chrome.storage.local.set({ helpshift_custom_categories: this.customCategories }, resolve);
                });
            }
        } catch (e) {
            console.warn('[TagManagerUI] 保存自定义分类失败:', e);
        }
    },

    async addCustomCategoryFromManage() {
        const input = this.panel?.querySelector('#manageCategoryNewInput');
        const name = input?.value?.trim();
        if (!name) {
            input?.focus();
            return;
        }

        if (this.getAllCategories().includes(name)) {
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification(`分类"${name}"已存在`);
            }
            input?.focus();
            input?.select();
            return;
        }

        this.customCategories.push(name);
        await this.saveCustomCategories();
        if (typeof Utils !== 'undefined' && Utils.showNotification) {
            Utils.showNotification(`✅ 分类"${name}"已添加`);
        }

        const container = this.panel?.querySelector('#manageCategoryContainer');
        if (container) {
            this.renderManageCategoryList(container);
            const newInput = container.querySelector('#manageCategoryNewInput');
            if (newInput) {
                newInput.value = '';
                newInput.focus();
            }
        }
    },

    hideManageCategoryOverlay() {
        const overlay = this.panel?.querySelector('#manageCategoryOverlay');
        if (overlay) overlay.style.display = 'none';
    },

    // ========== 管理分类覆盖层 ==========

    showManageCategoryOverlay() {
        const overlay = this.panel.querySelector('#manageCategoryOverlay');
        const container = this.panel.querySelector('#manageCategoryContainer');
        if (!overlay || !container) return;

        this.renderManageCategoryList(container);
        overlay.style.display = 'block';
        const input = container.querySelector('#manageCategoryNewInput');
        if (input) input.focus();
    },

    renderManageCategoryList(container) {
        const builtinList = [...new Set(this.categories)];
        const customList = [...this.customCategories];

        const builtinRows = builtinList.length === 0
            ? `<div class="manage-category-empty">暂无内置分类</div>`
            : builtinList.map(c => `
                <div class="manage-category-row">
                    <span class="manage-category-name">${this.escapeHtml(c)}</span>
                    <span class="manage-category-badge">内置</span>
                </div>
            `).join('');

        const customRows = customList.length === 0
            ? `<div class="manage-category-empty">暂无自定义分类</div>`
            : customList.map(c => `
                <div class="manage-category-row">
                    <span class="manage-category-name">${this.escapeHtml(c)}</span>
                    <button class="manage-category-delete-btn delete-category-btn" data-name="${this.escapeHtml(c)}">删除</button>
                </div>
            `).join('');

        container.innerHTML = `
            <div class="edit-form-header">
                <span class="edit-form-title">管理分类</span>
            </div>
            <div class="edit-form-body manage-category-body">
                <div class="manage-category-tip">
                    在这里维护一级分类。内置分类不可删除；删除自定义分类后，关联标签会保留，但一级分类会被清空。
                </div>
                <div class="manage-category-create">
                    <label class="manage-category-create-label" for="manageCategoryNewInput">新建分类</label>
                    <div class="manage-category-create-row">
                        <input type="text" id="manageCategoryNewInput" class="manage-category-input" placeholder="输入分类名称后回车或点击新建">
                        <button class="edit-btn primary-btn" id="manageCategoryCreateBtn">新建</button>
                    </div>
                </div>
                <div class="manage-category-section">
                    <div class="manage-category-section-title">内置分类</div>
                    <div class="manage-category-list">${builtinRows}</div>
                </div>
                <div class="manage-category-section">
                    <div class="manage-category-section-title">自定义分类</div>
                    <div class="manage-category-list">${customRows}</div>
                </div>
            </div>
            <div class="edit-form-footer">
                <button class="edit-btn cancel-btn" id="manageCategoryCloseBtn">关闭</button>
            </div>
        `;

        container.querySelector('#manageCategoryCloseBtn').addEventListener('click', () => {
            this.hideManageCategoryOverlay();
        });
        container.querySelector('#manageCategoryCreateBtn').addEventListener('click', () => {
            this.addCustomCategoryFromManage();
        });
        container.querySelector('#manageCategoryNewInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.addCustomCategoryFromManage();
            if (e.key === 'Escape') this.hideManageCategoryOverlay();
        });

        container.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const name = e.target.dataset.name;
                await this.deleteCustomCategory(name);
                this.renderManageCategoryList(container);
            });
        });

        this.shieldNoTranslate(container);
    },

    async deleteCustomCategory(name) {
        const now = new Date().toISOString();
        const affectedCount = this.tagsData.filter(tag => tag.category === name).length;

        this.customCategories = this.customCategories.filter(c => c !== name);
        if (affectedCount > 0) {
            this.tagsData = this.tagsData.map(tag => (
                tag.category === name
                    ? { ...tag, category: '', updatedAt: now }
                    : tag
            ));
        }

        await this.saveCustomCategories();
        await this.persistTagsData();
        await this.refreshTagConsumers('delete-category');

        this.renderTable();

        if (typeof Utils !== 'undefined' && Utils.showNotification) {
            if (affectedCount > 0) {
                Utils.showNotification(`✅ 分类"${name}"已删除，${affectedCount}个标签已改为未分类`);
            } else {
                Utils.showNotification(`✅ 分类"${name}"已删除`);
            }
        }
    },

    async persistTagsData() {
        if (typeof TagManager !== 'undefined' && TagManager.saveTags) {
            await TagManager.saveTags(this.tagsData);
            return;
        }
        if (typeof chrome !== 'undefined' && chrome.storage) {
            await new Promise(resolve => {
                chrome.storage.local.set({ 'sudoku_tags_v2': this.tagsData }, resolve);
            });
        }
    },

    async refreshTagConsumers(reason = 'tags-updated') {
        if (typeof PromptEditor !== 'undefined' && PromptEditor.loadAllTags) {
            await PromptEditor.loadAllTags();
        }
        this.emitTagsUpdated(reason);
    },

    emitTagsUpdated(reason = 'tags-updated') {
        if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') {
            return;
        }
        window.dispatchEvent(new CustomEvent('helpshift:tags-updated', {
            detail: {
                reason,
                updatedAt: new Date().toISOString()
            }
        }));
    },

    shieldNoTranslate(root = this.panel) {
        const target = root || this.panel;
        if (!target) return;

        const nodes = [target, ...target.querySelectorAll('*')];
        nodes.forEach(el => {
            if (!el || el.nodeType !== 1) return;
            el.setAttribute('translate', 'no');
            el.classList.add('notranslate');
            el.setAttribute('data-immersive-translate-walked', 'true');
            el.setAttribute('data-immersive-translate-effect', 'excluded');
            el.setAttribute('data-no-translation', '1');
        });
    },


    getCategoryOptions(selectedCategory) {
        const all = this.getAllCategories();
        const opts = all.map(c =>
            `<option value="${this.escapeHtml(c)}" ${selectedCategory === c ? 'selected' : ''}>${this.escapeHtml(c)}</option>`
        ).join('');
        return opts;
    },
    
    // 24种语言配置（从LanguageConfig读取）
    get languages() {
        if (typeof LanguageConfig !== 'undefined' && LanguageConfig.SUPPORTED_LANGUAGES) {
            return LanguageConfig.SUPPORTED_LANGUAGES;
        }
        return {
            'zh-Hans': { name: '中文简体', order: 1 },
            'zh-Hant': { name: '中文繁体', order: 2 },
            'en-US': { name: '英语', order: 3 },
            'ja': { name: '日语', order: 4 },
            'ko': { name: '韩语', order: 5 },
            'es-ES': { name: '西班牙语', order: 6 },
            'pt-BR': { name: '葡萄牙语', order: 7 },
            'fr-FR': { name: '法语', order: 8 },
            'de-DE': { name: '德语', order: 9 },
            'ru-RU': { name: '俄语', order: 10 },
            'it-IT': { name: '意大利语', order: 11 },
            'ar-SA': { name: '阿拉伯语', order: 12 },
            'tr-TR': { name: '土耳其语', order: 13 },
            'vi-VN': { name: '越南语', order: 14 },
            'id-ID': { name: '印尼语', order: 15 },
            'th-TH': { name: '泰语', order: 16 },
            'nl-NL': { name: '荷兰语', order: 17 },
            'pl-PL': { name: '波兰语', order: 18 },
            'ro-RO': { name: '罗马尼亚语', order: 19 },
            'sv-SE': { name: '瑞典语', order: 20 },
            'hi-IN': { name: '印地语', order: 21 },
            'uk-UA': { name: '乌克兰语', order: 22 },
            'cs-CZ': { name: '捷克语', order: 23 },
            'el-GR': { name: '希腊语', order: 24 }
        };
    },

    // 创建主面板
    create() {
        const panel = document.createElement('div');
        panel.className = 'tag-manager-panel notranslate';
        panel.style.display = 'none';
        panel.setAttribute('translate', 'no');  // 禁止翻译
        panel.setAttribute('data-immersive-translate-walked', 'true');  // 禁止沉浸式翻译
        panel.setAttribute('data-immersive-translate-effect', 'excluded');
        panel.setAttribute('data-no-translation', '1');
        panel.innerHTML = `
            <div class="tag-manager-tabs">
                <button class="tab-btn active" data-tab="logic">回复逻辑</button>
                <button class="tab-btn" data-tab="template">回复模板</button>
            </div>
            <div class="tag-manager-toolbar">
                <button class="toolbar-btn" id="tagAddBtn"><span>+ 添加标签</span></button>
                <button class="toolbar-btn" id="tagManageCategoryBtn"><span>管理分类</span></button>
                <div style="flex:1;"></div>
                <button class="toolbar-btn" id="tagImportBtn"><span>↑ 导入</span></button>
                <button class="toolbar-btn" id="tagExportBtn"><span>↓ 导出</span></button>
            </div>
            <!-- 管理分类覆盖层 -->
            <div class="tag-edit-overlay" id="manageCategoryOverlay" style="display:none;">
                <div class="edit-form-container" id="manageCategoryContainer"></div>
            </div>
            <div class="tag-manager-body">
                <table class="tag-table">
                    <thead>
                        <tr>
                            <th class="col-category">一级分类</th>
                            <th class="col-tag">二级标签</th>
                            <th class="col-action">操作</th>
                        </tr>
                    </thead>
                    <tbody id="tagTableBody"></tbody>
                </table>
            </div>
            <!-- 编辑表单覆盖层 - 移到panel层级 -->
            <div class="tag-edit-overlay" id="tagEditOverlay" style="display: none;">
                <div class="edit-form-container" id="editFormContainer">
                    <!-- 动态插入表单内容 -->
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;
        this.shieldNoTranslate(panel);
        
        this.bindEvents();
        return panel;
    },

    bindEvents() {
        const self = this;
        
        // Tab 切换
        this.panel.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                self.panel.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                self.currentTab = btn.dataset.tab;
                self.renderTable();
            });
        });
        
        // 外部点击关闭由 sidebar.js 的 closeAllPanels() 统一处理

        this.panel.querySelector('#tagAddBtn').addEventListener('click', () => {
            self.currentTab === 'logic' ? self.showLogicModal(null) : self.showTemplateModal(null);
        });

        this.panel.querySelector('#tagManageCategoryBtn').addEventListener('click', () => self.showManageCategoryOverlay());

        this.panel.querySelector('#tagImportBtn').addEventListener('click', () => self.importData());
        this.panel.querySelector('#tagExportBtn').addEventListener('click', () => self.exportData());
    },

    // ========== 数据操作（对接TagManager服务）==========
    
    async loadData() {
        await this.loadCustomCategories();
        try {
            if (typeof TagManager !== 'undefined' && TagManager.getTags) {
                // 使用 TagManager 服务
                this.tagsData = this.normalizeTags(await TagManager.getTags());
            } else if (typeof chrome !== 'undefined' && chrome.storage) {
                // 直接使用 Chrome Storage
                const result = await new Promise(resolve => {
                    chrome.storage.local.get(['sudoku_tags_v2'], resolve);
                });
                this.tagsData = this.normalizeTags(result.sudoku_tags_v2 || []);
            } else {
                // 测试环境
                this.tagsData = this.normalizeTags(this.getDefaultTags());
            }
        } catch (error) {
            console.error('加载标签数据失败:', error);
            this.tagsData = [];
        }
    },

    getDefaultTags() {
        return [
            { id: 1, category: '广告问题', name: '广告未加载', type: 'logic', displayInQuickTag: true, quickTagOrder: 1, replyLogic: 'User reports ads not loading. Acknowledge the issue, ask for device/OS info.', languages: null },
            { id: 2, category: 'Bug', name: '游戏崩溃', type: 'logic', displayInQuickTag: true, quickTagOrder: 2, replyLogic: 'User reports game crashes. Express concern, ask when it happens.', languages: null },
            { id: 3, category: '广告问题', name: '感谢反馈', type: 'template', displayInQuickTag: true, quickTagOrder: 3, replyLogic: null, languages: { 'zh-Hans': '感谢您的反馈！', 'en-US': 'Thank you for your feedback!' } },
        ];
    },

    getSortedCurrentTabData() {
        const categoryOrder = this.getAllCategories();
        const categoryIndex = new Map(categoryOrder.map((category, index) => [category, index]));
        const unknownCategoryRank = categoryOrder.length;
        const emptyCategoryRank = Number.MAX_SAFE_INTEGER;

        return this.tagsData
            .filter(t => t.type === this.currentTab)
            .slice()
            .sort((a, b) => {
                const aCategory = (a.category || '').trim();
                const bCategory = (b.category || '').trim();

                const aRank = aCategory
                    ? (categoryIndex.has(aCategory) ? categoryIndex.get(aCategory) : unknownCategoryRank)
                    : emptyCategoryRank;
                const bRank = bCategory
                    ? (categoryIndex.has(bCategory) ? categoryIndex.get(bCategory) : unknownCategoryRank)
                    : emptyCategoryRank;

                if (aRank !== bRank) return aRank - bRank;
                if (aCategory !== bCategory) return aCategory.localeCompare(bCategory, 'zh-CN');

                const aCreated = Date.parse(a.createdAt || '');
                const bCreated = Date.parse(b.createdAt || '');
                const aCreatedRank = Number.isNaN(aCreated) ? Number.MAX_SAFE_INTEGER : aCreated;
                const bCreatedRank = Number.isNaN(bCreated) ? Number.MAX_SAFE_INTEGER : bCreated;

                if (aCreatedRank !== bCreatedRank) return aCreatedRank - bCreatedRank;

                const aId = Number(a.id);
                const bId = Number(b.id);
                if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;

                return (a.name || '').localeCompare(b.name || '', 'zh-CN');
            });
    },

    renderTable() {
        const tbody = this.panel.querySelector('#tagTableBody');
        const data = this.getSortedCurrentTabData();
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:40px; color:#999999;">暂无数据</td></tr>`;
            this.shieldNoTranslate(this.panel);
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr data-id="${item.id}">
                <td>${this.escapeHtml(item.category)}</td>
                <td>${this.escapeHtml(item.name)}</td>
                <td class="col-action">
                    <button class="action-btn edit-btn" data-id="${item.id}">修改</button>
                    <button class="action-btn delete delete-btn" data-id="${item.id}">删除</button>
                </td>
            </tr>
        `).join('');

        this.bindRowEvents();
        this.shieldNoTranslate(this.panel);
    },

    bindRowEvents() {
        const self = this;
        
        this.panel.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                const item = self.tagsData.find(d => d.id === id);
                if (item) {
                    item.type === 'logic' ? self.showLogicModal(item) : self.showTemplateModal(item);
                }
            });
        });

        this.panel.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.dataset.id);
                const item = self.tagsData.find(d => d.id === id);
                if (item && confirm(`确定删除标签"${item.name}"吗？`)) {
                    await self.deleteItem(id);
                }
            });
        });
    },

    async deleteItem(id) {
        try {
            if (typeof TagManager !== 'undefined' && TagManager.deleteTag) {
                await TagManager.deleteTag(id);
                this.tagsData = this.tagsData.filter(d => d.id !== id);
            } else {
                this.tagsData = this.tagsData.filter(d => d.id !== id);
            }
            this.renderTable();
            
            // 🔧 通知其他模块刷新标签数据
            await this.refreshTagConsumers('delete-tag');
            
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification('✅ 标签已删除');
            }
        } catch (error) {
            alert('删除失败: ' + error.message);
        }
    },

    // ========== Logic 编辑覆盖层 ==========
    
    showLogicModal(item) {
        // 确保面板存在
        if (!this.panel || !document.body.contains(this.panel)) {
            console.warn('[TagManagerUI] 面板不存在或已被移除，重新创建');
            this.panel = null;
            this.create();
        }
        
        this.editingItem = item;
        const overlay = this.panel.querySelector('#tagEditOverlay');
        const container = this.panel.querySelector('#editFormContainer');
        
        if (!overlay || !container) {
            console.error('[TagManagerUI] 找不到编辑覆盖层元素');
            alert('界面加载异常，请刷新页面重试');
            return;
        }

        const categoryOptions = this.getCategoryOptions(item ? item.category : null);
        const logicQuickTagOrder = (item && item.quickTagOrder !== null && item.quickTagOrder !== undefined) ? parseInt(item.quickTagOrder, 10) : 0;

        container.innerHTML = `
            <div class="edit-form-header">
                <span class="edit-form-title">${item ? '修改标签' : '添加标签'}</span>
            </div>
            <div class="edit-form-body">
                <div class="edit-form-row">
                    <label class="edit-label">一级标签</label>
                    <select class="edit-input" id="logicCategory">${categoryOptions}</select>
                </div>
                <div class="edit-form-row">
                    <label class="edit-label">二级标签名</label>
                    <input type="text" class="edit-input" id="logicName" 
                        value="${item ? this.escapeHtml(item.name) : ''}" placeholder="输入标签名称...">
                </div>
                <div class="edit-form-row">
                    <label class="edit-label">回复逻辑</label>
                    <textarea class="edit-textarea" id="logicReplyLogic" 
                        placeholder="输入回复逻辑和要求...">${item ? this.escapeHtml(item.replyLogic || '') : ''}</textarea>
                </div>
                <div class="edit-form-row">
                    <div class="quick-tag-hint">设为 1–6 可显示在快捷标签栏，0 为不显示</div>
                    <div class="quick-tag-select-row">
                        <label class="edit-label" for="logicQuickTagOrder">常用标签位置</label>
                        <select class="quick-tag-select" id="logicQuickTagOrder">
                            <option value="0" ${logicQuickTagOrder === 0 ? 'selected' : ''}>0 — 不显示</option>
                            <option value="1" ${logicQuickTagOrder === 1 ? 'selected' : ''}>1</option>
                            <option value="2" ${logicQuickTagOrder === 2 ? 'selected' : ''}>2</option>
                            <option value="3" ${logicQuickTagOrder === 3 ? 'selected' : ''}>3</option>
                            <option value="4" ${logicQuickTagOrder === 4 ? 'selected' : ''}>4</option>
                            <option value="5" ${logicQuickTagOrder === 5 ? 'selected' : ''}>5</option>
                            <option value="6" ${logicQuickTagOrder === 6 ? 'selected' : ''}>6</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="edit-form-footer">
                <button class="edit-btn cancel-btn" id="editCancelBtn">取消</button>
                <button class="edit-btn primary-btn" id="editConfirmBtn">保存</button>
            </div>
        `;

        overlay.style.display = 'block';

        const self = this;
        container.querySelector('#editCancelBtn').addEventListener('click', () => self.hideEditOverlay());
        container.querySelector('#editConfirmBtn').addEventListener('click', () => self.saveLogic());
        // 常用标签位置由 select #logicQuickTagOrder 直接读取
        this.shieldNoTranslate(overlay);
    },

    async saveLogic() {
        if (!this.panel) {
            alert('保存失败: 面板未初始化');
            return;
        }
        const container = this.panel.querySelector('#editFormContainer');
        if (!container) {
            alert('保存失败: 编辑表单未找到');
            return;
        }
        const category = container.querySelector('#logicCategory')?.value;
        const name = container.querySelector('#logicName')?.value?.trim();
        const replyLogic = container.querySelector('#logicReplyLogic')?.value?.trim();
        const quickTagOrder = parseInt(container.querySelector('#logicQuickTagOrder')?.value || '0', 10);
        const displayInQuickTag = quickTagOrder > 0;

        if (!name) { alert('请输入标签名称'); return; }
        if (!replyLogic) { alert('请输入回复逻辑'); return; }

        try {
            if (this.editingItem) {
                // 更新
                if (typeof TagManager !== 'undefined' && TagManager.updateLogicTag) {
                    await TagManager.updateLogicTag(this.editingItem.id, category, name, replyLogic, displayInQuickTag, quickTagOrder);
                }
                const item = this.tagsData.find(d => d.id === this.editingItem.id);
                if (item) {
                    Object.assign(item, { category, name, displayInQuickTag, quickTagOrder, replyLogic, updatedAt: new Date().toISOString() });
                }
            } else {
                // 添加
                let newId;
                if (typeof TagManager !== 'undefined' && TagManager.addLogicTag) {
                    newId = await TagManager.addLogicTag(category, name, replyLogic, displayInQuickTag, quickTagOrder);
                } else {
                    newId = this.tagsData.length > 0 ? Math.max(...this.tagsData.map(d => d.id)) + 1 : 1;
                }
                this.tagsData.push({
                    id: newId, category, name, type: 'logic', displayInQuickTag, quickTagOrder, replyLogic, languages: null,
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                });
            }

            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification(this.editingItem ? '✅ 标签已更新' : '✅ 标签已添加');
            }
            this.hideEditOverlay();
            this.renderTable();
            
            // 🔧 通知其他模块刷新标签数据
            await this.refreshTagConsumers('save-logic-tag');
        } catch (error) {
            alert('保存失败: ' + error.message);
        }
    },

    // ========== Template 编辑覆盖层 ==========
    
    showTemplateModal(item) {
        // 确保面板存在
        if (!this.panel || !document.body.contains(this.panel)) {
            console.warn('[TagManagerUI] 面板不存在或已被移除，重新创建');
            this.panel = null;
            this.create();
        }
        
        this.editingItem = item;
        const overlay = this.panel.querySelector('#tagEditOverlay');
        const container = this.panel.querySelector('#editFormContainer');
        
        if (!overlay || !container) {
            console.error('[TagManagerUI] 找不到编辑覆盖层元素');
            alert('界面加载异常，请刷新页面重试');
            return;
        }

        const categoryOptions = this.getCategoryOptions(item ? item.category : null);
        const templateQuickTagOrder = (item && item.quickTagOrder !== null && item.quickTagOrder !== undefined) ? parseInt(item.quickTagOrder, 10) : 0;

        const langCodes = Object.entries(this.languages)
            .sort((a, b) => a[1].order - b[1].order)
            .map(([code]) => code);
        
        const languageInputs = langCodes.map(code => {
            const lang = this.languages[code];
            const value = item && item.languages && item.languages[code] ? this.escapeHtml(item.languages[code]) : '';
            return `<div class="edit-form-row">
                <label class="edit-label">${lang.name} (${code})</label>
                <textarea class="edit-textarea lang-input" data-lang="${code}" placeholder="输入${lang.name}内容...">${value}</textarea>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div class="edit-form-header">
                <span class="edit-form-title">${item ? '修改模板' : '添加模板'}</span>
            </div>
            <div class="edit-form-body">
                <div class="edit-form-row">
                    <label class="edit-label">一级标签</label>
                    <select class="edit-input" id="templateCategory">${categoryOptions}</select>
                </div>
                <div class="edit-form-row">
                    <label class="edit-label">二级标签名</label>
                    <input type="text" class="edit-input" id="templateName" 
                        value="${item ? this.escapeHtml(item.name) : ''}" placeholder="输入标签名称...">
                </div>
                <div class="edit-form-row">
                    <div class="quick-tag-hint">设为 1–6 可显示在快捷标签栏，0 为不显示</div>
                    <div class="quick-tag-select-row">
                        <label class="edit-label" for="templateQuickTagOrder">常用标签位置</label>
                        <select class="quick-tag-select" id="templateQuickTagOrder">
                            <option value="0" ${templateQuickTagOrder === 0 ? 'selected' : ''}>0 — 不显示</option>
                            <option value="1" ${templateQuickTagOrder === 1 ? 'selected' : ''}>1</option>
                            <option value="2" ${templateQuickTagOrder === 2 ? 'selected' : ''}>2</option>
                            <option value="3" ${templateQuickTagOrder === 3 ? 'selected' : ''}>3</option>
                            <option value="4" ${templateQuickTagOrder === 4 ? 'selected' : ''}>4</option>
                            <option value="5" ${templateQuickTagOrder === 5 ? 'selected' : ''}>5</option>
                            <option value="6" ${templateQuickTagOrder === 6 ? 'selected' : ''}>6</option>
                        </select>
                    </div>
                </div>
                <div class="ai-translate-row">
                    <button class="ai-translate-btn" id="aiTranslateBtn">
                        <span>🤖</span><span>AI翻译所有语言</span>
                    </button>
                    <div class="ai-translate-hint">从第一个非空语言翻译到其他所有语言（使用Gemini模型）</div>
                </div>
                ${languageInputs}
            </div>
            <div class="edit-form-footer">
                <button class="edit-btn cancel-btn" id="editCancelBtn">取消</button>
                <button class="edit-btn primary-btn" id="editConfirmBtn">保存</button>
            </div>
        `;

        overlay.style.display = 'block';

        const self = this;
        container.querySelector('#editCancelBtn').addEventListener('click', () => self.hideEditOverlay());
        container.querySelector('#editConfirmBtn').addEventListener('click', () => self.saveTemplate());
        // 常用标签位置由 select #templateQuickTagOrder 直接读取
        container.querySelector('#aiTranslateBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    self.aiTranslateAll();
});
        this.shieldNoTranslate(overlay);
    },

    async saveTemplate() {
        if (!this.panel) {
            alert('保存失败: 面板未初始化');
            return;
        }
        const container = this.panel.querySelector('#editFormContainer');
        if (!container) {
            alert('保存失败: 编辑表单未找到');
            return;
        }
        const category = container.querySelector('#templateCategory')?.value;
        const name = container.querySelector('#templateName')?.value?.trim();
        const quickTagOrder = parseInt(container.querySelector('#templateQuickTagOrder')?.value || '0', 10);
        const displayInQuickTag = quickTagOrder > 0;

        if (!name) { alert('请输入标签名称'); return; }

        const languages = {};
        container.querySelectorAll('.lang-input').forEach(textarea => {
            const text = textarea.value.trim();
            if (text) languages[textarea.dataset.lang] = text;
        });

        if (Object.keys(languages).length === 0) {
            alert('请至少填写一个语言的内容');
            return;
        }

        try {
            if (this.editingItem) {
                if (typeof TagManager !== 'undefined' && TagManager.updateTemplateTag) {
                    await TagManager.updateTemplateTag(this.editingItem.id, category, name, languages, displayInQuickTag, quickTagOrder);
                }
                const item = this.tagsData.find(d => d.id === this.editingItem.id);
                if (item) {
                    Object.assign(item, { category, name, displayInQuickTag, quickTagOrder, languages, updatedAt: new Date().toISOString() });
                }
            } else {
                let newId;
                if (typeof TagManager !== 'undefined' && TagManager.addTemplateTag) {
                    newId = await TagManager.addTemplateTag(category, name, languages, displayInQuickTag, quickTagOrder);
                } else {
                    newId = this.tagsData.length > 0 ? Math.max(...this.tagsData.map(d => d.id)) + 1 : 1;
                }
                this.tagsData.push({
                    id: newId, category, name, type: 'template', displayInQuickTag, quickTagOrder, replyLogic: null, languages,
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                });
            }

            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification(this.editingItem ? '✅ 模板已更新' : '✅ 模板已添加');
            }
            this.hideEditOverlay();
            this.renderTable();
            
            // 🔧 通知其他模块刷新标签数据
            await this.refreshTagConsumers('save-template-tag');
        } catch (error) {
            alert('保存失败: ' + error.message);
        }
    },

    async aiTranslateAll() {
        if (!this.panel) {
            alert('翻译失败: 面板未初始化');
            return;
        }
        const container = this.panel.querySelector('#editFormContainer');
        if (!container) {
            alert('翻译失败: 编辑表单未找到');
            return;
        }
        const btn = container.querySelector('#aiTranslateBtn');
        if (!btn) {
            alert('翻译失败: 翻译按钮未找到');
            return;
        }
        const originalText = btn.innerHTML;

        let baseText = '', baseLang = '';
        for (const textarea of container.querySelectorAll('.lang-input')) {
            const text = textarea.value.trim();
            if (text) { baseText = text; baseLang = textarea.dataset.lang; break; }
        }

        if (!baseText) { alert('请先在任意一个语言框中输入内容'); return; }

        btn.disabled = true;
        btn.innerHTML = '<span>🤖</span><span>翻译中...</span>';

        try {
            if (typeof TemplateTranslator !== 'undefined' && TemplateTranslator.translateAll) {
                const translations = await TemplateTranslator.translateAll(baseText, baseLang);
                Object.entries(translations).forEach(([code, text]) => {
                    const textarea = container.querySelector(`.lang-input[data-lang="${code}"]`);
                    if (textarea && text) textarea.value = text;
                });
                if (typeof Utils !== 'undefined' && Utils.showNotification) {
                    Utils.showNotification('✅ 翻译完成！');
                } else {
                    alert('翻译完成！');
                }
            } else {
                alert('翻译服务不可用');
            }
        } catch (error) {
            alert('翻译失败: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    hideEditOverlay() {
        if (!this.panel) return;
        const overlay = this.panel.querySelector('#tagEditOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        this.editingItem = null;
    },

    // 保留旧方法名作为兼容，指向新方法
    hideEditModal() {
        this.hideEditOverlay();
    },

    // ========== 导入导出 ==========

    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        const self = this;
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                if (typeof TagManager !== 'undefined' && TagManager.importTags) {
                    const imported = await TagManager.importTags(file);
                    self.tagsData = self.normalizeTags(imported);
                    self.renderTable();
                    if (typeof Utils !== 'undefined' && Utils.showNotification) {
                        Utils.showNotification('✅ 导入成功');
                    } else {
                        alert('导入成功！');
                    }
                } else {
                    // 手动处理
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const imported = JSON.parse(event.target.result);
                            if (Array.isArray(imported)) {
                                self.tagsData = self.normalizeTags(imported);
                                self.renderTable();
                                alert('导入成功！');
                            }
                        } catch (err) { alert('导入失败：' + err.message); }
                    };
                    reader.readAsText(file);
                }
            } catch (error) {
                alert('导入失败: ' + error.message);
            }
        };
        input.click();
    },

    async exportData() {
        try {
            if (typeof TagManager !== 'undefined' && TagManager.exportTags) {
                await TagManager.exportTags();
            } else {
                const data = this.tagsData;
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `标签数据_${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            alert('导出失败: ' + error.message);
        }
    },

    async saveAllData() {
        try {
            if (typeof TagManager !== 'undefined' && TagManager.saveTags) {
                await TagManager.saveTags(this.tagsData);
            } else if (typeof chrome !== 'undefined' && chrome.storage) {
                await new Promise(resolve => {
                    chrome.storage.local.set({ 'sudoku_tags_v2': this.tagsData }, resolve);
                });
            }
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification('✅ 保存成功');
            } else {
                alert('保存成功！');
            }
            this.hide();
        } catch (error) {
            alert('保存失败: ' + error.message);
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    async show() {
        if (!this.panel) this.create();
        await this.loadData();
        this.renderTable();
        this.panel.style.display = 'flex';
        this.isVisible = true;
    },

    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
            this.isVisible = false;
            this.hideEditModal();
        }
    },

    toggle() {
        this.isVisible ? this.hide() : this.show();
    }
};