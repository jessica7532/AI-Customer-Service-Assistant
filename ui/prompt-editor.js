const PromptEditor = {
    panel: null,
    isVisible: false,
    selectedTagId: null,
    selectedTone: 'friendly',
    allTags: [],
    selectedCategory: null,
    currentTagType: 'logic',
    tagsUpdatedListenerBound: false,
    styleSettingsListenerBound: false,
    defaultToneLabels: {
        friendly: '友好专业',
        soft: '软萌亲和'
    },
    
    icons: {
        search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
        tag: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>',
        handHeart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 15 6 6"/><path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z"/></svg>',
        smile: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
        bot: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
        loader: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>'
    },
    
    create() {
        const panel = document.createElement('div');
        panel.id = 'prompt-editor-panel';
        panel.className = 'prompt-editor-panel';
        panel.setAttribute('translate', 'no');
        panel.setAttribute('data-immersive-translate-walked', 'true');
        panel.setAttribute('data-immersive-translate-effect', 'excluded');
        panel.style.display = 'none';
        
        panel.innerHTML = `
            <div class="panel-header">编辑提示词</div>
            
            <div class="panel-body">
                <div class="search-row">
                    <div class="search-box">
                        ${this.icons.search}
                        <input type="text" id="tagSearchInput" placeholder="搜索标签">
                        <div class="search-dropdown" id="searchDropdown"></div>
                    </div>
                    <div class="tag-type-switch">
                        <button type="button" class="tag-type-btn active" data-tag-type="logic">逻辑</button>
                        <button type="button" class="tag-type-btn" data-tag-type="template">模板</button>
                    </div>
                </div>
                
                <div class="row-2">
                    <div class="custom-select-wrapper">
                        <div class="custom-select" id="categorySelect">
                            ${this.icons.tag}
                            <span class="select-text">一级标签</span>
                            <svg class="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        <div class="custom-dropdown" id="categoryDropdown"></div>
                    </div>
                    <div class="custom-select-wrapper">
                        <div class="custom-select disabled" id="tagSelect">
                            ${this.icons.tag}
                            <span class="select-text">二级标签</span>
                            <svg class="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        <div class="custom-dropdown" id="tagDropdown"></div>
                    </div>
                </div>
                
                <div class="tags-area">
                    <div class="tags-label">常用标签</div>
                    <div class="tags-list" id="quickTagsList"></div>
                </div>
                
                <div class="selected-area">
                    <span class="selected-label">已选中：</span>
                    <span class="selected-text" id="selectedInfo">未选择</span>
                </div>
                
                <div class="text-control-row">
                    <div class="tone-buttons">
                        <button class="tone-icon-btn active" data-tone="friendly">
                            ${this.icons.handHeart}
                            <span class="tone-icon-tooltip" data-tone-label="friendly">${this.defaultToneLabels.friendly}</span>
                        </button>
                        <button class="tone-icon-btn" data-tone="soft">
                            ${this.icons.smile}
                            <span class="tone-icon-tooltip" data-tone-label="soft">${this.defaultToneLabels.soft}</span>
                        </button>
                    </div>
                    <button class="ai-recommend-btn" id="aiRecommendBtn">
                        ${this.icons.bot}
                        AI推荐
                    </button>
                </div>
                
                <textarea class="text-area" id="customPrompt" placeholder="补充额外要求..."></textarea>
                
                <div class="btn-row">
                    <button class="preview-btn" id="previewBtn">预览</button>
                    <button class="send-btn" id="sendBtn">发送</button>
                </div>
            </div>

            <div class="prompt-preview" id="promptPreview" style="display:none;">
                <div class="preview-content" id="previewContent"></div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
        
        this.bindEvents();
        this.loadCategories();
        this.loadAllTags({ syncCategoryDropdown: true, syncCurrentCategory: true });
        this.refreshToneLabels();
        return panel;
    },
    
    show() {
        if (!this.panel) this.create();
        this.loadAllTags({ syncCategoryDropdown: true, syncCurrentCategory: true });
        this.panel.style.display = 'flex';
        this.isVisible = true;
        this.updatePosition();
        this.refreshToneLabels();
    },
    
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
            this.isVisible = false;
        }
    },
    
    toggle() {
        this.isVisible ? this.hide() : this.show();
    },
    
    updatePosition() {
        if (!this.panel) return;
        // 面板底部贴着浏览器底部，留8px间距
        this.panel.style.top = 'auto';
        this.panel.style.bottom = '8px';
    },
    
    bindEvents() {
        const self = this;
        const searchInput = this.panel.querySelector('#tagSearchInput');
        const searchDropdown = this.panel.querySelector('#searchDropdown');
        
        searchInput.addEventListener('input', (e) => { self.showSearchDropdown(e.target.value); });
        searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) { self.showSearchDropdown(searchInput.value); } });

        const typeButtons = this.panel.querySelectorAll('.tag-type-btn');
        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const nextTagType = btn.dataset.tagType || 'logic';
                typeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (self.currentTagType !== nextTagType) {
                    self.currentTagType = nextTagType;
                    self.selectedTagId = null;
                    self.selectedCategory = null;

                    const categoryText = self.panel.querySelector('#categorySelect .select-text');
                    const tagText = self.panel.querySelector('#tagSelect .select-text');
                    const selectedInfo = self.panel.querySelector('#selectedInfo');
                    const tagSelect = self.panel.querySelector('#tagSelect');
                    const tagDropdown = self.panel.querySelector('#tagDropdown');

                    if (categoryText) categoryText.textContent = '\u4e00\u7ea7\u6807\u7b7e';
                    if (tagText) tagText.textContent = '\u4e8c\u7ea7\u6807\u7b7e';
                    if (selectedInfo) selectedInfo.textContent = '\u672a\u9009\u62e9';
                    if (tagSelect) tagSelect.classList.add('disabled');
                    if (tagDropdown) tagDropdown.innerHTML = '';

                    self.loadAllTags({ syncCategoryDropdown: true, syncCurrentCategory: true });
                }

                if (searchInput.value.trim()) {
                    self.showSearchDropdown(searchInput.value);
                } else {
                    searchDropdown.classList.remove('show');
                }
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!self.panel.querySelector('.search-box').contains(e.target)) {
                searchDropdown.classList.remove('show');
            }
            // 外部点击关闭面板由 sidebar.js 的 closeAllPanels() 统一处理
        });
        
        // 一级分类自定义下拉框
        const categorySelect = this.panel.querySelector('#categorySelect');
        const categoryDropdown = this.panel.querySelector('#categoryDropdown');
        categorySelect.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!categorySelect.classList.contains('disabled')) {
                // 关闭其他下拉框
                self.panel.querySelectorAll('.custom-dropdown').forEach(d => {
                    if (d !== categoryDropdown) d.classList.remove('show');
                });
                categoryDropdown.classList.toggle('show');
            }
        });
        
        // 二级标签自定义下拉框
        const tagSelect = this.panel.querySelector('#tagSelect');
        const tagDropdown = this.panel.querySelector('#tagDropdown');
        tagSelect.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!tagSelect.classList.contains('disabled')) {
                // 关闭其他下拉框
                self.panel.querySelectorAll('.custom-dropdown').forEach(d => {
                    if (d !== tagDropdown) d.classList.remove('show');
                });
                tagDropdown.classList.toggle('show');
            }
        });
        
        const toneBtns = this.panel.querySelectorAll('.tone-icon-btn');
        toneBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toneBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                self.selectedTone = btn.getAttribute('data-tone');
            });
        });
        
        this.panel.querySelector('#previewBtn').addEventListener('click', () => { self.previewPrompt(); });
        this.panel.querySelector('#sendBtn').addEventListener('click', () => { self.generateReply(); });
        this.panel.querySelector('#aiRecommendBtn').addEventListener('click', () => { self.aiRecommendTag(); });
        this.panel.querySelector('.selected-area').addEventListener('dblclick', () => { self.clearSelection(); });
        this.bindTagsUpdatedEvent();
        this.bindStyleSettingsUpdatedEvent();
    },

    async refreshToneLabels() {
        if (!this.panel) {
            return;
        }

        const labels = {
            ...this.defaultToneLabels
        };

        if (typeof StyleSettingsService !== 'undefined' && typeof StyleSettingsService.getResolvedSettings === 'function') {
            try {
                const settings = await StyleSettingsService.getResolvedSettings();
                labels.friendly = settings?.tonePresets?.friendly?.name || labels.friendly;
                labels.soft = settings?.tonePresets?.soft?.name || labels.soft;
            } catch (error) {
                console.warn('[PromptEditor] Failed to refresh tone labels:', error);
            }
        }

        const friendlyLabel = this.panel.querySelector('.tone-icon-tooltip[data-tone-label="friendly"]');
        const softLabel = this.panel.querySelector('.tone-icon-tooltip[data-tone-label="soft"]');
        if (friendlyLabel) {
            friendlyLabel.textContent = labels.friendly;
        }
        if (softLabel) {
            softLabel.textContent = labels.soft;
        }
    },

    bindTagsUpdatedEvent() {
        if (this.tagsUpdatedListenerBound) return;
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

        this.tagsUpdatedListenerBound = true;
        window.addEventListener('helpshift:tags-updated', () => {
            this.loadAllTags({ syncCategoryDropdown: true, syncCurrentCategory: true });
        });
    },

    bindStyleSettingsUpdatedEvent() {
        if (this.styleSettingsListenerBound) return;
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

        this.styleSettingsListenerBound = true;
        window.addEventListener('helpshift:style-settings-updated', () => {
            this.refreshToneLabels();
        });
    },

    clearSelection() {
        this.selectedTagId = null;
        this.selectedCategory = null;
        this.panel.querySelector('#selectedInfo').textContent = '未选择';
        // 重置下拉框
        this.panel.querySelector('#categorySelect .select-text').textContent = '一级标签';
        this.panel.querySelector('#tagSelect .select-text').textContent = '二级标签';
        this.panel.querySelector('#tagSelect').classList.add('disabled');
        Utils.showNotification('已取消选中', 'info');
    },
    
    getVisibleTags() {
        const targetType = this.currentTagType || 'logic';
        return this.allTags.filter(tag => {
            if (!tag) return false;
            const tagType = tag.type || (tag.languages ? 'template' : 'logic');
            return tagType === targetType;
        });
    },

    showSearchDropdown(keyword) {
        const dropdown = this.panel.querySelector('#searchDropdown');
        if (!keyword.trim()) { dropdown.classList.remove('show'); return; }
        const kw = keyword.toLowerCase();
        const matches = this.getVisibleTags().filter(t => t.name.toLowerCase().includes(kw)).slice(0, 10);
        if (matches.length === 0) {
            dropdown.innerHTML = '<div class="search-dropdown-empty">未找到匹配标签</div>';
        } else {
            dropdown.innerHTML = matches.map(t => `<div class="search-dropdown-item" data-id="${t.id}">${t.category} / ${t.name}</div>`).join('');
            const self = this;
            dropdown.querySelectorAll('.search-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    self.selectTag(parseInt(item.dataset.id));
                    dropdown.classList.remove('show');
                    self.panel.querySelector('#tagSearchInput').value = '';
                });
            });
        }
        dropdown.classList.add('show');
    },
    
    async loadAllTags(options = {}) {
        const { syncCategoryDropdown = false, syncCurrentCategory = false } = options;
        if (typeof TagManager !== 'undefined' && TagManager.getTags) {
            this.allTags = await TagManager.getTags();
        } else {
            this.allTags = [];
        }

        if (!this.panel) return;

        if (syncCategoryDropdown) {
            this.loadCategories();
        }

        if (syncCurrentCategory) {
            const visibleTags = this.getVisibleTags();
            const availableCategories = new Set(visibleTags.map(t => t && t.category).filter(Boolean));

            if (this.selectedCategory && availableCategories.has(this.selectedCategory)) {
                this.loadTagsByCategory(this.selectedCategory);
            } else {
                this.selectedCategory = null;
                this.selectedTagId = null;

                const categoryText = this.panel.querySelector('#categorySelect .select-text');
                if (categoryText) {
                    categoryText.textContent = '一级标签';
                }

                this.loadTagsByCategory(null);

                const infoEl = this.panel.querySelector('#selectedInfo');
                if (infoEl) {
                    infoEl.textContent = '未选择';
                }
            }
        }

        this.loadQuickTags();
    },

    async loadCategories() {
        if (!this.panel) return;
        const dropdown = this.panel.querySelector('#categoryDropdown');
        if (!dropdown) return;

        const categories = [...new Set(this.getVisibleTags().map(t => t && t.category).filter(Boolean))];

        dropdown.innerHTML = categories.map(c =>
            `<div class="dropdown-item" data-value="${c}">${c}</div>`
        ).join('');

        const self = this;
        const categorySelect = this.panel.querySelector('#categorySelect');
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const category = item.dataset.value;
                self.selectedCategory = category;
                categorySelect.querySelector('.select-text').textContent = category;
                dropdown.classList.remove('show');
                self.loadTagsByCategory(category);
            });
        });
    },

    async loadTagsByCategory(category) {
        const dropdown = this.panel.querySelector('#tagDropdown');
        const tagSelect = this.panel.querySelector('#tagSelect');

        if (!category) {
            this.selectedCategory = null;
            tagSelect.querySelector('.select-text').textContent = '二级标签';
            tagSelect.classList.add('disabled');
            dropdown.innerHTML = '';
            return;
        }

        this.selectedCategory = category;
        const tags = this.getVisibleTags().filter(t => t.category === category);
        dropdown.innerHTML = tags.map(t =>
            `<div class="dropdown-item" data-id="${t.id}">${t.name}</div>`
        ).join('');

        if (tags.length === 0) {
            tagSelect.querySelector('.select-text').textContent = '二级标签';
            tagSelect.classList.add('disabled');
            return;
        }

        const self = this;
        tagSelect.classList.remove('disabled');
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const tagId = parseInt(item.dataset.id);
                const tagName = item.textContent;
                tagSelect.querySelector('.select-text').textContent = tagName;
                dropdown.classList.remove('show');
                self.selectTag(tagId);
            });
        });
    },

    loadQuickTags() {
        if (!this.panel) return;
        const container = this.panel.querySelector('#quickTagsList');
        if (!container) return;
        const tags = this.getVisibleTags()
            .filter(t => t.displayInQuickTag)
            .slice()
            .sort((a, b) => {
                const parseOrder = (value) => {
                    if (value === null || value === undefined) return null;
                    const raw = String(value).trim();
                    if (!raw) return null;
                    const parsed = Number(raw);
                    if (!Number.isFinite(parsed) || parsed < 0) return null;
                    return Math.floor(parsed);
                };
                const aOrder = parseOrder(a.quickTagOrder);
                const bOrder = parseOrder(b.quickTagOrder);
                const aOrderRank = aOrder === null ? Number.MAX_SAFE_INTEGER : aOrder;
                const bOrderRank = bOrder === null ? Number.MAX_SAFE_INTEGER : bOrder;
                if (aOrderRank !== bOrderRank) return aOrderRank - bOrderRank;

                const aUpdated = Date.parse(a.updatedAt || '');
                const bUpdated = Date.parse(b.updatedAt || '');
                const aUpdatedRank = Number.isNaN(aUpdated) ? Number.MIN_SAFE_INTEGER : aUpdated;
                const bUpdatedRank = Number.isNaN(bUpdated) ? Number.MIN_SAFE_INTEGER : bUpdated;
                if (aUpdatedRank !== bUpdatedRank) return bUpdatedRank - aUpdatedRank;

                const aId = Number(a.id);
                const bId = Number(b.id);
                if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
                return (a.name || '').localeCompare((b.name || ''), 'zh-CN');
            })
            .slice(0, 6);
        if (tags.length === 0) { container.innerHTML = '<span style="color:#999;font-size:11px;">暂无常用标签</span>'; return; }
        container.innerHTML = tags.map(t => `<span class="tag" data-id="${t.id}" title="${t.category} - ${t.name}"><span class="tag-text">${t.name}</span></span>`).join('');
        const self = this;
        container.querySelectorAll('.tag').forEach(tag => {
            tag.addEventListener('click', () => {
                container.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                self.selectTag(parseInt(tag.dataset.id));
            });
        });
    },
    
    async selectTag(tagId) {
        this.selectedTagId = tagId;
        console.log('[PromptEditor] selectTag 被调用, tagId:', tagId);
        console.log('[PromptEditor] this.selectedTagId 已设置为:', this.selectedTagId);
        
        const infoEl = this.panel.querySelector('#selectedInfo');
        if (!tagId) { 
            infoEl.textContent = '未选择'; 
            return; 
        }
        
        const tag = this.allTags.find(t => t.id === tagId);
        console.log('[PromptEditor] 找到的标签:', tag);
        
        if (tag) {
            this.selectedCategory = tag.category;
            const categoryText = this.panel.querySelector('#categorySelect .select-text');
            if (categoryText) {
                categoryText.textContent = tag.category;
            }
            const typeLabel = tag.type === 'logic' ? '逻辑' : '模板';
            infoEl.textContent = `${tag.category} / ${tag.name} (${typeLabel})`;
            console.log('[PromptEditor] 标签类型:', tag.type, '显示标签:', typeLabel);
        }
    },
    
    /**
     * AI推荐标签
     */
    async aiRecommendTag() {
        console.log('[AI推荐] 开始推荐标签...');
        
        // 检查会话历史
        const conversationHistory = window.conversationHistory || '';
        if (!conversationHistory || conversationHistory.trim().length < 20) {
            Utils.showNotification('请先读取会话历史', 'warning');
            return;
        }
        
        // 检查TagRecommender是否加载
        if (typeof TagRecommender === 'undefined') {
            console.error('[AI推荐] TagRecommender未加载');
            Utils.showNotification('标签推荐器未加载', 'error');
            return;
        }
        
        // 获取所有标签
        let allTags = [];
        try {
            allTags = await TagManager.getTags();
            if (!allTags || allTags.length === 0) {
                Utils.showNotification('标签列表为空', 'warning');
                return;
            }
        } catch (err) {
            console.error('[AI推荐] 获取标签失败:', err);
            Utils.showNotification('获取标签失败', 'error');
            return;
        }
        
        // 显示加载状态
        const btn = this.panel.querySelector('#aiRecommendBtn');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `${this.icons.loader} 分析中...`;
        
        try {
            // 调用AI推荐（返回单个标签对象）
            const recommendedTag = await TagRecommender.recommend(conversationHistory, allTags);
            
            // 直接选中推荐的标签
            this.selectTag(recommendedTag.id);
            // 同步分类下拉框
            this.syncCategorySelectors(recommendedTag.category, recommendedTag.id);
            
            Utils.showNotification(`✓ AI推荐: ${recommendedTag.name}`, 'success');
            console.log('[AI推荐] 推荐完成:', recommendedTag);
            
        } catch (error) {
            console.error('[AI推荐] 推荐失败:', error);
            Utils.showNotification('AI推荐失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    },
    
    /**
     * 同步更新分类下拉选择器
     * @param {string} category - 一级分类
     * @param {number} tagId - 标签ID
     */
    syncCategorySelectors(category, tagId) {
        // 更新一级分类（自定义下拉框）
        const categorySelect = this.panel.querySelector('#categorySelect');
        if (categorySelect) {
            const selectText = categorySelect.querySelector('.select-text');
            if (selectText) {
                selectText.textContent = category;
            }
            // 触发二级标签加载
            this.loadTagsByCategory(category);
        }
        
        // 更新本地选中状态
        this.selectedTagId = tagId;
        
        // 延迟更新二级标签显示（等待二级列表刷新）
        setTimeout(() => {
            const tag = this.allTags.find(t => t.id === tagId);
            if (tag) {
                const tagSelect = this.panel.querySelector('#tagSelect');
                if (tagSelect) {
                    const selectText = tagSelect.querySelector('.select-text');
                    if (selectText) {
                        selectText.textContent = tag.name;
                    }
                }
            }
        }, 100);
    },
    
    async previewPrompt() {
        const previewArea = this.panel.querySelector('#promptPreview');
        const previewContent = this.panel.querySelector('#previewContent');
        const previewBtn = this.panel.querySelector('#previewBtn');
        
        if (previewArea.style.display !== 'none') {
            previewArea.style.display = 'none';
            previewBtn.textContent = '预览';
            return;
        }
        
        const customPrompt = this.panel.querySelector('#customPrompt').value.trim();
        
        // 使用window.conversationHistory（由读取历史按钮设置）
        const conversationText = window.conversationHistory || '';
        
        let prompt = '';
        if (typeof PromptBuilder !== 'undefined') {
            try {
                prompt = await PromptBuilder.buildReplyPrompt(
                    conversationText, 
                    this.selectedTagId, 
                    this.selectedTone, 
                    customPrompt
                );
            } catch (err) {
                console.error('构建提示词失败:', err);
                alert('构建提示词失败');
                return;
            }
        } else {
            prompt = '无法加载PromptBuilder';
        }
        
        previewContent.textContent = prompt;
        previewArea.style.display = 'block';
        previewBtn.textContent = '关闭预览';
    },
    
    async generateReply() {
        console.log('[PromptEditor] generateReply 被调用');
        console.log('[PromptEditor] this.selectedTagId:', this.selectedTagId);
        console.log('[PromptEditor] this.selectedTone:', this.selectedTone);
        
        // 移除标签检查，允许不选标签直接发送
        if (typeof App !== 'undefined' && App.generateReply) {
            console.log('[PromptEditor] 调用 App.generateReply，参数:', {
                tagId: this.selectedTagId,
                tone: this.selectedTone,
                customPrompt: this.panel.querySelector('#customPrompt').value
            });
            
            await App.generateReply({
                tagId: this.selectedTagId,
                tone: this.selectedTone,
                customPrompt: this.panel.querySelector('#customPrompt').value
            });
        } else {
            console.error('[PromptEditor] App 或 App.generateReply 不存在！');
        }
    }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = PromptEditor; }