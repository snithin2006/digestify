document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('refresh-btn');
    const unreadCount = document.getElementById('unread-count');
    const urgentTotal = document.getElementById('urgent-total');
    const laterTotal = document.getElementById('later-total');
    
    // Urgent category counts
    const workUrgentCount = document.getElementById('work-urgent-count');
    const schoolUrgentCount = document.getElementById('school-urgent-count');
    const personalUrgentCount = document.getElementById('personal-urgent-count');
    
    // Later category counts
    const workLaterCount = document.getElementById('work-later-count');
    const schoolLaterCount = document.getElementById('school-later-count');
    const personalLaterCount = document.getElementById('personal-later-count');

    button.addEventListener('click', () => {
        console.log('Refreshing data popup.js...');

        button.disabled = true;
        const loadingDots = '<span class="loading-dots"><span></span><span></span><span></span></span>';
        unreadCount.innerHTML = loadingDots;
        urgentTotal.innerHTML = loadingDots;
        laterTotal.innerHTML = loadingDots;
        workUrgentCount.innerHTML = loadingDots;
        schoolUrgentCount.innerHTML = loadingDots;
        personalUrgentCount.innerHTML = loadingDots;
        workLaterCount.innerHTML = loadingDots;
        schoolLaterCount.innerHTML = loadingDots;
        personalLaterCount.innerHTML = loadingDots;

        chrome.runtime.sendMessage({ type: 'GET_REFRESH' }, (response) => {
            button.disabled = false;

            if (response && response.success) {
                unreadCount.textContent = response.unreadCount;
                urgentTotal.textContent = response.urgentCount;
                laterTotal.textContent = response.laterCount;
                
                // Update urgent category counts
                workUrgentCount.textContent = response.urgentWorkCount;
                schoolUrgentCount.textContent = response.urgentSchoolCount;
                personalUrgentCount.textContent = response.urgentPersonalCount;
                
                // Update later category counts
                workLaterCount.textContent = response.laterWorkCount;
                schoolLaterCount.textContent = response.laterSchoolCount;
                personalLaterCount.textContent = response.laterPersonalCount;
            } else {
                unreadCount.textContent = '--';
                urgentTotal.textContent = '--';
                laterTotal.textContent = '--';
                workUrgentCount.textContent = '0';
                schoolUrgentCount.textContent = '0';
                personalUrgentCount.textContent = '0';
                workLaterCount.textContent = '0';
                schoolLaterCount.textContent = '0';
                personalLaterCount.textContent = '0';
                console.error('Error:', response?.error || 'Unknown error');
            }
        });

        button.disabled = false;
    });
});