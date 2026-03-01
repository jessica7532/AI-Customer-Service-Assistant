// ========================================
// 数据提取器业务逻辑
// ========================================

const DataExtractor = {
    /**
     * 延迟函数
     * @param {number} ms - 毫秒数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 等待某个选择器对应的元素出现在 DOM 中
     * @param {string} selector - CSS 选择器
     * @param {number} timeout - 最大等待毫秒数，默认 4000ms
     * @returns {Promise<Element|null>} 找到的元素，超时返回 null
     */
    waitForElement(selector, timeout = 4000) {
        return new Promise((resolve) => {
            // 已经存在就直接返回
            const existing = document.querySelector(selector);
            if (existing) return resolve(existing);

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    clearTimeout(timer);
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });

            const timer = setTimeout(() => {
                observer.disconnect();
                console.warn(`[waitForElement] 超时未找到: ${selector}`);
                resolve(null);
            }, timeout);
        });
    },

    /**
     * 提取当前Issue的数据
     * @returns {Promise<Object>} 提取的数据对象
     */
    async extractIssueData() {
        const data = {
            date: new Date().toLocaleDateString('zh-CN'),
            source: 'Helpshift',
            platform: '',
            product: '',
            version: '',
            deviceModel: '',
            link: '',
            uid: '',
            content: '',
            category1: '',
            category2: '',
            solution: '',
            summary: '',
            issueId: ''
        };

        // ── 1. 提取 Issue ID 和链接 ──────────────────────────────────────
        const issueLink = document.querySelector(EXTRACTOR_CONFIG.selectors.issueLink);
        if (issueLink) {
            const issueId = issueLink.textContent.replace('#', '').trim();
            data.issueId = issueId;
            data.link = `https://arsenal-support.helpshift.com/admin/issue/${issueId}/`;
        }

        // ── 2. 提取设备型号 ──────────────────────────────────────────────
        // 真实 HTML 结构：appInfoWrapper 第二个子 div 里，Android 后紧跟的 span（无 tw-pt-2）
        // 例：<span class="tw-ml-4" data-imt-p="1">23021RAA2Y</span>
        // 策略：先尝试专用选择器，失败则从 appInfoWrapper 解析
        const deviceModelElem = document.querySelector(EXTRACTOR_CONFIG.selectors.deviceModel);
        if (deviceModelElem) {
            data.deviceModel = deviceModelElem.textContent.trim();
        } else {
            // fallback：从 appInfoWrapper 里的平台行提取设备型号
            // 结构：图标 • Android版本 • 设备型号 • 语言 • Queue
            const appInfoWrapper = document.querySelector(EXTRACTOR_CONFIG.selectors.appInfoWrapper);
            if (appInfoWrapper) {
                // 找平台行（含 ion-android 或 ion-ios 图标的那个 div）
                const platformRow = appInfoWrapper.querySelector('.tw-flex.tw-content-start.tw-items-center.tw-px-0');
                if (platformRow) {
                    // 收集所有直接 span 文本，过滤掉 "•" 分隔符和空字符串
                    const spans = Array.from(platformRow.querySelectorAll('span[data-imt-p], span[data-imt_insert_failed_reason]'));
                    // 设备型号特征：全部由字母+数字组成，不含空格，长度 > 4
                    const deviceSpan = spans.find(s => {
                        const t = s.textContent.trim();
                        return t.length > 4 && /^[A-Za-z0-9]+$/.test(t) && !['Android', 'iOS'].includes(t);
                    });
                    if (deviceSpan) {
                        data.deviceModel = deviceSpan.textContent.trim();
                    }
                }
            }
        }

        // ── 3. 切换到 Metadata 标签页，等待内容渲染 ─────────────────────
        const metadataTab = document.querySelector(EXTRACTOR_CONFIG.selectors.metadataTab);
        if (!metadataTab) {
            console.warn('[提取] 未找到 Metadata 标签页，跳过平台/版本/UID 提取');
            return data;
        }

        // 若当前已在 Metadata 标签就不必再点击
        const isAlreadyMetadata = metadataTab.classList.contains('active');
        if (!isAlreadyMetadata) {
            metadataTab.click();
        }

        // 等待 appInfoWrapper 真正渲染出来（最多 4 秒）
        const appInfo = await this.waitForElement(EXTRACTOR_CONFIG.selectors.appInfoWrapper, 4000);

        if (appInfo) {
            // ── 3a. 版本号 ────────────────────────────────────────────────
            // 真实 HTML：<span class="tw-ml-4 tw-pt-2 tw-text-black-400">5.46.0</span>
            // 在第一个子 div（含 app 图标那行）里，带 tw-pt-2 的 span
            const versionSpan = appInfo.querySelector('span.tw-ml-4.tw-pt-2');
            if (versionSpan) {
                data.version = versionSpan.textContent.trim();
            }

            // ── 3b. 平台 & 产品 ───────────────────────────────────────────
            // 真实 HTML：<i class="... ion-android"> 或 ion-ios
            // Android 版本号在图标同级 div 里的第二个 span（tw-ml-4 tw-text-black-400）
            const androidIcon = appInfo.querySelector('i.ion-android');
            const iosIcon = appInfo.querySelector('i.ion-ios, i[class*="ion-social-apple"], i[class*="ion-ios-apple"]');

            if (androidIcon) {
                // 找 Android 版本号：图标父级 div 里 class 含 tw-text-black-400 的 span
                const platformDiv = androidIcon.closest('div');
                const versionNumSpan = platformDiv ? platformDiv.querySelector('span.tw-ml-4.tw-text-black-400') : null;
                const versionNum = versionNumSpan ? versionNumSpan.textContent.trim() : '';
                data.platform = versionNum ? `Android ${versionNum}` : 'Android';
                data.product = 'Sudoku Android';
            } else if (iosIcon) {
                const platformDiv = iosIcon.closest('div');
                const versionNumSpan = platformDiv ? platformDiv.querySelector('span.tw-ml-4.tw-text-black-400') : null;
                const versionNum = versionNumSpan ? versionNumSpan.textContent.trim() : '';
                data.platform = versionNum ? `iOS ${versionNum}` : 'iOS';
                data.product = 'Sudoku iOS';
            } else {
                // 最终 fallback：从文本正则匹配
                const fullText = appInfo.textContent;
                const androidMatch = fullText.match(/Android\s*(\d+)/);
                const iosMatch = fullText.match(/iOS\s*([\d.]+)/);
                if (androidMatch) {
                    data.platform = `Android ${androidMatch[1]}`;
                    data.product = 'Sudoku Android';
                } else if (iosMatch) {
                    data.platform = `iOS ${iosMatch[1]}`;
                    data.product = 'Sudoku iOS';
                }
            }
        }

        // ── 4. 等待 Custom Data 表格渲染，提取 luid ──────────────────────
        // 真实结构：td.hs-i-metadata__table-col 存 key，
        //           td > span.hs-i-metadata__col-link 存 value
        const luidTable = await this.waitForElement(EXTRACTOR_CONFIG.selectors.luidTable, 4000)
            || await this.waitForElement(EXTRACTOR_CONFIG.selectors.luidTableFallback, 1000);
        if (luidTable) {
            const rows = luidTable.querySelectorAll('tr.hs-i-metadata__table-row');
            for (const row of rows) {
                const cols = row.querySelectorAll('td.hs-i-metadata__table-col');
                if (cols.length >= 2) {
                    const key = cols[0].textContent.trim().toLowerCase();
                    if (key === 'luid' || key === 'uid') {
                        // value 在第二个 td 里的 span.hs-i-metadata__col-link
                        const valueSpan = cols[1].querySelector('span.hs-i-metadata__col-link');
                        data.uid = valueSpan
                            ? valueSpan.textContent.trim()
                            : cols[1].textContent.trim();
                        break;
                    }
                }
            }
        }

        // ── 5. 切回 Conversation 标签页 ──────────────────────────────────
        if (!isAlreadyMetadata) {
            const conversationTab = document.querySelector(EXTRACTOR_CONFIG.selectors.conversationTab);
            if (conversationTab) {
                conversationTab.click();
                // 只需短暂等待 UI 响应，无需等待数据加载
                await this.sleep(200);
            }
        }

        return data;
    },

};