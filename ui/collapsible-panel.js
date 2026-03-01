/* ========================================
   可收起看板 - 修复版
   ======================================== */

const CollapsiblePanel = {
    panel: null,
    expandBtn: null,
    translationText: '暂无内容',
    tokenUsageText: '',
    tokenUsageTextMap: {
        reply: 'Token: N/A',
        template: 'Token: N/A',
        summary: 'Token: N/A'
    },

    create() {
        // 防止重复创建
        if (document.getElementById('collapsiblePanel')) {
            console.log('[CollapsiblePanel] 面板已存在，跳过创建');
            this.panel = document.getElementById('collapsiblePanel');
            this.expandBtn = document.getElementById('panelExpandBtn');
            return this.panel;
        }
        
        // 创建主面板，注入全局防翻译类名
        const panel = document.createElement('div');
        panel.className = 'collapsible-panel expanded notranslate';
        panel.id = 'collapsiblePanel';
        panel.setAttribute('translate', 'no'); 
        panel.setAttribute('data-immersive-translate-walked', 'true');
        panel.setAttribute('data-immersive-translate-effect', 'excluded');

        panel.innerHTML = `
            <div class="panel-content">
                <div class="panel-section">
                    <div class="section-title">AI回复原文</div>
                    <div class="section-content" id="panelOriginal">暂无内容</div>
                </div>
                <div class="panel-section">
                    <div class="section-title">中文翻译</div>
                    <div class="section-content" id="panelTranslation" style="white-space: normal;">
                        <div id="panelTranslationText" style="white-space: pre-wrap;">暂无内容</div>
                        <div id="panelTranslationUsage" style="margin-top: 8px; color: #666; font-size: 11px; white-space: normal;"></div>
                    </div>
                </div>
                <div class="panel-section">
                    <div class="section-title">会话历史</div>
                    <div class="section-content" id="panelHistory">暂无历史记录</div>
                </div>
            </div>
            <button class="panel-collapse-btn" id="panelCollapseBtn">▲ 收起</button>
        `;

        // 创建独立的展开按钮
        const tokenBoard = document.createElement('div');
        tokenBoard.className = 'panel-token-board';
        tokenBoard.innerHTML = `
            <div class="panel-token-row">
                <span class="panel-token-label">Reply</span>
                <span class="panel-token-value" id="panelTokenUsageReply">Token: N/A</span>
            </div>
            <div class="panel-token-row">
                <span class="panel-token-label">Template</span>
                <span class="panel-token-value" id="panelTokenUsageTemplate">Token: N/A</span>
            </div>
            <div class="panel-token-row">
                <span class="panel-token-label">Summary</span>
                <span class="panel-token-value" id="panelTokenUsageSummary">Token: N/A</span>
            </div>
        `;
        const collapseBtn = panel.querySelector('#panelCollapseBtn');
        if (collapseBtn) {
            collapseBtn.before(tokenBoard);
        }

        const expandBtn = document.createElement('button');
        expandBtn.className = 'panel-expand-btn notranslate';
        expandBtn.id = 'panelExpandBtn';
        expandBtn.setAttribute('translate', 'no');
        expandBtn.setAttribute('data-immersive-translate-walked', 'true');
        expandBtn.setAttribute('data-immersive-translate-effect', 'excluded');
        expandBtn.innerHTML = '▼ 展开';

        document.body.appendChild(panel);
        document.body.appendChild(expandBtn);
        
        this.panel = panel;
        this.expandBtn = expandBtn;
        
        this.bindEvents();
        
        this._renderTokenUsageBoard();
        return panel;
    },

    bindEvents() {
        // 收起
        this.panel.querySelector('#panelCollapseBtn').addEventListener('click', () => {
            this.panel.classList.remove('expanded');
            this.panel.classList.add('collapsed');
        });

        // 展开
        this.expandBtn.addEventListener('click', () => {
            this.panel.classList.remove('collapsed');
            this.panel.classList.add('expanded');
        });

        // 核心对接：监听侧边栏读取历史的操作
        // 假设侧边栏逻辑在读取完成后会触发 window 事件或直接调用本对象
    },

    updateOriginal(text) {
        const el = document.getElementById('panelOriginal');
        if (el) el.textContent = text || '暂无内容';
    },

    updateTranslation(text) {
        this.translationText = text || '暂无内容';
        this._renderTranslationSection();
    },

    updateTokenUsage(usage) {
        this.updateScenarioTokenUsage('reply', usage);
    },

    updateScenarioTokenUsage(scene, usage) {
        if (scene === 'reply') {
            this.tokenUsageTextMap.reply = this._formatTokenUsage(usage) || 'Token: N/A';
        } else if (scene === 'template') {
            this.tokenUsageTextMap.template = this._formatTokenUsage(usage) || 'Token: N/A';
        } else if (scene === 'summary') {
            this.tokenUsageTextMap.summary = this._formatTokenUsage(usage) || 'Token: N/A';
        } else {
            return;
        }

        this._renderTokenUsageBoard();
    },

    _renderTokenUsageBoard() {
        const replyEl = document.getElementById('panelTokenUsageReply');
        const templateEl = document.getElementById('panelTokenUsageTemplate');
        const summaryEl = document.getElementById('panelTokenUsageSummary');

        if (replyEl) replyEl.textContent = this.tokenUsageTextMap.reply;
        if (templateEl) templateEl.textContent = this.tokenUsageTextMap.template;
        if (summaryEl) summaryEl.textContent = this.tokenUsageTextMap.summary;
    },

    _renderTranslationSection() {
        const textEl = document.getElementById('panelTranslationText');
        const usageEl = document.getElementById('panelTranslationUsage');
        if (!textEl || !usageEl) return;

        textEl.textContent = this.translationText || '暂无内容';
        usageEl.textContent = this.tokenUsageText || '';
    },

    _formatTokenUsage(usage) {
        if (!usage || typeof usage !== 'object') return '';

        const hasAnyToken = (usage.inputTokens !== null && usage.inputTokens !== undefined)
            || (usage.outputTokens !== null && usage.outputTokens !== undefined)
            || (usage.totalTokens !== null && usage.totalTokens !== undefined);

        if (!hasAnyToken) return '';

        const input = usage.inputTokens ?? 'N/A';
        const output = usage.outputTokens ?? 'N/A';
        const extra = usage.extraTokens ?? 'N/A';
        const total = usage.totalTokens ?? 'N/A';
        return `Token: up ${input}, down ${output}, extra ${extra}, total ${total}`;
    },

    /**
     * 更新会话历史
     * @param {string|Array} data - 支持侧边栏读取的字符串或数组
     */
    updateHistory(data) {
        const container = document.getElementById('panelHistory');
        if (!container) return;
        
        if (!data || (Array.isArray(data) && data.length === 0)) {
            container.innerHTML = '<div class="section-empty">暂无历史记录</div>';
            return;
        }

        // 如果是侧边栏传来的已格式化字符串
        if (typeof data === 'string') {
            container.textContent = data; // 直接填入，保持 white-space 换行
        } else if (Array.isArray(data)) {
            // 如果是原始数组，进行格式化显示
            container.innerHTML = data.map(item => `
                <div style="margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:4px;">
                    <strong style="color:#000;">${item.role === 'user' ? '问' : '答'}:</strong>
                    <div style="color:#444; font-size:11px;">${this.escapeHtml(item.content)}</div>
                </div>
            `).join('');
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// 初始化逻辑
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CollapsiblePanel.create());
} else {
    CollapsiblePanel.create();
}

// 全局挂载，方便 sidebar.js 调用
window.CollapsiblePanel = CollapsiblePanel;