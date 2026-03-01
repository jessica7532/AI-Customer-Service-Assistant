// ========================================
// AI API module
// ========================================

const AIService = {
    /**
     * Unified API entry
     * @param {string} prompt
     * @param {string} model
     * @returns {Promise<{text: string, warning: string|null, usage: {inputTokens: number|null, outputTokens: number|null, totalTokens: number|null}}>}
     */
    async callAPI(prompt, model) {
        if (!model) {
            model = 'gemini-3-flash-preview';
            console.warn('[AIService] model is undefined, using default model:', model);
        }

        // Gemini models are routed to Google AI Studio directly.
        if (model.startsWith('gemini-') || model.startsWith('google/gemini-')) {
            return await this.callGoogleAIStudio(prompt, model);
        }

        if (model.startsWith('deepseek')) {
            return await this.callDeepSeek(prompt, model);
        } else if (model.startsWith('glm')) {
            return await this.callZhipu(prompt, model);
        } else if (model.startsWith('doubao')) {
            return await this.callDoubao(prompt, model);
        } else {
            return await this.callOpenRouter(prompt, model);
        }
    },

    async _resolveApiKey(provider) {
        if (typeof ApiKeyStore !== 'undefined' && typeof ApiKeyStore.resolve === 'function') {
            return await ApiKeyStore.resolve(provider);
        }

        return '';
    },

    _ensureApiKey(provider, apiKey) {
        if (!apiKey) {
            throw new Error(`Missing API key for ${provider}. Please configure it in API Settings.`);
        }
    },

    /**
     * Google AI Studio (Gemini) API
     */
    async callGoogleAIStudio(prompt, model) {
        const geminiModel = model.startsWith('google/') ? model.replace('google/', '') : model;
        const apiKey = await this._resolveApiKey('googleAIStudio');
        this._ensureApiKey('googleAIStudio', apiKey);

        const response = await Utils.request({
            method: 'POST',
            url: `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192
                }
            })
        });

        return this._parseGeminiResponse(response, geminiModel);
    },

    /**
     * OpenRouter API
     */
    async callOpenRouter(prompt, model) {
        const apiKey = await this._resolveApiKey('openrouter');
        this._ensureApiKey('openrouter', apiKey);

        const response = await Utils.request({
            method: 'POST',
            url: 'https://openrouter.ai/api/v1/chat/completions',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            data: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 8192
            })
        });

        return this._parseOpenAIStyleResponse(response, model);
    },

    /**
     * DeepSeek API
     */
    async callDeepSeek(prompt, model) {
        const apiKey = await this._resolveApiKey('deepseek');
        this._ensureApiKey('deepseek', apiKey);

        const response = await Utils.request({
            method: 'POST',
            url: 'https://api.deepseek.com/v1/chat/completions',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            data: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 8192
            })
        });

        return this._parseOpenAIStyleResponse(response, model);
    },

    /**
     * Zhipu API
     */
    async callZhipu(prompt, model) {
        const apiKey = await this._resolveApiKey('zhipu');
        this._ensureApiKey('zhipu', apiKey);

        const response = await Utils.request({
            method: 'POST',
            url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            data: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 8192
            })
        });

        return this._parseOpenAIStyleResponse(response, model);
    },

    /**
     * Doubao API
     */
    async callDoubao(prompt, model) {
        const apiKey = await this._resolveApiKey('doubao');
        this._ensureApiKey('doubao', apiKey);

        const response = await Utils.request({
            method: 'POST',
            url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            data: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 8192
            })
        });

        return this._parseOpenAIStyleResponse(response, model);
    },

    /**
     * Parse Google AI Studio response
     * @private
     */
    async _parseGeminiResponse(response, model) {
        const data = await response.json();

        console.log('[AIService][Gemini] API response status:', response.status, response.ok);
        console.log('[AIService][Gemini] API response data:', JSON.stringify(data).substring(0, 500));

        if (!response.ok) {
            throw new Error(`API request failed (${response.status}): ${data.error?.message || JSON.stringify(data)}`);
        }

        const candidate = data.candidates?.[0];
        if (!candidate) {
            console.error('[AIService][Gemini] Invalid response payload:', data);
            throw new Error(`Invalid API response: ${JSON.stringify(data).substring(0, 200)}`);
        }

        const text = (candidate.content?.parts || [])
            .map(part => part.text || '')
            .join('')
            .trim();

        const warning = candidate.finishReason === 'MAX_TOKENS'
            ? 'AI response reached max token limit and may be truncated.'
            : null;

        const usage = this._extractGeminiUsage(data);
        this._notifyTokenUsage(model, usage);

        return { text, warning, usage };
    },

    /**
     * Parse OpenAI-compatible response
     * @private
     */
    async _parseOpenAIStyleResponse(response, model) {
        const data = await response.json();

        console.log('[AIService] API response status:', response.status, response.ok);
        console.log('[AIService] API response data:', JSON.stringify(data).substring(0, 500));

        if (!response.ok) {
            throw new Error(`API request failed (${response.status}): ${data.error?.message || JSON.stringify(data)}`);
        }

        if (!data.choices || data.choices.length === 0) {
            console.error('[AIService] Invalid API response payload:', data);
            throw new Error(`Invalid API response: ${JSON.stringify(data).substring(0, 200)}`);
        }

        const choice = data.choices[0];
        const warning = choice.finish_reason === 'length'
            ? 'AI response reached max length limit and may be incomplete.'
            : null;

        const usage = this._extractOpenAIUsage(data);
        this._notifyTokenUsage(model, usage);

        return {
            text: (choice.message?.content || '').trim(),
            warning: warning,
            usage: usage
        };
    },

    _extractGeminiUsage(data) {
        const usage = data?.usageMetadata || {};
        return this._normalizeUsage({
            inputTokens: usage.promptTokenCount ?? null,
            outputTokens: usage.candidatesTokenCount ?? null,
            totalTokens: usage.totalTokenCount ?? null
        });
    },

    _extractOpenAIUsage(data) {
        const usage = data?.usage || {};
        return this._normalizeUsage({
            inputTokens: usage.prompt_tokens ?? usage.input_tokens ?? null,
            outputTokens: usage.completion_tokens ?? usage.output_tokens ?? null,
            totalTokens: usage.total_tokens ?? null
        });
    },

    _normalizeUsage({ inputTokens, outputTokens, totalTokens }) {
        const inTokens = Number.isFinite(inputTokens) ? inputTokens : null;
        const outTokens = Number.isFinite(outputTokens) ? outputTokens : null;
        let total = Number.isFinite(totalTokens) ? totalTokens : null;

        if (total === null && inTokens !== null && outTokens !== null) {
            total = inTokens + outTokens;
        }

        let extra = null;
        if (total !== null && inTokens !== null && outTokens !== null) {
            const diff = total - (inTokens + outTokens);
            if (diff !== 0) {
                extra = diff;
            }
        }

        return {
            inputTokens: inTokens,
            outputTokens: outTokens,
            totalTokens: total,
            extraTokens: extra
        };
    },

    _notifyTokenUsage(model, usage) {
        const inputText = usage.inputTokens ?? 'N/A';
        const outputText = usage.outputTokens ?? 'N/A';
        const totalText = usage.totalTokens ?? 'N/A';
        const message = `[Token] ${model}: up ${inputText}, down ${outputText}, total ${totalText}`;

        console.log('[AIService] Token usage:', { model, usage });

        if (typeof Utils !== 'undefined' && typeof Utils.showNotification === 'function') {
            Utils.showNotification(message, 'info');
        }
    }
};
