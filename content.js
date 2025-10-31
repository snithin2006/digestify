// selector for email rows
const emailRowSelector = 'tr.zA';

// summarizer api
let summarizer;
const SUMMARIZER_OPTIONS = {
  type: 'key-points',
  format: 'markdown',
  length: 'short',
};

// Global email storage - persists across function calls
let globalEmailData = {
  unread: [],
  work: [],
  school: [],
  personal: [],
  urgent: [],
  later: [],
  urgentWork: [],
  laterWork: [],
  urgentSchool: [],
  laterSchool: [],
  urgentPersonal: [],
  laterPersonal: [],
  urgentWorkSummary: '',
  laterWorkSummary: '',
  urgentSchoolSummary: '',
  laterSchoolSummary: '',
  urgentPersonalSummary: '',
  laterPersonalSummary: '',
};

function findEmails() {
  console.log('Finding Emails...');
  const emailRows = document.querySelectorAll(emailRowSelector);
  globalEmailData.unread = [];

  if (emailRows.length > 0) {
    console.log(`Found ${emailRows.length} email rows`);

    // parse each email row
    emailRows.forEach((row) => {
      try {
        // Thread ID
        const idElement = row.querySelector('[data-legacy-thread-id]');
        
        let threadId = idElement 
                    ? idElement.getAttribute('data-legacy-thread-id') 
                    : null;
                
        if (!threadId || threadId.length < 10) {
            console.warn('Failed to extract valid Thread ID from data-legacy-thread-id attribute.', row);
            return; // Skip this row if ID extraction fails
        }
        
        console.log('threadId:', threadId);

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
          globalEmailData.unread.push({
            threadId: threadId,
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
  } else {
    console.log('No emails found yet');
  }
}

async function findInboxTypes() {
  console.log('starting inbox types');

  // Check availability first
  const availability = await LanguageModel.availability();
  console.log('LanguageModel availability:', availability);
  
  if (availability === 'no') {
    throw new Error('LanguageModel is not available on this device');
  }

  const session = await LanguageModel.create({
    systemPrompt: "You are a helpful email classifier. Always respond with only a single word.",
  });
  console.log('Session created successfully');
  
  // Clear global inbox types
  globalEmailData.work = [];
  globalEmailData.school = [];
  globalEmailData.personal = [];
  let c = 1;

  for (const email of globalEmailData.unread) {
    try {
      const prompt = `You are an email inbox classifier. Your task is to determine whether an email belongs to Work, School, or Personal categories.

CLASSIFICATION RULES:

WORK:
- Emails from corporate domains (e.g., @company.com, @corporation.com)
- Professional language and formal tone
- Work-related keywords: project, meeting, client, report, deadline, team, manager, colleague
- Sender titles like CEO, Director, Manager, VP, etc.
- Business-related subjects: contracts, invoices, proposals, schedules
- Professional email signatures

SCHOOL:
- Emails from educational domains (e.g., @university.edu, @college.edu, @school.edu)
- Academic-related keywords: assignment, exam, course, class, lecture, professor, TA, grade, semester
- School organization emails: clubs, student government, campus events
- Academic titles: Professor, Dr., Dean, Instructor
- Course codes in subject lines (e.g., CS101, MATH202)

PERSONAL:
- Emails from personal domains (e.g., @gmail.com, @yahoo.com, @outlook.com)
- Casual or informal tone
- Personal matters: family, friends, hobbies, personal shopping
- Marketing and promotional emails
- Newsletters and subscriptions
- Social media notifications
- Online services (Amazon, Netflix, banking, etc.)
- Personal appointments or reservations

ANALYZE THIS EMAIL:

From: ${email.sender}
Sender Name: ${email.senderName}
Subject: ${email.subject}

Based on the sender's email domain, the subject line, and the content, determine which inbox this email belongs to.

RESPOND WITH ONLY ONE WORD: work OR school OR personal

Do not include any explanation, reasoning, or additional text. Just output one of these three words.`;

      const result = await session.prompt(prompt);

      // Get the inbox type from the simple word response
      const inboxType = result.trim().toLowerCase();

      if (inboxType === 'work') {
        globalEmailData.work.push(email);
      } else if (inboxType === 'school') {
        globalEmailData.school.push(email);
      } else {
        globalEmailData.personal.push(email);
      }

      console.log('count:', c);
      c++;
    } catch (error) {
      console.error('Error classifying email:', email.subject, error);
      // Default to personal if classification fails
      globalEmailData.personal.push(email);
      c++;
    }
  }

  console.log('done with inbox types');
}

async function findBuckets() {
  console.log('starting buckets');

  const session = await LanguageModel.create({
    systemPrompt: "You are a helpful email classifier. Always respond with only a single word.",
  });
  console.log('Buckets session created successfully');
  
  // Clear and use global storage
  globalEmailData.urgent = [];
  globalEmailData.later = [];
  globalEmailData.urgentWork = [];
  globalEmailData.laterWork = [];
  globalEmailData.urgentSchool = [];
  globalEmailData.laterSchool = [];
  globalEmailData.urgentPersonal = [];
  globalEmailData.laterPersonal = [];
  let c = 1;

  for (const email of globalEmailData.work) {
    try {
      const prompt = `You are an intelligent email classifier specializing in workplace communications. Your task is to analyze an email and determine if it requires urgent attention or can be followed up with later.

CLASSIFICATION RULES FOR WORK EMAILS:

URGENT - Respond now if:
1. The email is time-sensitive (mentions deadlines, "today", "ASAP", "urgent", "by EOD", specific dates/times, etc)
2. The sender appears to be in a leadership position (uses authoritative language, makes requests/demands, signs off with titles like "Director", "VP", "Manager", "CEO", etc)
3. The email is customer-related or mentions customer issues, complaints, or requests
4. The email explicitly requests a deliverable or action item from you
5. The email is following up on something you were supposed to do
6. Multiple people are CC'd and awaiting your response
7. The tone is formal and requests immediate action

LATER - Can wait if:
1. The email is informational only (FYI, updates, announcements, newsletters)
2. The email is a general company-wide or team-wide update
3. No specific action is requested from you personally
4. The email is about future events without immediate deadlines
5. The email is a casual check-in or non-urgent question
6. The email is automated (reports, notifications, system messages)

ANALYZE THIS EMAIL:

From: ${email.sender}
Sender Name: ${email.senderName}
Subject: ${email.subject}
Date: ${email.date}

Based on the sender's tone, the subject line, and the content preview, classify this email.

RESPOND WITH ONLY ONE WORD: urgent OR later

Do not include any explanation, reasoning, or additional text. Just output one of these two words.`;

      const result = await session.prompt(prompt);
      
      // Get the bucket from the simple word response
      const bucket = result.trim().toLowerCase();

      console.log('Email:', email.subject);
      console.log('Inbox type: work');
      console.log('Bucket:', bucket);

      if (bucket === 'urgent') {
        globalEmailData.urgent.push(email);
        globalEmailData.urgentWork.push(email);
      } else {
        globalEmailData.later.push(email);
        globalEmailData.laterWork.push(email);
      }

      console.log('count:', c);
      c++;
    } catch (error) {
      console.error('Error classifying work email:', email.subject, error);
      // Default to later if classification fails
      globalEmailData.later.push(email);
      globalEmailData.laterWork.push(email);
      c++;
    }
  }

  for (const email of globalEmailData.school) {
    try {
      const prompt = `You are an intelligent email classifier specializing in academic communications. Your task is to analyze an email and determine if it requires urgent attention or can be followed up with later.

CLASSIFICATION RULES FOR SCHOOL EMAILS:

URGENT - Respond now if:
1. The email is time-sensitive (mentions deadlines, "due today", "submit by", specific assignment dates, exam schedules)
2. A professor, TA, or instructor is reaching out to YOU SPECIFICALLY (uses your name, references your specific work, asks you a direct question, requests a meeting, etc)
3. The email is about a grade concern, academic standing, or requires your response to continue (permission requests, forms to sign)
4. A club leader or organization is reaching out to you directly for something you're responsible for
5. The email is a direct reply to something you sent (indicated by "Re:" and personal context)
6. The email mentions an urgent issue with your enrollment, registration, or account
7. Someone is waiting on your response to proceed with a group project or collaboration

LATER - Can wait if:
1. The email is a mass communication to the entire class (starts with "Hi everyone", "Dear students", "Class announcement", etc)
2. The email is a general reminder about upcoming lectures, office hours, or future assignments with no immediate deadline
3. The email is a newsletter from a club, department, or student organization
4. The email is informational only (policy updates, campus events, general announcements, etc)
5. The email is automated (grade posted notifications, library due date reminders with time to spare, system messages, etc)
6. The email is a weekly/regular digest or recap
7. No specific action is requested from you personally

KEY INDICATORS TO LOOK FOR:
- Personal vs. mass communication: "Hi [your name]" vs "Hi everyone" or "Dear students"
- Direct questions vs. general information
- Immediate deadlines vs. future planning
- Your specific work/involvement vs. general class information

ANALYZE THIS EMAIL:

From: ${email.sender}
Sender Name: ${email.senderName}
Subject: ${email.subject}
Date: ${email.date}

Based on whether this is direct personal communication or mass communication, the urgency of any deadlines, and whether you specifically need to take action, classify this email.

RESPOND WITH ONLY ONE WORD: urgent OR later

Do not include any explanation, reasoning, or additional text. Just output one of these two words.`;

      const result = await session.prompt(prompt);
      
      // Get the bucket from the simple word response
      const bucket = result.trim().toLowerCase();

      console.log('Email:', email.subject);
      console.log('Inbox type: school');
      console.log('Bucket:', bucket);

      if (bucket === 'urgent') {
        globalEmailData.urgent.push(email);
        globalEmailData.urgentSchool.push(email);
      } else {
        globalEmailData.later.push(email);
        globalEmailData.laterSchool.push(email);
      }

      console.log('count:', c);
      c++;
    } catch (error) {
      console.error('Error classifying school email:', email.subject, error);
      // Default to later if classification fails
      globalEmailData.later.push(email);
      globalEmailData.laterSchool.push(email);
      c++;
    }
  }

  for (const email of globalEmailData.personal) {
    try {
      const prompt = `You are an intelligent email classifier specializing in personal communications. Your task is to analyze an email and determine if it requires urgent attention or can be followed up with later.

CLASSIFICATION RULES FOR PERSONAL EMAILS:

URGENT - Respond now if:
1. The email is time-sensitive with an immediate deadline (job applications due soon, event RSVPs, appointment confirmations, booking deadlines, etc)
2. The email contains important account or financial information requiring action (password resets, suspicious activity alerts, payment due, billing issues, etc)
3. The email is about job opportunities, interviews, or professional networking that requires a timely response
4. The email is from a real person you know personally asking you a direct question or requesting something specific
5. The email contains time-sensitive travel information (flight changes, booking confirmations, check-in reminders, etc)
6. The email is about appointments, reservations, or commitments happening soon (doctor appointments, dinner reservations, event tickets, etc)
7. The email requires verification, confirmation, or action to prevent account/service interruption

LATER - Can wait if:
1. The email is promotional or marketing content (sales, deals, special offers, advertisements)
2. The email is a newsletter, digest, or subscription content (blogs, news roundups, weekly updates)
3. The email is from social media platforms (notifications, friend requests, activity updates)
4. The email is automated and informational only (receipts for completed purchases, shipping updates with no issues, general notifications)
5. The email is spam or unsolicited bulk mail
6. The email is about future events or opportunities with no immediate deadline
7. The email is a general update that doesn't require any action from you

KEY INDICATORS TO LOOK FOR:
- Action required vs. informational only
- Immediate deadlines vs. general marketing
- Real person vs. automated system
- Time-sensitive vs. "whenever convenient"
- Critical account issues vs. promotional content

ANALYZE THIS EMAIL:

From: ${email.sender}
Sender Name: ${email.senderName}
Subject: ${email.subject}
Date: ${email.date}

Based on whether this requires immediate action or response, has time-sensitive deadlines, or is just promotional/informational content, classify this email.

RESPOND WITH ONLY ONE WORD: urgent OR later

Do not include any explanation, reasoning, or additional text. Just output one of these two words.`;

      const result = await session.prompt(prompt);
      
      // Get the bucket from the simple word response
      const bucket = result.trim().toLowerCase();

      console.log('Email:', email.subject);
      console.log('Inbox type: personal');
      console.log('Bucket:', bucket);

      if (bucket === 'urgent') {
        globalEmailData.urgent.push(email);
        globalEmailData.urgentPersonal.push(email);
      } else {
        globalEmailData.later.push(email);
        globalEmailData.laterPersonal.push(email);
      }

      console.log('count:', c);
      c++;
    } catch (error) {
      console.error('Error classifying personal email:', email.subject, error);
      // Default to later if classification fails
      globalEmailData.later.push(email);
      globalEmailData.laterPersonal.push(email);
      c++;
    }
  }

  console.log('done with buckets');
}

async function summarizeEmails(emails) {
  if (!emails || emails.length === 0) {
    return 'No emails to summarize';
  }

  // Check if Summarizer API is available
  const canSummarize = await Summarizer.availability();
  if (canSummarize === 'unavailable') {
    console.error('Summarizer API not available');
    return 'Summary not available';
  }

  // Create summarizer with options
  const summarizer = await Summarizer.create(SUMMARIZER_OPTIONS);

  try {
    // Combine all emails into one text block
    const allEmailsText = emails.map((email, index) => `
Email ${index + 1}:
From: ${email.senderName} (${email.sender})
Subject: ${email.subject}
Date: ${email.date}
---`).join('\n\n');

    // Summarize all emails in one call
    const summary = await summarizer.summarize(allEmailsText, {
      context: 'These are emails from an inbox. Provide a brief overview of what these emails are about and highlight any important actions needed.'
    });

    // Clean up
    summarizer.destroy();

    return summary;
  } catch (error) {
    console.error('Error summarizing emails:', error);
    summarizer.destroy();
    return 'Unable to generate summary';
  }
}

async function refresh() {
  // Find and classify emails
  findEmails();
  const unreadCount = globalEmailData.unread.length;
  console.log(unreadCount);

  if (unreadCount === 0) {
    return { unreadCount: 0, urgentCount: 0, laterCount: 0, urgentWorkCount: 0, laterWorkCount: 0, urgentSchoolCount: 0, laterSchoolCount: 0, urgentPersonalCount: 0, laterPersonalCount: 0 };
  }
  
  // Classify inbox types
  await findInboxTypes();
  console.log('inboxTypes', { work: globalEmailData.work.length, school: globalEmailData.school.length, personal: globalEmailData.personal.length });

  // Classify buckets
  await findBuckets();
  console.log('bucketTypes', { urgent: globalEmailData.urgent.length, later: globalEmailData.later.length });
  
  // Get counts from global storage
  const urgentCount = globalEmailData.urgent.length;
  const laterCount = globalEmailData.later.length;
  const urgentWorkCount = globalEmailData.urgentWork.length;
  const laterWorkCount = globalEmailData.laterWork.length;
  const urgentSchoolCount = globalEmailData.urgentSchool.length;
  const laterSchoolCount = globalEmailData.laterSchool.length;
  const urgentPersonalCount = globalEmailData.urgentPersonal.length;
  const laterPersonalCount = globalEmailData.laterPersonal.length;

  // Summarize emails
  globalEmailData.urgentWorkSummary = await summarizeEmails(globalEmailData.urgentWork);
  globalEmailData.laterWorkSummary = await summarizeEmails(globalEmailData.laterWork);
  globalEmailData.urgentSchoolSummary = await summarizeEmails(globalEmailData.urgentSchool);
  globalEmailData.laterSchoolSummary = await summarizeEmails(globalEmailData.laterSchool);
  globalEmailData.urgentPersonalSummary = await summarizeEmails(globalEmailData.urgentPersonal);
  globalEmailData.laterPersonalSummary = await summarizeEmails(globalEmailData.laterPersonal);

  return { unreadCount, urgentCount, laterCount, urgentWorkCount, laterWorkCount, urgentSchoolCount, laterSchoolCount, urgentPersonalCount, laterPersonalCount };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_DATA') {
    refresh()
      .then(({ 
        unreadCount, 
        urgentCount, 
        laterCount, 
        urgentWorkCount, 
        laterWorkCount, 
        urgentSchoolCount, 
        laterSchoolCount, 
        urgentPersonalCount, 
        laterPersonalCount 
      }) => {
        sendResponse({ 
          success: true, 
          unreadCount, 
          urgentCount, 
          laterCount, 
          urgentWorkCount, 
          laterWorkCount, 
          urgentSchoolCount, 
          laterSchoolCount, 
          urgentPersonalCount, 
          laterPersonalCount 
        });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
  } else if (message.type === 'SUMMARIZE_EMAILS') {
    const { category, priority } = message;
    
    // Get emails from global storage based on category and priority
    let summary = '';
    const categoryLower = category.toLowerCase();
    const priorityLower = priority.toLowerCase();
    
    if (priorityLower === 'urgent') {
      if (categoryLower === 'work') {
        summary = globalEmailData.urgentWorkSummary;
      } else if (categoryLower === 'school') {
        summary = globalEmailData.urgentSchoolSummary;
      } else if (categoryLower === 'personal') {
        summary = globalEmailData.urgentPersonalSummary;
      }
    } else {
      if (categoryLower === 'work') {
        summary = globalEmailData.laterWorkSummary;
      } else if (categoryLower === 'school') {
        summary = globalEmailData.laterSchoolSummary;
      } else if (categoryLower === 'personal') {
        summary = globalEmailData.laterPersonalSummary;
      }
    }

    sendResponse({ success: true, summary });
  }

  return true;
});