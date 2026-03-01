// ========================================
// 读取会话历史组件
// ========================================

const HistoryMenu = {
    panel: null,
    isVisible: false,
    
    create() {
        const panel = document.createElement('div');
        panel.id = 'history-menu-panel';
        panel.className = 'history-menu-panel notranslate';
        panel.setAttribute('translate', 'no');
        panel.setAttribute('data-immersive-translate-walked', 'true');
        panel.setAttribute('data-immersive-translate-effect', 'excluded');
        panel.style.display = 'none';
        
        // 生成结构：固定标题 + 可滚动列表
        let items = '';
        for (let i = 1; i <= 15; i++) {
            items += `<div class="menu-item" data-value="${i}">${i}</div>`;
        }

        panel.innerHTML = `
            <div class="history-menu-title">读取条数</div>
            <div class="history-menu-list">${items}</div>
        `;
        
        document.body.appendChild(panel);
        this.panel = panel;
        
        this.bindEvents();
        return panel;
    },
    
    show() {
        if (!this.panel) this.create();
        this.panel.style.display = 'flex';
        this.isVisible = true;
        this.updatePosition();
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
        const historyBtn = document.getElementById('history-btn');
        if (!historyBtn || !this.panel) return;

        const rect = historyBtn.getBoundingClientRect();
        const panelMaxHeight = 320; // 与 CSS max-height 保持一致
        const gap = 4;              // 按钮与菜单间距
        const viewportHeight = window.innerHeight;

        // 判断下方空间是否充足
        const spaceBelow = viewportHeight - rect.top;
        if (spaceBelow >= panelMaxHeight + gap) {
            // 空间足够：顶部对齐按钮顶部，往下展开
            this.panel.style.top = rect.top + 'px';
            this.panel.style.bottom = 'auto';
        } else {
            // 空间不足：底部对齐按钮底部，往上展开
            const fromBottom = viewportHeight - rect.bottom;
            this.panel.style.bottom = fromBottom + gap + 'px';
            this.panel.style.top = 'auto';
        }
    },
    
    bindEvents() {
        const items = this.panel.querySelectorAll('.menu-item');
        const self = this;
        
        items.forEach(item => {
            item.addEventListener('click', () => {
                const count = parseInt(item.getAttribute('data-value'));
                
                // 保存选择的条数到localStorage
                localStorage.setItem('helpshift_history_count', count.toString());
                
                // 更新侧边栏角标
                const badge = document.getElementById('history-badge');
                if (badge) {
                    badge.textContent = count;
                }
                
                // 关闭菜单
                self.hide();
                
                // 显示通知
                if (typeof Utils !== 'undefined' && Utils.showNotification) {
                    Utils.showNotification(`已设置读取${count}条历史记录`, 'success');
                }
                
                console.log('已设置历史记录条数:', count);
            });
        });
        
        // 点击外部关闭面板
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.panel.contains(e.target) && !e.target.closest('#ai-sidebar')) {
                this.hide();
            }
        });
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryMenu;
}