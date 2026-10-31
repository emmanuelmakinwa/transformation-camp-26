// The detailed public schedule remains hidden until the camp team approves its release.
// Add approved session records and set released: true, then deploy the updated site.
const programSchedule = { released: false, sessions: [] };
const content = document.querySelector('#schedule-content');

if (content) {
  if (!programSchedule.released) {
    content.innerHTML = `
      <section class="program-release-card">
        <div class="program-release-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01"/></svg></div>
        <div class="program-release-copy"><span class="eyebrow">Detailed schedule</span><h2>Session times are being finalized.</h2><p>The camp dates and venue are confirmed. The full program, including session times, will be added here once approved.</p></div>
        <span class="program-release-status"><span aria-hidden="true"></span> Coming soon</span>
      </section>`;
  } else {
    content.innerHTML = `<section class="program-release-card program-release-card-ready"><div class="program-release-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m5 12 4 4L19 6"/></svg></div><div class="program-release-copy"><span class="eyebrow">Confirmed program</span><h2>Plan your camp days.</h2><p>Explore the confirmed sessions below.</p></div><span class="program-release-status program-release-status-ready">Schedule available</span></section><div class="schedule-list">${programSchedule.sessions.map((session) => `<article class="schedule-session"><time>${session.date} · ${session.time}</time><div><h2>${session.title}</h2><p>${session.description || ''}</p></div></article>`).join('')}</div>`;
  }
}
