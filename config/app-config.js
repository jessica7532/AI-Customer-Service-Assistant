// ========================================
// 应用配置
// ========================================

const CONFIG = {
    // 固定的一级分类
    categories: ['广告问题', 'Bug', '建议'],

    // 语气风格预设（固定，不可修改）
    tonePresets: {
        friendly: {
            name: "友好专业",
            icon: "💼",
            prompt: `Professional yet friendly tone:
- Each sentence has purpose: acknowledge issue / ask question / provide solution
- Say "sorry" once max, no filler like "I completely understand how frustrating..."
- Use paragraphs! Break into 2-3 short paragraphs, never a wall of text
- 1 emoji naturally, 10-90 words based on complexity
- Sound like a helpful colleague, not robotic`
        },
        soft: {
            name: "温和诚恳",
            icon: "🌸",
            prompt: `Gentle, empathetic and caring tone:
- Show genuine empathy first - validate their feelings, let them feel heard
- Use soft, warm language - "I'm so sorry you're going through this", "That sounds really frustrating"
- Don't rush to solutions - sit with their emotion briefly before helping
- Use paragraphs! Break into 2-3 short paragraphs for readability
- Sincere apology when needed, offer support/solution gently
- Use warm emojis: 🙇‍♀️🙏💙 sparingly
- 20-150 words, sound like a kind friend who truly cares`
        }
    }
};