// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_REFRESH') {
    console.log('Refreshing data background.js...');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_DATA' }, (response) => { 
        if (response && response.success) {
          sendResponse({ 
            success: true, 
            unreadCount: response.unreadCount, 
            urgentCount: response.urgentCount, 
            laterCount: response.laterCount,
            urgentWorkCount: response.urgentWorkCount,
            laterWorkCount: response.laterWorkCount,
            urgentSchoolCount: response.urgentSchoolCount,
            laterSchoolCount: response.laterSchoolCount,
            urgentPersonalCount: response.urgentPersonalCount,
            laterPersonalCount: response.laterPersonalCount
          });
        } else {
          sendResponse({ success: false, error: response?.error || 'No response from content script' });
        }
      });
    })
  } else if (message.type === 'GET_SUMMARY') {
    console.log('Getting summary background.js...');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'SUMMARIZE_EMAILS', category: message.category, priority: message.priority }, (response) => { 
        if (response && response.success) {
          sendResponse({ 
            success: true, 
            summary: response.summary,
          });
        } else {
          sendResponse({ success: false, error: response?.error || 'No response from content script' });
        }
      });
    })
  }

  return true;
});