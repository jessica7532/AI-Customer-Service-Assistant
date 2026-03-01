// ========================================
// Background Service Worker
// 处理跨域HTTP请求
// ========================================

/**
 * 监听来自content script的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 处理HTTP请求
    if (request.action === 'httpRequest') {
        handleHttpRequest(request.details)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ error: error.message }));
        
        // 返回true表示异步响应
        return true;
    }
});

/**
 * 处理HTTP请求
 * @param {Object} details - 请求详情
 * @returns {Promise<Object>}
 */
async function handleHttpRequest(details) {
    try {
        const { method, url, headers, data } = details;
        
        // 发起fetch请求
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: data
        });

        // 获取响应数据
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = responseText;
        }

        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: responseData
        };
    } catch (error) {
        console.error('Background HTTP request failed:', error);
        throw new Error(`网络请求失败: ${error.message}`);
    }
}
