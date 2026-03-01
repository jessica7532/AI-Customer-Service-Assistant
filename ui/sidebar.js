// ========================================
// 侧边栏主框架
// ========================================

const Sidebar = {
    /**
     * 创建侧边栏
     */
    create() {
        const sidebar = document.createElement('div');
        sidebar.id = 'ai-sidebar';
        sidebar.setAttribute('translate', 'no');
        sidebar.classList.add('notranslate');
        sidebar.setAttribute('data-immersive-translate-walked', 'true');
        sidebar.setAttribute('data-immersive-translate-effect', 'excluded');
        
        // 功能按钮配置
        const buttons = [
            // ---- top group ----
            {
                id: 'tag-manager-btn',
                icon: 'tags',
                label: '标签管理',
                group: 'top'
            },
            {
                id: 'template-picker-btn',
                icon: 'cpu',
                label: '模型选择',
                group: 'top'
            },
            {
                id: 'api-settings-btn',
                icon: 'globe-lock',
                label: 'API 密钥设置',
                group: 'top'
            },
            {
                id: 'style-settings-btn',
                icon: 'scan-face',
                label: '风格自定义',
                group: 'top'
            },
            // ---- bottom group（4个按钮向下挪了2格） ----
            {
                id: 'data-preview-btn',
                icon: 'table',
                label: '数据提取预览',
                group: 'bottom'
            },
            {
                id: 'data-extract-btn',
                icon: 'database-backup',
                label: '提取数据',
                group: 'bottom'
            },
            {
                id: 'history-btn',
                icon: 'history',
                label: '读取会话历史\n左键读取，右键设置条数',
                group: 'bottom'
            },
            {
                id: 'prompt-editor-btn',
                icon: 'pen-line',
                label: '编辑提示词',
                filled: true,
                group: 'bottom'
            }
        ];
        
        // 分为top和bottom两组按钮
        const topButtons = buttons.filter(btn => btn.group === 'top');
        const bottomButtons = buttons.filter(btn => btn.group === 'bottom');
        
        const createButtonHTML = (btn) => {
            const svgIcons = {
                'tags': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>',
                'cpu': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>',
                'download': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
                'table': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
                'database-backup': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>',
                'history': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
                'pen-line': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
                'shield-user': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M14 19.5a9.16 9.16 0 0 0 2-5.5V8.3a28 28 0 0 1-4-1.8 27 27 0 0 1-4 1.8V14a9.16 9.16 0 0 0 2 5.5"/><circle cx="12" cy="11" r="1"/></svg>',
                'globe-lock': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15.686 15A14.5 14.5 0 0 1 12 22a14.5 14.5 0 0 1 0-20 10 10 0 1 0 9.542 13"/><path d="M2 12h8.5"/><path d="M20 6V4a2 2 0 1 0-4 0v2"/><rect x="14" y="6" width="8" height="5" rx="1"/></svg>',
                'smile': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
                'scan-face': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg>'
            };
            
            // 为history按钮添加角标
            if (btn.id === 'history-btn') {
                const savedCount = localStorage.getItem('helpshift_history_count') || '5';
                return `
                <button 
                    class="sidebar-btn ${btn.filled ? 'filled' : ''}" 
                    id="${btn.id}"
                    data-tooltip="${btn.label}"
                >
                    ${svgIcons[btn.icon] || ''}
                    <span class="history-badge" id="history-badge">${savedCount}</span>
                </button>
            `;
            }
            
            return `
            <button 
                class="sidebar-btn ${btn.filled ? 'filled' : ''}" 
                id="${btn.id}"
                data-tooltip="${btn.label}"
            >
                ${svgIcons[btn.icon] || ''}
            </button>
        `;
        };
        
        sidebar.innerHTML = `
            <div class="sidebar-buttons-top">
                ${topButtons.map(createButtonHTML).join('')}
            </div>
            <div class="sidebar-buttons-bottom">
                ${bottomButtons.map(createButtonHTML).join('')}
            </div>
        `;
        
        document.body.appendChild(sidebar);
        
        // 调整页面布局，给侧边栏留出空间
        this.adjustPageLayout();
        
        // 绑定事件
        this.bindEvents(sidebar);
        
        return sidebar;
    },
    
    /**
     * 调整页面布局，为侧边栏留出空间
     */
    adjustPageLayout() {
        // 创建一个style标签，注入全局样式
        const styleId = 'ai-sidebar-layout-fix';
        
        // 检查是否已经注入过
        if (document.getElementById(styleId)) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* 为AI助手侧边栏调整Helpshift页面布局 */
            
            /* 调整主容器 */
            .hs-page__react-base {
                margin-right: 48px !important;
                width: calc(100% - 48px) !important;
                max-width: calc(100vw - 48px) !important;
                box-sizing: border-box !important;
            }
            
            /* 确保body不会溢出 */
            body {
                overflow-x: hidden !important;
                max-width: 100vw !important;
            }
            
            /* 确保html不会有横向滚动条 */
            html {
                overflow-x: hidden !important;
            }
        `;
        
        document.head.appendChild(style);
        console.log('✅ 已注入Helpshift侧边栏布局调整样式');
    },
    
    /**
     * 绑定事件
     */
    bindEvents(sidebar) {
        const buttons = sidebar.querySelectorAll('.sidebar-btn');
        
        buttons.forEach(btn => {
            // 特殊处理history按钮：左键读取，右键打开菜单
            if (btn.id === 'history-btn') {
                // 左键点击：直接读取历史
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleHistoryLoad();
                });
                
                // 右键点击：打开菜单设置条数
                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof HistoryMenu !== 'undefined') {
                        HistoryMenu.toggle();
                    }
                });
            } else {
                // 其他按钮
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const btnId = e.currentTarget.id;
                    this.handleButtonClick(btnId);
                });
            }
            
            // 鼠标悬停显示tooltip
            btn.addEventListener('mouseenter', (e) => {
                const tooltip = e.currentTarget.getAttribute('data-tooltip');
                this.showTooltip(e.currentTarget, tooltip);
            });
            
            btn.addEventListener('mouseleave', (e) => {
                this.hideTooltip();
            });
        });
        
        // 阻止侧边栏上所有 click/pointerdown 冒泡到 Helpshift 页面
        // 防止 Helpshift 平台自身的 click handler 关闭 issue 面板
        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
            // 点击非按钮的空白区域，关闭所有面板
            if (!e.target.closest('.sidebar-btn')) {
                this.closeAllPanels();
            }
        });
        sidebar.addEventListener('pointerdown',   (e) => e.stopPropagation());
        sidebar.addEventListener('pointerup',     (e) => e.stopPropagation());
        sidebar.addEventListener('mousedown',     (e) => e.stopPropagation());
        sidebar.addEventListener('mouseup',       (e) => e.stopPropagation());
        sidebar.addEventListener('touchstart',    (e) => e.stopPropagation());
        sidebar.addEventListener('touchend',      (e) => e.stopPropagation());
    },
    
    /**
     * 关闭所有面板（唯一统一入口，各面板不再自行监听外部点击）
     * @param {string} [except] - 不关闭的面板对应的按钮ID
     */
    closeAllPanels(except) {
        const panelMap = {
            'tag-manager-btn':     () => typeof TagManagerUI !== 'undefined' && TagManagerUI.hide?.(),
            'template-picker-btn': () => typeof ModelSelectorMenu !== 'undefined' && ModelSelectorMenu.hide?.(),
            'api-settings-btn':    () => typeof ApiSettingsPanel !== 'undefined' && ApiSettingsPanel.hide?.(),
            'style-settings-btn':  () => typeof StyleSettingsPanel !== 'undefined' && StyleSettingsPanel.hide?.(),
            'data-preview-btn':    () => typeof DataPreviewPanel !== 'undefined' && DataPreviewPanel.hide?.(),
            'prompt-editor-btn':   () => typeof PromptEditor !== 'undefined' && PromptEditor.hide?.(),
            'history-menu':        () => typeof HistoryMenu !== 'undefined' && HistoryMenu.hide?.(),
        };

        for (const [btnId, hideFn] of Object.entries(panelMap)) {
            if (btnId !== except) {
                hideFn();
            }
        }
    },
    
    /**
     * 处理按钮点击
     */
    handleButtonClick(btnId) {
        console.log('点击按钮:', btnId);
        
        // 数据提取按钮：不关闭任何面板，只执行提取
        if (btnId === 'data-extract-btn') {
            this.handleDataExtract();
            return;
        }

        // 其他按钮：先关闭除自身以外的所有面板，再 toggle 自己
        this.closeAllPanels(btnId);

        switch(btnId) {
            case 'tag-manager-btn':
                if (typeof TagManagerUI !== 'undefined') {
                    TagManagerUI.toggle();
                }
                break;
            case 'template-picker-btn':
                if (typeof ModelSelectorMenu !== 'undefined') {
                    const btn = document.getElementById('template-picker-btn');
                    ModelSelectorMenu.toggle(btn);
                }
                break;
            case 'api-settings-btn':
                if (typeof ApiSettingsPanel !== 'undefined') {
                    const btn = document.getElementById('api-settings-btn');
                    ApiSettingsPanel.toggle(btn);
                }
                break;
            case 'style-settings-btn':
                if (typeof StyleSettingsPanel !== 'undefined') {
                    const btn = document.getElementById('style-settings-btn');
                    StyleSettingsPanel.toggle(btn);
                }
                break;
            case 'data-preview-btn':
                this.handleDataPreview();
                break;
            case 'prompt-editor-btn':
                if (typeof PromptEditor !== 'undefined') {
                    PromptEditor.toggle();
                }
                break;
        }
    },
    
    /**
     * 处理历史记录读取（左键）
     */
    handleHistoryLoad() {
        // 检查Issue是否打开
        if (!window.isIssuePageOpen) {
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification('请先在左侧列表中点击打开一个 Issue', 'warning');
            } else {
                alert('请先在左侧列表中点击打开一个 Issue');
            }
            return;
        }
        
        // 从localStorage读取上次设置的条数
        const count = parseInt(localStorage.getItem('helpshift_history_count') || '5');
        
        // 调用Utils.loadConversationHistory读取历史
        if (typeof Utils !== 'undefined' && Utils.loadConversationHistory) {
            try {
                const history = Utils.loadConversationHistory(count);
                
                // 保存到全局变量，供PromptBuilder使用
                window.conversationHistory = history || '';

                // 【核心对接】同步更新到可收起看板的“会话历史”区域
            if (window.CollapsiblePanel && typeof window.CollapsiblePanel.updateHistory === 'function') {
                window.CollapsiblePanel.updateHistory(history);
            }
                
                if (typeof Utils.showNotification !== 'undefined') {
                    Utils.showNotification(`已读取${count}条历史记录`, 'success');
                }
            } catch (err) {
                console.error('读取历史失败:', err);
                if (typeof Utils.showNotification !== 'undefined') {
                    Utils.showNotification('读取历史失败', 'error');
                }
            }
        } else {
            console.error('Utils.loadConversationHistory未定义');
            alert('历史记录功能未加载');
        }
    },
    
    /**
     * 显示Tooltip
     */
    showTooltip(button, text) {
        // 移除现有tooltip
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'sidebar-tooltip';
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
        
        // 计算位置（在按钮左侧）
        const rect = button.getBoundingClientRect();
        tooltip.style.top = rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2) + 'px';
        tooltip.style.right = (window.innerWidth - rect.left + 8) + 'px';
        
        // 添加显示动画
        setTimeout(() => tooltip.classList.add('show'), 10);
    },
    
    /**
     * 隐藏Tooltip
     */
    hideTooltip() {
        const tooltip = document.querySelector('.sidebar-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    },
    
    /**
     * 处理数据提取
     */
    /**
 * 处理数据提取（调试安全版）
 */
async handleDataExtract() {

    // 检查Issue是否已打开
    if (!window.isIssuePageOpen) {
        Utils?.showNotification?.('请先在左侧列表中点击打开一个 Issue', 'warning');
        return;
    }

    try {
        // ⓪ 如果会话历史为空，先即时读取一次
        if (!window.conversationHistory || window.conversationHistory.trim().length < 20) {
            console.log('[提取] 会话历史为空，先即时读取...');
            const savedCount = localStorage.getItem('helpshift_history_count') || '15';
            const count = parseInt(savedCount);
            const history = Utils?.loadConversationHistory?.(count) || '';
            window.conversationHistory = history;
            if (typeof CollapsiblePanel !== 'undefined' && CollapsiblePanel.updateHistory) {
                CollapsiblePanel.updateHistory(history);
            }
        }

        Utils?.showNotification?.('开始提取数据...', 'info');

        if (typeof DataExtractor === 'undefined') {
            throw new Error('DataExtractor 未定义');
        }

        // ① 提取数据
        const extractedData = await DataExtractor.extractIssueData();
        console.log('[提取] 数据已提取:', extractedData);

        // ② 保存数据
        if (typeof ExtractorStorage !== 'undefined') {
            await ExtractorStorage.add(extractedData);
        }

        Utils?.showNotification?.('✓ 数据已提取', 'success');

        // ③ ⭐ 延迟调用 AI 总结（关键）
        setTimeout(() => {
            try {
                if (window.ExtractorEvents?.callAISummarizer) {
                    console.log('[提取] 准备调用 AI 总结');
                    window.ExtractorEvents.callAISummarizer(extractedData);
                } else {
                    console.warn('[提取] callAISummarizer 不存在');
                }
            } catch (e) {
                console.error('[提取] AI 总结调用失败（已保护）', e);
            }
        }, 500);

        // ④ 刷新预览面板（如果有）
        if (typeof DataPreviewPanel !== 'undefined' && DataPreviewPanel.isVisible) {
            await this.refreshPreviewPanel();
        }

    } catch (err) {
        console.error('提取失败:', err);
        Utils?.showNotification?.('数据提取失败，请重试', 'error');
    }
},

    
    /**
     * 刷新预览面板数据
     */
    async refreshPreviewPanel() {
        if (typeof ExtractorStorage === 'undefined' || typeof DataPreviewPanel === 'undefined') {
            return;
        }
        
        try {
            const savedData = await ExtractorStorage.load();
            if (savedData && savedData.length > 0) {
                DataPreviewPanel.setData(EXTRACTOR_CONFIG.toDisplayRecords(savedData));
                console.log('✅ 预览面板已刷新');
            }
        } catch (err) {
            console.error('刷新预览面板失败:', err);
        }
    },
    
    /**
     * 处理数据预览
     */
    async handleDataPreview() {
        if (typeof DataPreviewPanel === 'undefined') {
            console.error('DataPreviewPanel未定义');
            alert('预览面板未加载');
            return;
        }
        
        // 如果面板已显示，则隐藏
        if (DataPreviewPanel.isVisible) {
            DataPreviewPanel.hide();
            return;
        }
        
        if (typeof ExtractorStorage === 'undefined') {
            console.error('ExtractorStorage未定义');
            alert('存储服务未加载');
            return;
        }
        
        try {
            // 从ExtractorStorage加载已保存的数据
            const savedData = await ExtractorStorage.load();
            
            // 如果没有任何数据
            if (!savedData || savedData.length === 0) {
                if (typeof Utils !== 'undefined' && Utils.showNotification) {
                    Utils.showNotification('还没有数据，请先提取数据', 'info');
                } else {
                    alert('还没有数据，请先提取数据');
                }
                return;
            }
            
            // 转换数据格式：从英文字段名转为中文字段名
            const convertedData = EXTRACTOR_CONFIG.toDisplayRecords(savedData);

            // 兼容旧缓存：如果存在 left 定位，会导致面板贴左显示
            try {
                const rawPosition = localStorage.getItem('dataPreviewPanel_position');
                if (rawPosition) {
                    const position = JSON.parse(rawPosition);
                    if (position && typeof position === 'object' && position.left) {
                        delete position.left;
                        localStorage.setItem('dataPreviewPanel_position', JSON.stringify(position));
                    }
                }
            } catch (e) {
                console.warn('清理预览面板定位缓存失败:', e);
            }
            
            // 显示DataPreviewPanel
            DataPreviewPanel.show(convertedData);
            
        } catch (err) {
            console.error('加载数据失败:', err);
            if (typeof Utils !== 'undefined' && Utils.showNotification) {
                Utils.showNotification('加载数据失败', 'error');
            } else {
                alert('加载数据失败');
            }
        }
    },
    
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sidebar;
}