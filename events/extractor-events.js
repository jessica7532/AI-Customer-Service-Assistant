// ========================================
// 数据提取器事件模块
// ========================================
console.log('🔥 extractor-events.js 已加载');

const ExtractorEvents = {
    /**
     * 初始化所有事件
     */
    init() {
        this.monitorIssuePanel();
    },

    /**
     * 监听Issue面板状态
     */
    monitorIssuePanel() {
        // 记录当前Issue的标识（用于检测Issue切换）
        let currentIssueId = null;
        
        const checkIssuePanel = () => {
            // 方式1：检测侧边弹出面板（从列表点击）
            const conversationTab = document.querySelector(EXTRACTOR_CONFIG.selectors.conversationTab);
            const metadataTab = document.querySelector(EXTRACTOR_CONFIG.selectors.metadataTab);
            const isPanelOpen = conversationTab && metadataTab;
            
            // 方式2：检测直接打开的Issue页面（URL: /admin/issue/XXX/）
            const isDirectIssuePage = window.location.pathname.includes('/admin/issue/') && 
                                     document.querySelector('.hs-msg__wrapper'); // 确保消息已加载
            
            // 只要任一方式检测到Issue页面即可
            const isIssuePageActive = isPanelOpen || isDirectIssuePage;
            
            // 获取当前Issue的标识
            // 优先使用permalink，如果没有则从URL提取
            let newIssueId = null;
            const issueLinkEl = document.querySelector(EXTRACTOR_CONFIG.selectors.issueLink);
            if (issueLinkEl) {
                newIssueId = issueLinkEl.href || issueLinkEl.textContent;
            } else if (isDirectIssuePage) {
                // 从URL提取Issue ID
                const match = window.location.pathname.match(/\/admin\/issue\/(\d+)/);
                newIssueId = match ? match[1] : null;
            }
            
            // 检测是否是新Issue（页面打开且Issue ID变化）
            const isNewIssue = isIssuePageActive && newIssueId && newIssueId !== currentIssueId;
            
            if (isIssuePageActive !== window.isIssuePageOpen) {
                window.isIssuePageOpen = isIssuePageActive;
                
                // 更新查看数据按钮的状态
                const viewBtn = document.getElementById('extractor-view-btn');
                if (viewBtn) viewBtn.disabled = !isIssuePageActive;
                
                // 更新提取数据按钮的样式状态（不用disabled属性，否则click事件不触发）
                const extractBtn = document.getElementById('data-extract-btn');
                if (extractBtn) {
                    extractBtn.classList.toggle('btn-disabled', !isIssuePageActive);
                }
                
                // 调试信息
                console.log('Issue页面状态:', isIssuePageActive ? '已打开' : '已关闭');
                console.log('检测方式:', isPanelOpen ? '侧边面板' : (isDirectIssuePage ? '直接打开' : '未知'));
                console.log('按钮状态:', isIssuePageActive ? '可用' : '禁用');
            }
            
            // 当检测到新Issue时，立即清空旧历史，延迟1.5秒自动读取新会话历史
            if (isNewIssue) {
                console.log('检测到新Issue:', newIssueId);
                
                // 立即清空旧历史，防止误用上一个case的数据
                window.conversationHistory = '';
                
                // 更新当前Issue ID
                currentIssueId = newIssueId;
                
                // 取消上一次的延迟读取（如果有）
                if (this._autoReadTimer) {
                    clearTimeout(this._autoReadTimer);
                }
                
                console.log('1.5秒后自动读取会话历史...');
                this._autoReadTimer = setTimeout(() => {
                    // 再次确认Issue仍然打开，且是同一个Issue
                    const currentLinkEl = document.querySelector(EXTRACTOR_CONFIG.selectors.issueLink);
                    const currentId = currentLinkEl ? currentLinkEl.href || currentLinkEl.textContent : null;
                    
                    if (!window.isIssuePageOpen || currentId !== currentIssueId) {
                        console.log('Issue已变化或关闭，取消自动读取');
                        return;
                    }
                    
                    // 获取用户设置的读取数量
                    const savedCount = localStorage.getItem('helpshift_history_count') || '15';
                    const count = parseInt(savedCount);
                    
                    console.log('自动读取会话历史，数量:', count);
                    const history = Utils.loadConversationHistory(count);
                    
                    // 更新文本框
                    const selectedTextArea = document.getElementById('selected-text');
                    if (selectedTextArea) {
                        selectedTextArea.value = history || '';
                    }
                    
                    // 同步更新到全局变量
                    window.conversationHistory = history || '';
                    
                    // 同步更新CollapsiblePanel的会话历史区域
                    if (typeof CollapsiblePanel !== 'undefined' && CollapsiblePanel.updateHistory) {
                        CollapsiblePanel.updateHistory(history);
                    }
                }, 1500);
            }
        };
        
        // 初始检查
        checkIssuePanel();
        
        // 对于直接打开的Issue页面，添加延迟检查（因为消息可能还在加载）
        if (window.location.pathname.includes('/admin/issue/')) {
            setTimeout(() => {
                console.log('[Issue检测] 延迟2秒再次检查（针对直接打开的Issue页面）');
                checkIssuePanel();
            }, 2000);
        }
        
        // 监听DOM变化
        const observer = new MutationObserver(checkIssuePanel);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    },

    /**
     * 调用AI自动总结反馈
     * @param {Object} record - 当前提取的记录
     */
    async callAISummarizer(record) {
    console.log('[AI总结] 安全模式启动');

    // 保险 1：record 不存在直接退出
    if (!record) {
        console.warn('[AI总结] record 不存在，跳过');
        return;
    }

    // 保险 2：总结器不存在直接退出
    if (typeof FeedbackSummarizer === 'undefined') {
        console.warn('[AI总结] FeedbackSummarizer 未加载，跳过');
        return;
    }

    // 保险 3：会话历史没有就别跑
    const conversationHistory = window.conversationHistory || '';
    if (!conversationHistory || conversationHistory.length < 20) {
        console.warn('[AI总结] 会话历史不足，跳过');
        Utils?.showNotification?.('会话历史为空，已跳过AI总结。请先读取历史或等待自动读取完成', 'warning');
        return;
    }

    // 保险 4：用户隐藏了"反馈内容简述"字段，跳过AI总结
    if (typeof EXTRACTOR_CONFIG !== 'undefined' && !EXTRACTOR_CONFIG.isSummaryVisible()) {
        console.log('[AI总结] 用户已隐藏"反馈内容简述"字段，跳过AI总结');
        return;
    }

    try {
        console.log('[AI总结] 开始调用 summarize');

        const result = await FeedbackSummarizer.summarize(
            conversationHistory,
            (typeof ExtractorCategories !== 'undefined')
                ? await ExtractorCategories.load()
                : (EXTRACTOR_CONFIG?.categories || {})
        );

        if (!result) {
            console.log('[AI总结] 未配置总结模型，跳过');
            return;
        }

        record.category1 = result.category1 || record.category1;
        record.category2 = result.category2 || record.category2;
        record.summary   = result.summary   || record.summary;
        record.content   = result.content   || record.content;

        // 🔄 将 AI 结果写回存储（更新最后一条，不是添加新的）
        if (typeof ExtractorStorage !== 'undefined' && ExtractorStorage.updateLast) {
            try {
                await ExtractorStorage.updateLast(record);
                console.log('[AI总结] 已更新存储中的最后一条记录');
            } catch (e) {
                console.warn('[AI总结] 更新存储失败（已忽略）', e);
            }
        }

        // 🔄 如果数据预览面板已打开，刷新显示
        if (typeof DataPreviewPanel !== 'undefined' && DataPreviewPanel.isVisible) {
            try {
                const allData = await ExtractorStorage.load();
                DataPreviewPanel.setData(EXTRACTOR_CONFIG.toDisplayRecords(allData));
                console.log('[AI总结] 已刷新数据预览面板');
            } catch (e) {
                console.warn('[AI总结] 刷新预览面板失败（已忽略）', e);
            }
        }

        Utils.showNotification('✓ AI分析完成', 'success');
        console.log('[AI总结] 完成');

    } catch (err) {
        console.error('[AI总结] 出错但已被吞掉:', err);
        Utils.showNotification('AI 自动总结失败（但界面没死）', 'warning');
    }
    
}

    
};
window.ExtractorEvents = ExtractorEvents;