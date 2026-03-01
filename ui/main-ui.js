// ========================================
// UI模块入口
// 初始化所有UI组件
// ========================================

const UI = {
    /**
     * 初始化UI
     */
    init() {
        // 注入所有CSS样式
        this.injectStyles();
        
        // 创建侧边栏
        if (typeof Sidebar !== 'undefined') {
            Sidebar.create();
        }
        
        console.log('✅ UI模块初始化完成');
    },
    
    /**
     * 注入CSS样式
     * Chrome扩展中CSS通过manifest.json的css数组自动注入
     * 这个方法作为备用，用于动态加载场景
     */
    injectStyles() {
        // CSS 通过 manifest.json 注入，这里不需要额外处理
    },
    
    /**
     * 刷新标签选择器（供外部调用）
     */
    async refreshAllTags() {
        if (typeof PromptEditor !== 'undefined' && PromptEditor.loadQuickTags) {
            await PromptEditor.loadQuickTags();
        }
    }
};
