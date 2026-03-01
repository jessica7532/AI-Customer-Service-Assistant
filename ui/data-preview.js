/* ========================================
   数据提取预览弹窗 - 逻辑（带三面拉伸）
   ======================================== */

const DataPreviewPanel = {
    panel: null,
    isVisible: false,
    data: [],
    
    // 拉伸相关
    isResizing: false,
    resizeType: null,
    resizeStartX: 0,
    resizeStartY: 0,
    startWidth: 0,
    startHeight: 0,
    startLeft: 0,
    startTop: 0,
    justResized: false, // 标记是否刚完成拉伸
    
    // 最小尺寸
    minWidth: 600,
    minHeight: 400,

    // 创建弹窗HTML
    create() {
        const panel = document.createElement('div');
        panel.className = 'data-preview-panel notranslate';
        panel.style.display = 'none';
        panel.setAttribute('translate', 'no');
        panel.setAttribute('data-immersive-translate-walked', 'true');
        panel.setAttribute('data-immersive-translate-effect', 'excluded');
        panel.setAttribute('data-no-translation', '1');
        panel.innerHTML = `
            <!-- 拉伸手柄 - 左侧 -->
            <div class="resize-handle resize-handle-left"></div>
            
            <!-- 拉伸手柄 - 底部 -->
            <div class="resize-handle resize-handle-bottom"></div>
            
            <!-- 拉伸手柄 - 左下角 -->
            <div class="resize-handle resize-handle-corner"></div>
            
            <div class="data-preview-header">
                <span class="header-title">数据提取预览</span>
                <button class="header-clear-btn" id="clearDataBtn" title="清空所有数据">清空</button>
            </div>
            <div class="data-preview-body">
                <table class="data-table" id="dataTable">
                    <thead id="dataTableHead">
                        <!-- 动态渲染 -->
                    </thead>
                    <tbody id="dataTableBody">
                        <!-- 数据行将在这里动态插入 -->
                    </tbody>
                </table>
                <div class="empty-state" id="emptyState" style="display:none;">
                    <i data-lucide="inbox"></i>
                    <span>暂无数据</span>
                </div>
            </div>
            <div class="data-preview-footer">
                <button class="footer-btn" id="deleteSelectedBtn">删除选中</button>
                <button class="footer-btn" id="manageCatBtn">管理分类</button>
                <button class="footer-btn" id="panelFieldsBtn" title="设置面板显示字段">字段</button>
                <div style="flex:1;"></div>
                <button class="footer-btn" id="exportSettingsBtn" title="设置导出格式">设置</button>
                <button class="footer-btn primary" id="exportDataBtn">导出</button>
            </div>

            <!-- 分类管理 overlay -->
            <div class="cat-manage-overlay notranslate" id="catManageOverlay" style="display:none;" translate="no" data-immersive-translate-effect="excluded" data-no-translation="1">
                <div class="cat-manage-inner">
                    <div class="cat-manage-header">
                        <span class="cat-manage-title">管理分类</span>
                    </div>
                    <div class="cat-manage-body" id="catManageBody">
                        <!-- 动态渲染 -->
                    </div>
                    <div class="cat-manage-footer">
                        <button class="footer-btn" id="catImportBtn" type="button">导入</button>
                        <button class="footer-btn" id="catExportBtn" type="button">导出</button>
                        <div style="flex:1;"></div>
                        <button class="footer-btn primary" id="catManageCloseBtn" type="button">关闭</button>
                    </div>
                </div>
            </div>

            <!-- 导出设置 overlay -->
            <div class="export-settings-overlay notranslate" id="exportSettingsOverlay" style="display:none;" translate="no" data-immersive-translate-effect="excluded" data-no-translation="1">
                <div class="cat-manage-inner">
                    <div class="cat-manage-header">
                        <span class="cat-manage-title">导出格式设置</span>
                    </div>
                    <div class="cat-manage-body" id="exportSettingsBody">
                        <!-- 动态渲染 -->
                    </div>
                    <div class="cat-manage-footer">
                        <button class="footer-btn" id="exportSettingsResetBtn" type="button">恢复默认</button>
                        <div style="flex:1;"></div>
                        <button class="footer-btn primary" id="exportSettingsCloseBtn" type="button">关闭</button>
                    </div>
                </div>
            </div>

            <!-- 面板字段设置 overlay -->
            <div class="export-settings-overlay notranslate" id="panelFieldsOverlay" style="display:none;" translate="no" data-immersive-translate-effect="excluded" data-no-translation="1">
                <div class="cat-manage-inner">
                    <div class="cat-manage-header">
                        <span class="cat-manage-title">面板字段设置</span>
                    </div>
                    <div class="cat-manage-body" id="panelFieldsBody">
                        <!-- 动态渲染 -->
                    </div>
                    <div class="cat-manage-footer">
                        <button class="footer-btn" id="panelFieldsResetBtn" type="button">恢复默认</button>
                        <div style="flex:1;"></div>
                        <button class="footer-btn primary" id="panelFieldsCloseBtn" type="button">关闭</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;

        // 初始化图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        this.bindEvents();
        return panel;
    },

    // 绑定事件
    bindEvents() {
        const self = this;
        
        // 清空按钮
        const clearBtn = this.panel.querySelector('#clearDataBtn');
        clearBtn.addEventListener('click', () => self.clearData());

        // 删除选中按钮
        const deleteBtn = this.panel.querySelector('#deleteSelectedBtn');
        deleteBtn.addEventListener('click', () => self.deleteSelected());

        // 导出按钮
        const exportBtn = this.panel.querySelector('#exportDataBtn');
        exportBtn.addEventListener('click', () => self.exportData());

        // 管理分类按钮
        const manageCatBtn = this.panel.querySelector('#manageCatBtn');
        manageCatBtn.addEventListener('click', () => self.showCatManageOverlay());

        // 导出设置按钮
        const exportSettingsBtn = this.panel.querySelector('#exportSettingsBtn');
        exportSettingsBtn.addEventListener('click', () => self.showExportSettingsOverlay());

        // 导出设置关闭
        const exportSettingsCloseBtn = this.panel.querySelector('#exportSettingsCloseBtn');
        exportSettingsCloseBtn.addEventListener('click', () => self.hideExportSettingsOverlay());

        // 导出设置恢复默认
        const exportSettingsResetBtn = this.panel.querySelector('#exportSettingsResetBtn');
        exportSettingsResetBtn.addEventListener('click', () => self.resetExportSettings());

        // 面板字段设置按钮
        const panelFieldsBtn = this.panel.querySelector('#panelFieldsBtn');
        panelFieldsBtn.addEventListener('click', () => self.showPanelFieldsOverlay());

        // 面板字段设置关闭
        const panelFieldsCloseBtn = this.panel.querySelector('#panelFieldsCloseBtn');
        panelFieldsCloseBtn.addEventListener('click', () => self.hidePanelFieldsOverlay());

        // 面板字段设置恢复默认
        const panelFieldsResetBtn = this.panel.querySelector('#panelFieldsResetBtn');
        panelFieldsResetBtn.addEventListener('click', () => self.resetPanelFields());

        // 分类管理关闭
        const catCloseBtn = this.panel.querySelector('#catManageCloseBtn');
        catCloseBtn.addEventListener('click', () => self.hideCatManageOverlay());

        // 导入分类
        const catImportBtn = this.panel.querySelector('#catImportBtn');
        catImportBtn.addEventListener('click', () => self.importCategories());

        // 导出分类
        const catExportBtn = this.panel.querySelector('#catExportBtn');
        catExportBtn.addEventListener('click', () => self.exportCategories());

        // 拉伸功能
        const leftHandle = this.panel.querySelector('.resize-handle-left');
        const bottomHandle = this.panel.querySelector('.resize-handle-bottom');
        const cornerHandle = this.panel.querySelector('.resize-handle-corner');
        
        leftHandle.addEventListener('mousedown', (e) => self.startResize(e, 'left'));
        bottomHandle.addEventListener('mousedown', (e) => self.startResize(e, 'bottom'));
        cornerHandle.addEventListener('mousedown', (e) => self.startResize(e, 'corner'));

        // 全局事件
        document.addEventListener('mousemove', (e) => {
            if (self.isResizing) {
                self.resize(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            self.stopResize();
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && self.isVisible) {
                self.hide();
            }
        });
    },

    // 开始拉伸
    startResize(e, type) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isResizing = true;
        this.resizeType = type;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        
        const rect = this.panel.getBoundingClientRect();
        this.startWidth = rect.width;
        this.startHeight = rect.height;
        this.startLeft = rect.left;
        this.startTop = rect.top;
        
        document.body.style.cursor = type === 'left' ? 'ew-resize' : 
                                    type === 'bottom' ? 'ns-resize' : 
                                    'nesw-resize';
        document.body.style.userSelect = 'none';
    },
    
    // 拉伸中
    resize(e) {
        if (!this.isResizing) return;
        
        const deltaX = e.clientX - this.resizeStartX;
        const deltaY = e.clientY - this.resizeStartY;
        const maxHeight = window.innerHeight - this.panel.getBoundingClientRect().top;
        
        if (this.resizeType === 'left') {
            const newWidth = this.startWidth - deltaX;
            const newLeft = this.startLeft + deltaX;
            if (newWidth >= this.minWidth && newLeft >= 70) {
                this.panel.style.width = newWidth + 'px';
                this.panel.style.left = newLeft + 'px';
                this.panel.style.right = 'auto';
            }
        } else if (this.resizeType === 'bottom') {
            const newHeight = Math.min(this.startHeight + deltaY, maxHeight);
            if (newHeight >= this.minHeight) {
                this.panel.style.height = newHeight + 'px';
            }
        } else if (this.resizeType === 'corner') {
            const newWidth = this.startWidth - deltaX;
            const newLeft = this.startLeft + deltaX;
            const newHeight = Math.min(this.startHeight + deltaY, maxHeight);
            
            if (newWidth >= this.minWidth && newLeft >= 70) {
                this.panel.style.width = newWidth + 'px';
                this.panel.style.left = newLeft + 'px';
                this.panel.style.right = 'auto';
            }
            
            if (newHeight >= this.minHeight) {
                this.panel.style.height = newHeight + 'px';
            }
        }
    },
    
    // 停止拉伸
    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeType = null;
            this.justResized = true; // 标记刚完成拉伸，防止触发click关闭
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // 保存位置和尺寸
            this.savePosition();
        }
    },

    // 显示弹窗
    show(data) {
        if (!this.panel) this.create();
        if (data) {
            this.setData(data);
        }
        this.panel.style.display = 'flex';
        this.isVisible = true;
        
        // 恢复上次保存的位置和尺寸
        this.restorePosition();
    },
    
    // 恢复位置和尺寸
    restorePosition() {
        try {
            const saved = localStorage.getItem('dataPreviewPanel_position');
            if (saved) {
                const position = JSON.parse(saved);
                if (position.width) this.panel.style.width = position.width;
                if (position.height) this.panel.style.height = position.height;
                if (position.left) {
                    this.panel.style.left = position.left;
                    this.panel.style.right = 'auto';
                }
                if (position.top) this.panel.style.top = position.top;
            }

            // 边界安全校验：确保标题栏始终在可视区域内可抓取
            requestAnimationFrame(() => {
                const rect = this.panel.getBoundingClientRect();
                let needFix = false;

                // 顶部不能超出视口（至少露出标题栏）
                if (rect.top < 0) {
                    this.panel.style.top = '0px';
                    needFix = true;
                }
                // 左侧不能完全跑出去（至少露出100px）
                if (rect.right < 100) {
                    this.panel.style.left = '0px';
                    this.panel.style.right = 'auto';
                    needFix = true;
                }
                // 右侧不能完全跑出去
                if (rect.left > window.innerWidth - 100) {
                    this.panel.style.left = '';
                    this.panel.style.right = '60px';
                    needFix = true;
                }
                // 底部不能完全跑出去（至少露出标题栏40px）
                if (rect.top > window.innerHeight - 40) {
                    this.panel.style.top = (window.innerHeight - 200) + 'px';
                    needFix = true;
                }

                if (needFix) this.savePosition();
            });
        } catch (err) {
            console.error('恢复面板位置失败:', err);
        }
    },
    
    // 保存位置和尺寸
    savePosition() {
        try {
            const position = {
                width: this.panel.style.width,
                height: this.panel.style.height,
                left: this.panel.style.left,
                top: this.panel.style.top
            };
            localStorage.setItem('dataPreviewPanel_position', JSON.stringify(position));
        } catch (err) {
            console.error('保存面板位置失败:', err);
        }
    },

    // 隐藏弹窗
    hide() {
        if (this.justResized) {
            this.justResized = false;
            return;
        }
        if (this.panel) {
            this.panel.style.display = 'none';
            this.isVisible = false;
        }
    },

    // 切换显示/隐藏
    toggle() {
        this.isVisible ? this.hide() : this.show();
    },

    // 设置数据
    setData(data) {
        this.data = data;
        this.renderTable();
    },

    // 渲染表格
    async renderTable() {
        const thead = this.panel.querySelector('#dataTableHead');
        const tbody = this.panel.querySelector('#dataTableBody');
        const emptyState = this.panel.querySelector('#emptyState');

        // 获取当前可见字段
        const visibleFields = EXTRACTOR_CONFIG.getVisibleFields();

        // ── 渲染表头 ──
        thead.innerHTML = `<tr>
            <th class="col-select"><input type="checkbox" id="selectAllCheckbox" title="全选/取消全选"></th>
            <th>#</th>
            ${visibleFields.map(f => `<th class="${f.cssClass}">${f.label}</th>`).join('')}
        </tr>`;

        // ── 渲染数据行 ──
        tbody.innerHTML = '';

        if (!this.data || this.data.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        // 获取分类配置
        const categories = await this.getTagCategories();

        this.data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = index;
            
            let cellsHtml = `
                <td class="col-select"><input type="checkbox" class="row-checkbox" data-index="${index}"></td>
                <td title="${index + 1}">${index + 1}</td>`;

            for (const f of visibleFields) {
                const value = row[f.label] || '';
                const escaped = this.escapeHtml(value);

                if (f.categoryType === 'category1') {
                    cellsHtml += `<td class="${f.cssClass} editable-cell" data-field="${f.label}" data-index="${index}">
                        ${this.renderCategorySelect('category1', value, categories, index)}
                    </td>`;
                } else if (f.categoryType === 'category2') {
                    cellsHtml += `<td class="${f.cssClass} editable-cell" data-field="${f.label}" data-index="${index}">
                        ${this.renderCategorySelect('category2', value, categories, index, row['一级分类'])}
                    </td>`;
                } else if (f.key === 'link') {
                    cellsHtml += `<td class="${f.cssClass}" title="${escaped}"><span translate="no" class="notranslate">${this.renderLink(value)}</span></td>`;
                } else if (f.key === 'screenshot') {
                    cellsHtml += `<td class="${f.cssClass}" title="${escaped}"><span translate="no" class="notranslate">${this.renderScreenshot(value)}</span></td>`;
                } else if (f.editable || f.custom) {
                    cellsHtml += `<td class="${f.cssClass} editable-cell" data-field="${f.label}" data-index="${index}" title="${escaped}"><span translate="no" class="notranslate">${escaped}</span></td>`;
                } else {
                    cellsHtml += `<td class="${f.cssClass}" title="${escaped}"><span translate="no" class="notranslate">${escaped}</span></td>`;
                }
            }

            tr.innerHTML = cellsHtml;
            tbody.appendChild(tr);
        });

        // 绑定可编辑单元格事件
        this.bindEditableCellEvents();
        // 绑定分类选择器事件
        this.bindCategorySelectors();
        // 绑定选择框事件
        this.bindCheckboxEvents();
    },

    // 获取标签分类（一级分类和二级分类）
    async getTagCategories() {
        if (typeof ExtractorCategories !== 'undefined') {
            return await ExtractorCategories.load();
        }
        // fallback
        if (typeof EXTRACTOR_CONFIG !== 'undefined') {
            return EXTRACTOR_CONFIG.categories || {};
        }
        return {};
    },

    // 渲染分类下拉选择器
    renderCategorySelect(type, currentValue, categories, rowIndex, parentCategory = null) {
        if (type === 'category1') {
            // 一级分类：EXTRACTOR_CONFIG.categories的所有key
            const category1List = Object.keys(categories);
            
            const options = category1List.map(cat => 
                `<option value="${this.escapeHtml(cat)}" translate="no" ${cat === currentValue ? 'selected' : ''}>${this.escapeHtml(cat)}</option>`
            ).join('');
            
            return `<select class="category-select category1-select notranslate" translate="no" data-index="${rowIndex}">
                <option value="" translate="no">选择一级分类</option>
                ${options}
            </select>`;
        } else {
            // 二级分类：categories[parentCategory]数组中的值
            const category2List = parentCategory && categories[parentCategory] ? 
                categories[parentCategory] : 
                [];
            
            const options = category2List.map(cat => 
                `<option value="${this.escapeHtml(cat)}" translate="no" ${cat === currentValue ? 'selected' : ''}>${this.escapeHtml(cat)}</option>`
            ).join('');
            
            return `<select class="category-select category2-select notranslate" translate="no" data-index="${rowIndex}" ${!parentCategory ? 'disabled' : ''}>
                <option value="" translate="no">选择二级分类</option>
                ${options}
            </select>`;
        }
    },

    // 绑定分类选择器事件
    bindCategorySelectors() {
        const category1Selects = this.panel.querySelectorAll('.category1-select');
        const category2Selects = this.panel.querySelectorAll('.category2-select');
        
        // 一级分类改变时，更新二级分类选项
        category1Selects.forEach(select => {
            select.addEventListener('change', async (e) => {
                const index = parseInt(e.target.dataset.index);
                const newValue = e.target.value;
                
                // 更新数据
                this.data[index]['一级分类'] = newValue;
                this.data[index]['二级分类'] = ''; // 清空二级分类
                
                // 保存到storage
                await this.saveData();
                
                // 重新渲染表格以更新二级分类选项
                await this.renderTable();
            });
        });
        
        // 二级分类改变时，保存数据
        category2Selects.forEach(select => {
            select.addEventListener('change', async (e) => {
                const index = parseInt(e.target.dataset.index);
                const newValue = e.target.value;
                
                // 更新数据
                this.data[index]['二级分类'] = newValue;
                
                // 保存到storage
                await this.saveData();
            });
        });
    },

    // 绑定可编辑单元格事件（方案回复、反馈内容简述、反馈内容）
    bindEditableCellEvents() {
        const editableCells = this.panel.querySelectorAll('.editable-cell:not(.col-category)');
        
        editableCells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止冒泡到document，防止误触发面板关闭
                // 如果已经在编辑状态，不重复处理
                if (cell.querySelector('textarea')) return;
                
                const field = cell.dataset.field;
                const index = parseInt(cell.dataset.index);
                const currentValue = this.data[index][field] || '';
                
                // 创建textarea
                const textarea = document.createElement('textarea');
                textarea.className = 'cell-editor';
                textarea.value = currentValue;
                textarea.style.width = '100%';
                textarea.style.minHeight = '60px';
                textarea.style.border = '1px solid #000';
                textarea.style.padding = '4px';
                textarea.style.fontSize = '11px';
                textarea.style.fontFamily = 'inherit';
                
                // 清空单元格并插入textarea
                cell.innerHTML = '';
                cell.appendChild(textarea);
                textarea.focus();
                textarea.select();
                
                // 失焦时保存
                textarea.addEventListener('blur', async () => {
                    const newValue = textarea.value;
                    this.data[index][field] = newValue;
                    
                    // 保存到storage
                    await this.saveData();
                    
                    // 恢复显示
                    cell.innerHTML = `<span translate="no" class="notranslate">${newValue}</span>`;
                    cell.title = newValue;
                });
                
                // 按Escape取消编辑
                textarea.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        cell.innerHTML = `<span translate="no" class="notranslate">${currentValue}</span>`;
                        cell.title = currentValue;
                    }
                });
            });
        });
    },

    // 保存数据到storage
    async saveData() {
        if (typeof ExtractorStorage === 'undefined') {
            console.error('ExtractorStorage未定义');
            return;
        }
        
        try {
            // 将中文字段名转回英文字段名
            const convertedData = this.data.map(record => EXTRACTOR_CONFIG.toStorageRecord(record));
            
            // 保存到storage
            await ExtractorStorage.save(convertedData);
            
            console.log('[数据预览] 数据已保存');
        } catch (err) {
            console.error('[数据预览] 保存失败:', err);
        }
    },

    renderScreenshot(url) {
        if (!url) return '-';
        return `<a class="screenshot-link" href="${this.escapeHtml(url)}" target="_blank">查看</a>`;
    },

    renderLink(url) {
        if (!url) return '-';
        // 直接显示链接文本，不换行，从右侧开始显示
        return this.escapeHtml(url);
    },

    // ========== 分类管理 Overlay ==========

    async showCatManageOverlay() {
        const overlay = this.panel.querySelector('#catManageOverlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        await this.renderCatManageBody();
    },

    hideCatManageOverlay() {
        const overlay = this.panel.querySelector('#catManageOverlay');
        if (overlay) overlay.style.display = 'none';
        // 关闭后刷新表格（分类可能已变）
        this.renderTable();
    },

    async renderCatManageBody() {
        const body = this.panel.querySelector('#catManageBody');
        if (!body) return;

        const categories = await this.getTagCategories();
        const cat1Keys = Object.keys(categories);

        let html = '';

        // 添加一级分类
        html += `
            <div class="cat-add-row">
                <input type="text" class="cat-add-input" id="newCat1Input" placeholder="输入新一级分类名称">
                <button class="cat-add-btn" id="addCat1Btn" type="button">添加</button>
            </div>
        `;

        if (cat1Keys.length === 0) {
            html += `<div class="cat-empty">暂无分类，请添加</div>`;
        }

        // 每个一级分类
        for (const cat1 of cat1Keys) {
            const cat2List = categories[cat1] || [];

            html += `
                <div class="cat-group" data-cat1="${this.escapeHtml(cat1)}">
                    <div class="cat-group-header">
                        <span class="cat-group-name">${this.escapeHtml(cat1)}</span>
                        <span class="cat-group-count">${cat2List.length}</span>
                        <button class="cat-delete-btn" data-cat1="${this.escapeHtml(cat1)}" title="删除该一级分类" type="button">删除</button>
                    </div>
                    <div class="cat-group-items">
            `;

            for (const cat2 of cat2List) {
                html += `
                    <div class="cat-item">
                        <span class="cat-item-name">${this.escapeHtml(cat2)}</span>
                        <button class="cat-item-delete" data-cat1="${this.escapeHtml(cat1)}" data-cat2="${this.escapeHtml(cat2)}" title="删除" type="button">×</button>
                    </div>
                `;
            }

            html += `
                        <div class="cat-add-sub-row">
                            <input type="text" class="cat-add-sub-input" data-cat1="${this.escapeHtml(cat1)}" placeholder="添加二级分类">
                            <button class="cat-add-sub-btn" data-cat1="${this.escapeHtml(cat1)}" type="button">+</button>
                        </div>
                    </div>
                </div>
            `;
        }

        body.innerHTML = html;
        this.bindCatManageEvents();
    },

    bindCatManageEvents() {
        const body = this.panel.querySelector('#catManageBody');
        if (!body) return;

        // 添加一级分类
        const addCat1Btn = body.querySelector('#addCat1Btn');
        const newCat1Input = body.querySelector('#newCat1Input');
        if (addCat1Btn && newCat1Input) {
            const doAdd = async () => {
                const name = newCat1Input.value.trim();
                if (!name) { newCat1Input.focus(); return; }
                try {
                    await ExtractorCategories.addCategory1(name);
                    await this.renderCatManageBody();
                    Utils?.showNotification?.(`已添加一级分类：${name}`, 'success');
                } catch (e) {
                    Utils?.showNotification?.(e.message, 'error');
                }
            };
            addCat1Btn.addEventListener('click', doAdd);
            newCat1Input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
        }

        // 删除一级分类
        body.querySelectorAll('.cat-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cat1 = btn.dataset.cat1;
                if (!confirm(`确定删除一级分类"${cat1}"及其所有二级分类吗？`)) return;
                try {
                    await ExtractorCategories.deleteCategory1(cat1);
                    await this.renderCatManageBody();
                    Utils?.showNotification?.(`已删除：${cat1}`, 'success');
                } catch (e) {
                    Utils?.showNotification?.(e.message, 'error');
                }
            });
        });

        // 删除二级分类
        body.querySelectorAll('.cat-item-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cat1 = btn.dataset.cat1;
                const cat2 = btn.dataset.cat2;
                try {
                    await ExtractorCategories.deleteCategory2(cat1, cat2);
                    await this.renderCatManageBody();
                } catch (e) {
                    Utils?.showNotification?.(e.message, 'error');
                }
            });
        });

        // 添加二级分类
        body.querySelectorAll('.cat-add-sub-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cat1 = btn.dataset.cat1;
                const input = body.querySelector(`.cat-add-sub-input[data-cat1="${cat1}"]`);
                const name = input?.value?.trim();
                if (!name) { input?.focus(); return; }
                try {
                    await ExtractorCategories.addCategory2(cat1, name);
                    await this.renderCatManageBody();
                } catch (e) {
                    Utils?.showNotification?.(e.message, 'error');
                }
            });
        });

        // 二级分类输入框回车
        body.querySelectorAll('.cat-add-sub-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const cat1 = input.dataset.cat1;
                    const btn = body.querySelector(`.cat-add-sub-btn[data-cat1="${cat1}"]`);
                    btn?.click();
                }
            });
        });
    },

    async exportCategories() {
        try {
            const categories = await ExtractorCategories.load();
            const blob = new Blob([JSON.stringify(categories, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `分类配置_${this.getTimestamp()}.json`;
            link.click();
            URL.revokeObjectURL(url);
            Utils?.showNotification?.('分类已导出', 'success');
        } catch (e) {
            Utils?.showNotification?.('导出失败: ' + e.message, 'error');
        }
    },

    async importCategories() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // 校验格式: { string: string[] }
                if (!data || typeof data !== 'object' || Array.isArray(data)) {
                    throw new Error('格式不正确，需要 { "一级分类": ["二级分类", ...] }');
                }
                for (const [k, v] of Object.entries(data)) {
                    if (!Array.isArray(v)) throw new Error(`"${k}" 的值必须是数组`);
                    if (v.some(item => typeof item !== 'string')) throw new Error(`"${k}" 数组中包含非字符串元素`);
                }

                // 写入存储
                await ExtractorCategories._save(data);
                await this.renderCatManageBody();
                Utils?.showNotification?.('分类已导入', 'success');
            } catch (err) {
                Utils?.showNotification?.('导入失败: ' + err.message, 'error');
            }
        };
        input.click();
    },

    // ========== 面板设置 Overlay ==========

    EXPORT_SETTINGS_KEY: 'helpshift_export_settings_v1',

    /** 获取导出设置 */
    getExportSettings() {
        try {
            const saved = localStorage.getItem(this.EXPORT_SETTINGS_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) { /* ignore */ }
        return EXTRACTOR_CONFIG.fields.map(f => ({ key: f.key, label: f.label, enabled: true }));
    },

    saveExportSettings(settings) {
        localStorage.setItem(this.EXPORT_SETTINGS_KEY, JSON.stringify(settings));
    },

    /** 同步面板字段变更到导出设置（新增/删除自定义字段时） */
    syncExportSettings() {
        const panelFields = EXTRACTOR_CONFIG.getPanelFields();
        const exportSettings = this.getExportSettings();
        const existingLabels = new Set(exportSettings.map(e => e.label));

        // 追加面板中新增的自定义字段
        for (const pf of panelFields) {
            if (pf.custom && !existingLabels.has(pf.label)) {
                exportSettings.push({ key: pf.label, label: pf.label, enabled: true, custom: true });
            }
        }

        // 移除面板中已删除的自定义字段
        const panelLabels = new Set(panelFields.map(pf => pf.label));
        const filtered = exportSettings.filter(e => !e.custom || panelLabels.has(e.label));

        this.saveExportSettings(filtered);
    },

    showExportSettingsOverlay() {
        const overlay = this.panel.querySelector('#exportSettingsOverlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        this.renderExportSettingsBody();
    },

    hideExportSettingsOverlay() {
        const overlay = this.panel.querySelector('#exportSettingsOverlay');
        if (overlay) overlay.style.display = 'none';
    },

    resetExportSettings() {
        if (!confirm('确定恢复为默认导出格式吗？')) return;
        localStorage.removeItem(this.EXPORT_SETTINGS_KEY);
        this.renderExportSettingsBody();
        Utils?.showNotification?.('已恢复默认导出格式', 'success');
    },

    renderExportSettingsBody() {
        const body = this.panel.querySelector('#exportSettingsBody');
        if (!body) return;

        const settings = this.getExportSettings();

        let html = `<div class="export-hint">拖拽调整导出列顺序，取消勾选可排除该列</div>`;
        html += `<div class="export-field-list" id="exportFieldList">`;

        settings.forEach((item, index) => {
            html += `
                <div class="export-field-item" draggable="true" data-index="${index}">
                    <span class="export-field-drag">☰</span>
                    <label class="export-field-label">
                        <input type="checkbox" class="export-field-check" data-index="${index}" ${item.enabled ? 'checked' : ''}>
                        <span>${this.escapeHtml(item.label)}</span>
                    </label>
                </div>`;
        });

        html += `</div>`;
        body.innerHTML = html;
        this.bindExportSettingsEvents(settings);
    },

    bindExportSettingsEvents(settings) {
        const list = this.panel.querySelector('#exportFieldList');
        if (!list) return;

        list.querySelectorAll('.export-field-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const idx = parseInt(cb.dataset.index);
                settings[idx].enabled = cb.checked;
                this.saveExportSettings(settings);
            });
        });

        let dragIdx = null;
        list.querySelectorAll('.export-field-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                dragIdx = parseInt(item.dataset.index);
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                dragIdx = null;
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (dragIdx !== null && dragIdx !== parseInt(e.currentTarget.dataset.index)) {
                    e.currentTarget.classList.add('drag-over');
                }
            });
            item.addEventListener('dragleave', (e) => {
                e.currentTarget.classList.remove('drag-over');
            });
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');
                const targetIdx = parseInt(e.currentTarget.dataset.index);
                if (dragIdx === null || dragIdx === targetIdx) return;
                const [moved] = settings.splice(dragIdx, 1);
                settings.splice(targetIdx, 0, moved);
                this.saveExportSettings(settings);
                this.renderExportSettingsBody();
            });
        });
    },

    // ========== 面板字段设置 Overlay ==========

    showPanelFieldsOverlay() {
        const overlay = this.panel.querySelector('#panelFieldsOverlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        this.renderPanelFieldsBody();
    },

    hidePanelFieldsOverlay() {
        const overlay = this.panel.querySelector('#panelFieldsOverlay');
        if (overlay) overlay.style.display = 'none';
        // 关闭后刷新表格
        this.renderTable();
    },

    resetPanelFields() {
        if (!confirm('确定恢复为默认字段配置吗？自定义字段将被删除。')) return;
        localStorage.removeItem(EXTRACTOR_CONFIG.PANEL_FIELDS_KEY);
        this.syncExportSettings();
        this.renderPanelFieldsBody();
        Utils?.showNotification?.('已恢复默认字段配置', 'success');
    },

    renderPanelFieldsBody() {
        const body = this.panel.querySelector('#panelFieldsBody');
        if (!body) return;

        const settings = EXTRACTOR_CONFIG.getPanelFields();

        let html = `<div class="export-hint">拖拽调整显示顺序，取消勾选隐藏该列。隐藏「反馈内容简述」将不再调用AI总结。</div>`;

        // 新增自定义字段输入
        html += `<div class="cat-add-row">
            <input type="text" class="cat-add-input" id="newCustomFieldInput" placeholder="输入新字段名称">
            <button class="cat-add-btn" id="addCustomFieldBtn" type="button">添加</button>
        </div>`;

        html += `<div class="export-field-list" id="panelFieldList">`;

        // 构建内置字段的 deletable 查找表
        const builtinDeletable = {};
        for (const f of EXTRACTOR_CONFIG.fields) {
            if (f.deletable) builtinDeletable[f.key] = true;
        }

        settings.forEach((item, index) => {
            const isCustom = !!item.custom;
            const isDeletable = isCustom || builtinDeletable[item.key];
            html += `
                <div class="export-field-item" draggable="true" data-index="${index}">
                    <span class="export-field-drag">☰</span>
                    <label class="export-field-label">
                        <input type="checkbox" class="panel-field-check" data-index="${index}" ${item.visible ? 'checked' : ''}>
                        <span>${this.escapeHtml(item.label)}</span>
                    </label>
                    ${isDeletable ? `<button class="cat-item-delete panel-field-delete" data-index="${index}" title="删除字段" type="button">×</button>` : ''}
                </div>`;
        });

        html += `</div>`;
        body.innerHTML = html;
        this.bindPanelFieldsEvents(settings);
    },

    bindPanelFieldsEvents(settings) {
        const body = this.panel.querySelector('#panelFieldsBody');
        if (!body) return;

        // 添加自定义字段
        const addBtn = body.querySelector('#addCustomFieldBtn');
        const addInput = body.querySelector('#newCustomFieldInput');
        if (addBtn && addInput) {
            const doAdd = () => {
                const name = addInput.value.trim();
                if (!name) { addInput.focus(); return; }
                // 检查重名
                const exists = settings.some(s => s.label === name);
                if (exists) {
                    Utils?.showNotification?.(`字段「${name}」已存在`, 'warning');
                    return;
                }
                settings.push({ key: name, label: name, visible: true, custom: true });
                EXTRACTOR_CONFIG.savePanelFields(settings);
                this.syncExportSettings();
                this.renderPanelFieldsBody();
                Utils?.showNotification?.(`已添加字段「${name}」`, 'success');
            };
            addBtn.addEventListener('click', doAdd);
            addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });
        }

        // 删除字段（自定义或可删除的内置字段）
        body.querySelectorAll('.panel-field-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                const label = settings[idx].label;
                if (!confirm(`确定删除字段「${label}」吗？`)) return;
                settings.splice(idx, 1);
                EXTRACTOR_CONFIG.savePanelFields(settings);
                this.syncExportSettings();
                this.renderPanelFieldsBody();
            });
        });

        // checkbox 显示/隐藏
        const list = body.querySelector('#panelFieldList');
        if (!list) return;

        list.querySelectorAll('.panel-field-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const idx = parseInt(cb.dataset.index);
                settings[idx].visible = cb.checked;
                EXTRACTOR_CONFIG.savePanelFields(settings);
            });
        });

        // 拖拽排序
        let dragIdx = null;
        list.querySelectorAll('.export-field-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                dragIdx = parseInt(item.dataset.index);
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                dragIdx = null;
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (dragIdx !== null && dragIdx !== parseInt(e.currentTarget.dataset.index)) {
                    e.currentTarget.classList.add('drag-over');
                }
            });
            item.addEventListener('dragleave', (e) => {
                e.currentTarget.classList.remove('drag-over');
            });
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');
                const targetIdx = parseInt(e.currentTarget.dataset.index);
                if (dragIdx === null || dragIdx === targetIdx) return;
                const [moved] = settings.splice(dragIdx, 1);
                settings.splice(targetIdx, 0, moved);
                EXTRACTOR_CONFIG.savePanelFields(settings);
                this.renderPanelFieldsBody();
            });
        });
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    async clearData() {
        if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
            // 清空面板中的数据
            this.data = [];
            this.renderTable();
            
            // 清空历史存储
            if (typeof ExtractorStorage !== 'undefined') {
                try {
                    await ExtractorStorage.clear();
                    console.log('✅ 已清空历史存储');
                } catch (err) {
                    console.error('清空历史存储失败:', err);
                }
            }
        }
    },

    exportData() {
        if (!this.data || this.data.length === 0) {
            alert('没有数据可导出');
            return;
        }

        try {
            // 读取导出设置，只导出 enabled 的列，按用户排序
            const settings = this.getExportSettings();
            const enabledFields = settings.filter(s => s.enabled);

            if (enabledFields.length === 0) {
                alert('没有选择任何导出列，请在设置中勾选');
                return;
            }

            const headers = enabledFields.map(s => s.label);

            let csvContent = '\uFEFF';
            csvContent += headers.join(',') + '\n';

            this.data.forEach(row => {
                const rowData = enabledFields.map(s => row[s.label] || '');

                const csvRow = rowData.map(field => {
                    const fieldStr = String(field);
                    if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
                        return '"' + fieldStr.replace(/"/g, '""') + '"';
                    }
                    return fieldStr;
                });

                csvContent += csvRow.join(',') + '\n';
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `数据提取_${this.getTimestamp()}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败，请重试');
        }
    },

    getTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hour}${minute}${second}`;
    },

    addData(rowData) {
        this.data.push(rowData);
        this.renderTable();
    },

    addBatchData(dataArray) {
        this.data.push(...dataArray);
        this.renderTable();
    },

    /**
     * 绑定选择框事件
     */
    bindCheckboxEvents() {
        // 全选checkbox
        const selectAllCheckbox = this.panel.querySelector('#selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = this.panel.querySelectorAll('.row-checkbox');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
            });
        }

        // 单个checkbox（更新全选状态）
        const rowCheckboxes = this.panel.querySelectorAll('.row-checkbox');
        rowCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const allCheckboxes = this.panel.querySelectorAll('.row-checkbox');
                const checkedCount = Array.from(allCheckboxes).filter(c => c.checked).length;
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = checkedCount === allCheckboxes.length;
                    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
                }
            });
        });
    },

    /**
     * 删除选中的记录
     */
    async deleteSelected() {
        // 获取选中的checkbox
        const checkedBoxes = Array.from(this.panel.querySelectorAll('.row-checkbox:checked'));
        
        if (checkedBoxes.length === 0) {
            Utils.showNotification('请先选择要删除的记录', 'warning');
            return;
        }

        // 二次确认
        const confirmed = confirm(`确定要删除选中的 ${checkedBoxes.length} 条记录吗？\n\n此操作不可撤销！`);
        if (!confirmed) return;

        try {
            // 获取要删除的索引（从大到小排序，避免删除时索引错乱）
            const indices = checkedBoxes
                .map(cb => parseInt(cb.dataset.index))
                .sort((a, b) => b - a);

            // 从data中删除（倒序删除）
            indices.forEach(index => {
                this.data.splice(index, 1);
            });

            // 保存到storage
            await this.saveData();

            // 重新渲染
            await this.renderTable();

            Utils.showNotification(`✓ 已删除 ${indices.length} 条记录`, 'success');
        } catch (error) {
            console.error('删除失败:', error);
            Utils.showNotification('删除失败，请重试', 'error');
        }
    }
};

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DataPreviewPanel.create());
} else {
    DataPreviewPanel.create();
}