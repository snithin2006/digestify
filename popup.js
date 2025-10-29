document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('refresh-btn');
    const summaryBox = document.getElementById('summary-box');
    const unreadCount = document.getElementById('unread-count');''

    button.addEventListener('click', () => {
        button.disabled = true;
        summaryBox.textContent = 'Fetching...';
        unreadCount.textContent = '📧 Unread: Fetching...';

        chrome.runtime.sendMessage({ type: 'GET_REFRESH' }, (response) => {
            button.disabled = false;

            if (response && response.success) {
                summaryBox.textContent = response.summary;
                unreadCount.textContent = '📧 Unread: ' + response.count;
            } else {
                summaryBox.textContent = `Error: ${response.error || 'Unknown error'}`;
            }
        });
    });
});  