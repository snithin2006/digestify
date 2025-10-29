chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_REFRESH') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_DATA' }, (response) => { 
        if (response && response.success) {
          sendResponse({ success: true, summary: response.summary, count: response.count });
        } else {
          sendResponse({ success: false, error: response.error });
        }
      });
    })
  }

  return true;
});