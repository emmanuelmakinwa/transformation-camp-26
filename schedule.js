// The public schedule is intentionally empty and locked until the camp team approves release.
// Add approved session records and set released: true, then deploy the updated site.
const programSchedule = { released: false, sessions: [] };
const content = document.querySelector('#schedule-content');

if (!programSchedule.released) {
  content.innerHTML = '<section class="schedule-locked"><span class="lock-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></svg></span><span class="eyebrow">Schedule locked</span><h2>We’ll share the program soon.</h2><p>The program schedule is being prepared and is not yet available to the public. Please check back after the camp team announces its release.</p><span class="schedule-status">Currently unavailable</span></section>';
} else {
  content.innerHTML = `<div class="schedule-list">${programSchedule.sessions.map((session) => `<article class="schedule-session"><time>${session.date} · ${session.time}</time><div><h2>${session.title}</h2><p>${session.description || ''}</p></div></article>`).join('')}</div>`;
}
