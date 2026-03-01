// ========================================
// 防翻译保护 - 对沉浸式翻译友好的隔离方案
// ========================================
//
// 策略：不对抗（不删除注入节点），而是让翻译扩展主动跳过。
//
// 1. 在插件根容器上设置标准 W3C translate="no" + class="notranslate"
// 2. 设置沉浸式翻译专用的 data-immersive-translate-walked="true"
//    告诉它"这棵子树已经处理过了，不需要再遍历"
// 3. 通过 MutationObserver 持续守护：
//    - 新增的插件节点立即打标记
//    - 如果沉浸式翻译移除了 walked 标记（升级后可能重置），立刻补回
// 4. 绝不删除沉浸式翻译注入的 FONT/SPAN 节点 —— 删除会导致报错，
//    报错会促使沉浸式翻译开发者加强侵入。
//    取而代之：用 CSS 将其 display:none 隐藏。
//

(function () {
    'use strict';

    // ===== 插件 UI 根节点选择器 =====
    const PLUGIN_ROOT_SELECTORS = [
        '#ai-sidebar',
        '.prompt-editor-panel',
        '.tag-manager-panel',
        '.data-preview-panel',
        '.collapsible-panel',
        '.api-settings-menu',
        '.model-selector-menu',
        '.history-menu',
        '.style-settings-panel',
        '.message-translator-panel',
        '#catManageOverlay',
        '#exportSettingsOverlay',
        '#panelFieldsOverlay',
        '#tagEditOverlay',
        '#manageCategoryOverlay'
    ];

    // ===== 为元素打上完整的「免翻译」标记 =====
    function markNoTranslate(el) {
        if (!el || el.nodeType !== 1) return;

        // W3C 标准
        el.setAttribute('translate', 'no');
        el.classList.add('notranslate');

        // 沉浸式翻译：告诉它已经走过了，不要再处理
        el.setAttribute('data-immersive-translate-walked', 'true');

        // 沉浸式翻译：排除效果
        el.setAttribute('data-immersive-translate-effect', 'excluded');

        // 通用第三方翻译扩展
        el.setAttribute('data-no-translation', '1');
    }

    // ===== 判断节点是否属于我们的插件 UI =====
    function isPluginNode(node) {
        if (!node || node.nodeType !== 1) return false;

        const id = node.id || '';
        const className = typeof node.className === 'string' ? node.className : '';

        // ID 匹配
        if (id === 'ai-sidebar') return true;
        if (id === 'catManageOverlay' || id === 'exportSettingsOverlay') return true;
        if (id === 'panelFieldsOverlay' || id === 'tagEditOverlay') return true;
        if (id === 'manageCategoryOverlay') return true;

        // class 匹配
        if (className.includes('prompt-editor-panel')) return true;
        if (className.includes('tag-manager-panel')) return true;
        if (className.includes('data-preview-panel')) return true;
        if (className.includes('collapsible-panel')) return true;
        if (className.includes('api-settings-menu')) return true;
        if (className.includes('model-selector-menu')) return true;
        if (className.includes('history-menu')) return true;
        if (className.includes('style-settings-panel')) return true;
        if (className.includes('message-translator-panel')) return true;

        return false;
    }

    // ===== 保护所有已存在的插件根节点 =====
    function protectAllRoots() {
        PLUGIN_ROOT_SELECTORS.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) markNoTranslate(el);
        });
    }

    // ===== 注入 CSS 规则：隐藏插件内部被沉浸式翻译注入的元素 =====
    // 这比删除 DOM 节点安全得多 —— 沉浸式翻译不会因为节点消失而报错
    function injectHideCSS() {
        const styleId = 'helpshift-anti-translate-css';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;

        // 为所有插件根容器生成 CSS 规则
        const rootSelectors = PLUGIN_ROOT_SELECTORS.join(', ');

        style.textContent = `
            /* 隐藏沉浸式翻译在插件内部注入的所有翻译元素 */
            :is(${rootSelectors}) font[data-immersive-translate-translation-element-mark],
            :is(${rootSelectors}) span.immersive-translate-target-wrapper,
            :is(${rootSelectors}) span.immersive-translate-target-inner,
            :is(${rootSelectors}) span.immersive-translate-target-translation-theme-none,
            :is(${rootSelectors}) [class*="immersive-translate-target"],
            :is(${rootSelectors}) .immersive-translate-loading-spinner {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
                position: absolute !important;
                clip: rect(0, 0, 0, 0) !important;
            }

            /* 确保原始文本节点不被沉浸式翻译的 wrapper 影响布局 */
            :is(${rootSelectors}) span.immersive-translate-source-wrapper {
                all: unset !important;
            }

            /* 防止 Google 翻译注入 */
            :is(${rootSelectors}) .VIpgJd-ZVi9od-ORHb-OEVmcd,
            :is(${rootSelectors}) .goog-te-banner-frame {
                display: none !important;
            }
        `;

        (document.head || document.documentElement).appendChild(style);
    }

    // ===== MutationObserver：持续守护 =====
    function startObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // 1. 新增节点：如果是我们的插件UI，立刻打标记
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;

                    if (isPluginNode(node)) {
                        markNoTranslate(node);
                    }
                }

                // 2. 属性变更：如果有人（沉浸式翻译升级后）
                //    移除了我们的 walked 标记，立刻补回
                if (mutation.type === 'attributes' &&
                    mutation.attributeName === 'data-immersive-translate-walked' &&
                    mutation.target.nodeType === 1) {

                    const target = mutation.target;
                    // 只管我们自己的节点
                    if (isPluginNode(target) || target.closest(PLUGIN_ROOT_SELECTORS.join(', '))) {
                        if (target.getAttribute('data-immersive-translate-walked') !== 'true') {
                            target.setAttribute('data-immersive-translate-walked', 'true');
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-immersive-translate-walked']
        });
    }

    // ===== 初始化 =====
    function init() {
        injectHideCSS();
        protectAllRoots();
        startObserver();
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();