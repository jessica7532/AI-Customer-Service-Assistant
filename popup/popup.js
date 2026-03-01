// 加载当前开关状态
chrome.storage.local.get(['extensionEnabled'], (result) => {
    const toggle = document.getElementById('extensionToggle');
    toggle.checked = result.extensionEnabled !== false; // 默认开启
});

// 监听开关变化
document.getElementById('extensionToggle').addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ extensionEnabled: enabled });
    
    // 通知所有标签页更新状态
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
                action: 'toggleExtension', 
                enabled: enabled 
            }).catch(() => {}); // 忽略无法通信的标签页
        });
    });
});