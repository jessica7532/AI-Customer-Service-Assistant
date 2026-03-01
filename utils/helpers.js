// ========================================
// 工具函数模块
// ========================================

const Utils = {
    /**
     * 网络请求封装 - Chrome扩展版本
     * 通过background service worker发送请求，绕过CORS限制
     */
    async request(details) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'httpRequest',
                details: details
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }
                
                // 返回类似fetch的响应对象
                resolve({
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    json: () => Promise.resolve(response.data),
                    text: () => Promise.resolve(JSON.stringify(response.data))
                });
            });
        });
    },

    /**
     * 显示通知
     */
    showNotification(text, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `copy-notification ${type}`;
        const plainText = String(text).replace(/^[\u2705\u2713]\s*/, '');
        notification.textContent = plainText;
        notification.setAttribute('translate', 'no');

        // 计算堆叠位置：找到当前所有通知中最底部的位置
        const existing = document.querySelectorAll('.copy-notification');
        let topOffset = 20;
        existing.forEach(el => {
            const rect = el.getBoundingClientRect();
            const bottom = rect.top + rect.height + 8; // 8px 间距
            if (bottom > topOffset) topOffset = bottom;
        });
        notification.style.top = topOffset + 'px';

        document.body.appendChild(notification);

        // 淡出后移除
        setTimeout(() => {
            notification.style.transition = 'opacity 0.3s';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    },

    /**
     * 使元素可拖动
     */
    makeDraggable(element) {
        const header = element.querySelector('.ai-header');
        if (!header) return;

        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        header.onmousedown = (e) => {
            // 如果点击的是按钮，不触发拖动
            if (e.target.closest('button')) return;
            
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDrag;
            document.onmousemove = drag;
        };

        function drag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            let newTop = element.offsetTop - pos2;
            let newLeft = element.offsetLeft - pos1;

            // 限制在窗口内
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));

            element.style.top = newTop + 'px';
            element.style.left = newLeft + 'px';
            element.style.transform = 'none';
        }

        function closeDrag() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    },

    /**
     * 使悬浮按钮可拖动（带点击检测）
     */
    makeFloatBtnDraggable(element, onClickCallback) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let isDragging = false;

        element.onmousedown = (e) => {
            e.preventDefault();
            isDragging = false;
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDrag;
            document.onmousemove = drag;
        };

        function drag(e) {
            e.preventDefault();
            isDragging = true;
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            let newTop = element.offsetTop - pos2;
            let newLeft = element.offsetLeft - pos1;

            // 限制在窗口内
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));

            element.style.top = newTop + 'px';
            element.style.left = newLeft + 'px';
        }

        function closeDrag() {
            document.onmouseup = null;
            document.onmousemove = null;
            
            // 如果没有拖动，则触发点击回调
            if (!isDragging && onClickCallback) {
                onClickCallback();
            }
        }
    },

    /**
     * 读取Helpshift对话历史
     * @param {number} count - 读取最近N条消息
     * @returns {string} 格式化的对话历史
     */
    loadConversationHistory(count) {
        try {
            // 获取所有消息容器
            const allMessages = document.querySelectorAll('.hs-msg__wrapper');
            
            const defaultMessage = 'Please ask the user what assistance they require.';
            
            if (!allMessages || allMessages.length === 0) {
                Utils.showNotification('未找到对话消息', 'error');
                return defaultMessage;
            }

            /* ========================================
               【已禁用】会话开始节点查找逻辑
               改为：默认从最后向上获取X条有效消息
               ======================================== */
            // // 找到用户第一次描述问题的消息（带有 rsp_txt_msg_with_txt_input class）
            // let startIndex = -1;
            // const messagesArray = Array.from(allMessages);
            // 
            // for (let i = 0; i < messagesArray.length; i++) {
            //     const msg = messagesArray[i].querySelector('.hs-msg');
            //     if (msg && msg.classList.contains('hs-msg--rsp_txt_msg_with_txt_input')) {
            //         startIndex = i;
            //         break;
            //     }
            // }
            //
            // // 如果没找到特殊标记的用户描述，则找"is done interacting"系统消息，从它之后开始
            // if (startIndex === -1) {
            //     for (let i = 0; i < messagesArray.length; i++) {
            //         const msg = messagesArray[i].querySelector('.hs-msg');
            //         if (msg && msg.classList.contains('hs-msg--system')) {
            //             const bodyElement = messagesArray[i].querySelector('.hs-msg__body');
            //             if (bodyElement && bodyElement.textContent.includes('is done interacting')) {
            //                 // 从这条消息的下一条开始
            //                 startIndex = i + 1;
            //                 break;
            //             }
            //         }
            //     }
            // }
            //
            // if (startIndex === -1) {
            //     Utils.showNotification('未找到有效的对话起点', 'error');
            //     return defaultMessage;
            // }
            //
            // // 从起点开始，过滤掉系统消息和机器人消息
            // const validMessages = messagesArray.slice(startIndex).filter(wrapper => {
            //     const msg = wrapper.querySelector('.hs-msg');
            //     if (!msg) return false;
            //     
            //     // 排除系统消息
            //     if (msg.classList.contains('hs-msg--system')) return false;
            //     
            //     // 排除机器人消息
            //     if (msg.classList.contains('hs-msg--bot-msg')) return false;
            //     
            //     return true;
            // });

            // 【新逻辑】直接过滤所有消息，排除系统消息和机器人消息
            const messagesArray = Array.from(allMessages);
            const validMessages = messagesArray.filter(wrapper => {
                const msg = wrapper.querySelector('.hs-msg');
                if (!msg) return false;
                
                // 排除系统消息（hs-msg--system）
                if (msg.classList.contains('hs-msg--system')) return false;

                // 排除 Intent 选择消息（hs-msg--si，如"Intent: Ad issue > How to skip ads?"）
                if (msg.classList.contains('hs-msg--si')) return false;

                // 排除机器人消息（hs-msg--bot-msg）
                if (msg.classList.contains('hs-msg--bot-msg')) return false;

                // 排除用户点击按钮/选项产生的消息（非手动输入）
                // hs-msg--rsp_faq_list_msg_with_option_input：点击FAQ选项（如"No, I need to talk to someone"）
                // hs-msg--rsp_txt_msg_with_option_input：点击文字选项（如"Advertising"、"None above."）
                // 注意：hs-msg--rsp_txt_msg_with_txt_input 是用户手动输入，需保留
                const msgClasses = msg.className;
                if (msgClasses.includes('option_input')) return false;

                // 排除自动欢迎/问候消息（Greeting Message 等非真人非bot的自动消息）
                // 真人客服的 agent-name 是 "You"，bot 已由 hs-msg--bot-msg 排除
                // 注意：沉浸式翻译会在 agent-name 里注入 <font> 标签，需先克隆剔除再读文本
                if (wrapper.classList.contains('hs-msg__wrapper--right')) {
                    const agentNameEl = wrapper.querySelector('.hs-msg__agent-name');
                    if (agentNameEl) {
                        const cloned = agentNameEl.cloneNode(true);
                        cloned.querySelectorAll('font[class*="immersive"], font[data-immersive-translate-translation-element-mark]').forEach(el => el.remove());
                        const agentName = cloned.textContent.trim();
                        // agent-name 为空或非"You"的右侧消息 = 自动消息
                        if (agentName !== 'You') return false;
                    } else {
                        // 没有 agent-name 元素的右侧消息也排除
                        return false;
                    }
                }
                
                return true;
            });

            if (validMessages.length === 0) {
                Utils.showNotification('没有可读取的有效对话', 'error');
                return defaultMessage;
            }

            // 取最近N条消息（从最后向上数）
            const recentMessages = validMessages.slice(-count);

            // 检测是否有真人客服回复
            // 根据页面结构分析：真人客服的标记是 agent-name 为 "You"
            let hasHumanAgent = false;

            // 格式化消息
            const formatted = recentMessages.map(wrapper => {
                // 判断是User还是Agent
                const isAgent = wrapper.classList.contains('hs-msg__wrapper--right');
                const role = isAgent ? 'Agent' : 'User';

                // 检测真人客服：
                // 关键标记：<span class="hs-msg__agent-name">You</span>
                // 机器人标记：Sudoku Support 101025, QuickSearch Bot 等
                if (isAgent) {
                    const agentName = wrapper.querySelector('.hs-msg__agent-name');
                    if (agentName) {
                        const name = agentName.textContent.trim();
                        console.log('[对话历史] Agent name:', name);
                        if (name === 'You') {
                            hasHumanAgent = true;
                            console.log('[对话历史] ✓ 检测到真人客服');
                        }
                    }
                }

                // 提取时间戳
                const tsElement = wrapper.querySelector('.hs-msg__ts');
                let timestamp = 'Unknown';
                if (tsElement) {
                    // 克隆时间戳元素以避免修改原DOM
                    const clonedTs = tsElement.cloneNode(true);
                    
                    // 删除所有沉浸式翻译相关的元素
                    const translateElements = clonedTs.querySelectorAll('[class*="immersive-translate"]');
                    translateElements.forEach(el => el.remove());
                    
                    // 获取清理后的时间戳文本
                    const rawTime = clonedTs.textContent.trim();
                    // 转换为: "2024-11-27 11:45:32"
                    timestamp = this.parseHelpshiftTimestamp(rawTime);
                }

                // 提取消息内容
                const bodyElement = wrapper.querySelector('.hs-msg__body');
                let content = 'No content';
                if (bodyElement) {
                    // 克隆元素以避免修改原DOM
                    const clonedBody = bodyElement.cloneNode(true);
                    
                    // 删除所有沉浸式翻译相关的元素
                    const translateElements = clonedBody.querySelectorAll('[class*="immersive-translate"]');
                    translateElements.forEach(el => el.remove());
                    
                    // 获取第一个直接子span的文本（原始消息）
                    const directSpan = clonedBody.querySelector('span');
                    if (directSpan) {
                        // 获取文本并替换换行为空格
                        content = directSpan.textContent
                            .trim()
                            .replace(/\n+/g, ' ')
                            .replace(/\s+/g, ' ');
                    } else {
                        // 如果没有找到span，则使用整个body的文本（已经删除了翻译元素）
                        content = clonedBody.textContent
                            .trim()
                            .replace(/\n+/g, ' ')
                            .replace(/\s+/g, ' ');
                    }
                }

                return `[${timestamp} | ${role}] ${content}`;
            }).join('\n');

            Utils.showNotification(`✓ 已读取 ${recentMessages.length} 条消息`, 'success');
            
            // 保存是否有真人客服的标记
            window.hasHumanAgent = hasHumanAgent;
            console.log('[对话历史] hasHumanAgent:', hasHumanAgent);
            
            return formatted;

        } catch (error) {
            console.error('读取对话历史失败:', error);
            Utils.showNotification('读取失败，请查看控制台', 'error');
            return '';
        }
    },

    /**
     * 解析Helpshift时间戳格式
     * @param {string} rawTime - "November-27-2025 11:45:32 AM"
     * @returns {string} "2024-11-27 11:45:32"
     */
    parseHelpshiftTimestamp(rawTime) {
        try {
            // 直接使用Date解析
            const date = new Date(rawTime);
            if (isNaN(date.getTime())) {
                return rawTime; // 解析失败则返回原值
            }

            // 格式化为 YYYY-MM-DD HH:MM:SS
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');

            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error('时间戳解析失败:', error);
            return rawTime;
        }
    }
};