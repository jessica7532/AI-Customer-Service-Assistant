# AI 客服助手

Helpshift 平台的 Chrome 扩展，为客服工作流提供 AI 辅助功能。

---

## 功能

- **快捷回复** — 通过标签体系快速插入常用回复模板
- **AI 生成回复** — 基于选定标签和语气设置，调用 AI 模型生成回复内容
- **多模型支持** — 支持 OpenRouter、DeepSeek、Google AI Studio 等多个 API 提供商
- **标签管理** — 增删改查一级/二级标签，支持逻辑标签和模板标签两种类型
- **会话历史** — 读取指定条数的历史消息作为上下文
- **数据预览** — 预览从页面提取的结构化数据
- **多语言翻译** — 一键 AI 翻译模板到所有配置语言

---

## 安装

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择 `src/` 目录

---

## 配置

扩展加载后，点击侧边栏顶部的 **API 设置** 图标，填入对应服务的 API Key。

| 服务 | Key 格式 |
|------|---------|
| OpenRouter | `sk-or-...` |
| DeepSeek | `sk-...` |
| Google AI Studio | `AIza...` |
| Google Translate | `AIza...` |

---

## 项目结构

```
src/
├── manifest.json
├── main.js              # 扩展入口
├── ui/                  # 界面组件
│   ├── sidebar          # 侧边栏
│   ├── prompt-editor    # 提示词编辑器
│   ├── tag-manager      # 标签管理
│   ├── model-selector   # 模型选择
│   ├── api-settings     # API 设置
│   ├── history-menu     # 历史记录菜单
│   └── data-preview     # 数据预览
├── services/            # API 调用层
├── business/            # 业务逻辑
├── background/          # Service Worker
└── utils/               # 工具函数
```

---

## 关于

**原型与业务流程设计** Jiaqi.Wang

**代码实现** Claude & GPT

---

## License

MIT License — 允许自由使用、修改和分发，**禁止商业用途**。

Copyright (c) 2026 Jiaqi.Wang
