// selector for email rows
const emailRowSelector = 'tr.zA';

// summarizer api
let summarizer;
const SUMMARIZER_OPTIONS = {
  type: 'key-points',
  format: 'markdown',
  length: 'short',
};

function findEmails() {
  console.log('Finding Emails...');
  const emailRows = document.querySelectorAll(emailRowSelector);
  const emails = [];

  if (emailRows.length > 0) {
    console.log(`Found ${emailRows.length} email rows`);

    // parse each email row
    emailRows.forEach((row) => {
      try {
        // Sender info
        const senderEl = row.querySelector('span[email]');
        const nameEl = row.querySelector('span.yP, span.yW');
        
        // Subject (can be in different locations)
        const subjectEl = row.querySelector('span.bog') || row.querySelector('.y2');
        
        // Date/time
        const dateEl = row.querySelector('span.xW.xY, td.xW span');
        
        // Unread status
        const isUnread = row.classList.contains('zE');
        
        // Has attachment
        const hasAttachment = !!row.querySelector('span[title*="attachment"]');

        if (isUnread) {
          emails.push({
            sender: senderEl ? senderEl.getAttribute('email') : 'Unknown',
            senderName: nameEl ? nameEl.textContent.trim() : 'Unknown',
            subject: subjectEl ? subjectEl.textContent.trim() : '(No subject)',
            date: dateEl ? dateEl.textContent.trim() : 'Unknown',
            isUnread: isUnread,
            hasAttachment: hasAttachment
          });
        }
      } catch (e) {
        console.error('Error parsing email row:', e);
      }
    })
    
    console.log('Emails:', emails);
  } else {
    console.log('No emails found yet');
  }

  return emails;
}

async function refreshCount() {
  const unread = findEmails();
  const unreadCount = unread.length;

  const urgent = findEmails();
  const urgentCount = urgent.length;

  const later = findEmails();
  const laterCount = later.length;

  return { unreadCount, urgentCount, laterCount };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_DATA') {
    refreshCount()
    .then(({ summary, count }) => sendResponse({ success: true, summary, count }))
    .catch((error) => sendResponse({ success: false, error: error.message }));
  }

  return true;
});