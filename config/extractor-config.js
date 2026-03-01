// ========================================
// 数据提取器配置
// ========================================

const EXTRACTOR_CONFIG = {
    storageKey: 'helpshift_extracted_data',
    
    // DOM选择器
    selectors: {
        conversationTab: '[data-qa="issue-preview__conv-tab"]',
        metadataTab: '[data-qa="issue-preview__metadata-tab"]',
        activeTab: '.tabs__title.active',
        issueLink: '.hs-issue-header__permalink',
        appInfoWrapper: '[data-qa="issue__app-info-wrapper"]',
        // Custom Data 表格容器（含 luid/uid 等字段）
        luidTable: '[data-qa="issue__metadata-table-wrapper"] .hs-i-metadata__table',
        // luidTable fallback（兼容旧结构）
        luidTableFallback: '.hs-i-metadata__table',
        messageBody: '.hs-msg__body',
        // 设备型号：优先用专用选择器，不存在时 data-extractor 会从 appInfoWrapper 解析
        deviceModel: '.hs-issue-header__device-model'
    },
    
    // 数据分类（用户通过"管理分类"自行配置，存储在 chrome.storage）
    categories: {},

    // ── 字段定义（唯一数据源）──────────────────────────────────
    // 所有涉及字段映射、表头渲染、CSV导出的地方都从这里读取
    //
    // key:          存储用英文字段名（ExtractorStorage 中的 key）
    // label:        中文显示名（表头 & CSV 列名）
    // cssClass:     表格列的 CSS class
    // editable:     是否支持双击编辑（文本框）
    // categoryType: 'category1' | 'category2' 表示用分类下拉框
    // hidden:       默认隐藏的列
    fields: [
        { key: 'date',         label: '日期',            cssClass: 'col-date' },
        { key: 'similarCount', label: '类似反馈条数',    cssClass: 'col-count',      hidden: true, deletable: true },
        { key: 'source',       label: '反馈来源',        cssClass: 'col-source' },
        { key: 'category1',    label: '一级分类',        cssClass: 'col-category',   categoryType: 'category1' },
        { key: 'category2',    label: '二级分类',        cssClass: 'col-category',   categoryType: 'category2' },
        { key: 'solution',     label: '方案回复',        cssClass: 'col-solution',   editable: true, deletable: true },
        { key: 'deviceModel',  label: '设备型号',        cssClass: 'col-device' },
        { key: 'platform',     label: '平台',            cssClass: 'col-platform' },
        { key: 'version',      label: '产品版本',        cssClass: 'col-version' },
        { key: 'summary',      label: '反馈内容简述',    cssClass: 'col-summary',    editable: true },
        { key: 'content',      label: '反馈内容（原文）', cssClass: 'col-content',   editable: true },
        { key: 'screenshot',   label: '反馈截图',        cssClass: 'col-screenshot', hidden: true, deletable: true },
        { key: 'uid',          label: 'UID',             cssClass: 'col-uid' },
        { key: 'link',         label: '反馈链接',        cssClass: 'col-link' },
        { key: 'product',      label: '产品',            cssClass: 'col-product' },
    ],

    // ── 面板字段设置 ────────────────────────────────────────
    PANEL_FIELDS_KEY: 'helpshift_panel_fields_v1',

    /**
     * 获取面板字段设置（显示/隐藏、顺序、自定义字段）
     * 每项: { key, label, visible, custom? }
     * custom 字段没有 key（用 label 做 key），始终 editable
     */
    getPanelFields() {
        try {
            const saved = localStorage.getItem(this.PANEL_FIELDS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // 同步：如果 EXTRACTOR_CONFIG.fields 新增了内置字段，追加到末尾
                const existingKeys = new Set(parsed.map(p => p.key || p.label));
                for (const f of this.fields) {
                    if (!existingKeys.has(f.key)) {
                        parsed.push({ key: f.key, label: f.label, visible: !f.hidden });
                    }
                }
                return parsed;
            }
        } catch (e) { /* ignore */ }
        // 默认：内置字段，hidden 的默认不可见
        return this.fields.map(f => ({ key: f.key, label: f.label, visible: !f.hidden }));
    },

    savePanelFields(settings) {
        localStorage.setItem(this.PANEL_FIELDS_KEY, JSON.stringify(settings));
    },

    /**
     * 获取面板当前可见字段的完整定义列表
     * 合并内置字段属性 + 面板设置的顺序/可见性 + 自定义字段
     */
    getVisibleFields() {
        const panelFields = this.getPanelFields();
        const builtinMap = {};
        for (const f of this.fields) {
            builtinMap[f.key] = f;
        }

        return panelFields
            .filter(pf => pf.visible)
            .map(pf => {
                if (pf.custom) {
                    // 自定义字段
                    return { key: pf.label, label: pf.label, cssClass: 'col-custom', editable: true, custom: true };
                }
                const builtin = builtinMap[pf.key];
                return builtin ? { ...builtin, hidden: false } : null;
            })
            .filter(Boolean);
    },

    /**
     * 获取面板设置的全部字段列表（含不可见的），用于完整映射
     */
    getAllPanelFields() {
        const panelFields = this.getPanelFields();
        const builtinMap = {};
        for (const f of this.fields) {
            builtinMap[f.key] = f;
        }

        return panelFields.map(pf => {
            if (pf.custom) {
                return { key: pf.label, label: pf.label, cssClass: 'col-custom', editable: true, custom: true };
            }
            const builtin = builtinMap[pf.key];
            return builtin ? { ...builtin } : null;
        }).filter(Boolean);
    },

    /** 检查"反馈内容简述"是否被用户设为可见 */
    isSummaryVisible() {
        const panelFields = this.getPanelFields();
        const summaryField = panelFields.find(pf => pf.key === 'summary');
        return summaryField ? summaryField.visible : true;
    },

    // ── 便捷方法 ─────────────────────────────────────────────

    /** 存储记录(英文key) → 显示记录(中文label) */
    toDisplayRecord(record) {
        const display = {};
        // 内置字段
        for (const f of this.fields) {
            display[f.label] = record[f.key] || '';
        }
        // 自定义字段（key 和 label 相同，直接从 record 取）
        const panelFields = this.getPanelFields();
        for (const pf of panelFields) {
            if (pf.custom) {
                display[pf.label] = record[pf.label] || '';
            }
        }
        return display;
    },

    /** 显示记录(中文label) → 存储记录(英文key) */
    toStorageRecord(display) {
        const record = {};
        // 内置字段
        for (const f of this.fields) {
            record[f.key] = display[f.label] || '';
        }
        // 自定义字段
        const panelFields = this.getPanelFields();
        for (const pf of panelFields) {
            if (pf.custom) {
                record[pf.label] = display[pf.label] || '';
            }
        }
        return record;
    },

    /** 批量转换: 存储 → 显示 */
    toDisplayRecords(records) {
        return records.map(r => this.toDisplayRecord(r));
    },

    /** 批量转换: 显示 → 存储 */
    toStorageRecords(displays) {
        return displays.map(d => this.toStorageRecord(d));
    },

    /** 获取 CSV 导出用的表头数组（中文） */
    getCsvHeaders() {
        return this.fields.map(f => f.label);
    },

    /** 将存储记录转为 CSV 行数组（顺序与 getCsvHeaders 一致） */
    toCsvRow(record) {
        return this.fields.map(f => record[f.key] || '');
    }
};