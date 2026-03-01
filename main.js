// ========================================
// 应用入口文件
// ========================================

(function() {
    'use strict';

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    async function initApp() {
        try {
            console.log('🚀 Helpshift AI助手开始初始化...');
            
            // 检查插件是否启用
            const result = await chrome.storage.local.get(['extensionEnabled']);
            const enabled = result.extensionEnabled !== false; // 默认开启
            
            if (!enabled) {
                console.log('⏸️ 插件已禁用');
                return;
            }

            // 初始化应用
            await App.init();
            
            // 监听插件开关消息
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.action === 'toggleExtension') {
                    if (message.enabled) {
                        // 重新初始化
                        location.reload();
                    } else {
                        // 移除所有UI元素
                        document.getElementById('ai-main-panel')?.remove();
                        document.getElementById('ai-prompt-editor')?.remove();
                        document.getElementById('ai-prompt-float-btn')?.remove();
                        document.getElementById('extractor-panel')?.remove();
                        document.getElementById('extractor-mini-panel')?.remove();
                        document.querySelector('.extractor-buttons')?.remove();
                    }
                }
            });

            console.log('✅ Helpshift AI助手初始化完成');
        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
        }
    }
})();