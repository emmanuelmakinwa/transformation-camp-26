const programSchedule = [
  {
    number: '01',
    label: 'Day one',
    date: '21 December 2026',
    sessions: [
      { name: 'Arrival & registration', time: '12:00 pm – 2:00 pm' },
      { name: 'Session 1', time: '2:00 pm – 5:00 pm' },
      { name: 'Session 2', time: '9:00 pm – 2:00 am', overnight: true },
    ],
  },
  {
    number: '02',
    label: 'Day two',
    date: '22 December 2026',
    sessions: [
      { name: 'Session 3', time: '8:00 am – 12:00 noon' },
      { name: 'Session 4', time: '2:00 pm – 5:00 pm' },
      { name: 'Session 5', time: '9:00 pm – 2:00 am', overnight: true },
    ],
  },
  {
    number: '03',
    label: 'Day three',
    date: '23 December 2026',
    sessions: [
      { name: 'Session 6', time: '8:00 am – 12:00 noon' },
      { name: 'Session 7', time: '2:00 pm – 5:00 pm' },
    ],
  },
];

const content = document.querySelector('#schedule-content');

if (content) {
  const dayCards = programSchedule.map((day) => `
    <article class="program-day-card" aria-labelledby="program-day-${day.number}">
      <header class="program-day-card-heading">
        <span class="program-day-number">${day.number}</span>
        <div><span class="program-day-label">${day.label}</span><h3 id="program-day-${day.number}">${day.date}</h3></div>
      </header>
      <div class="program-table-wrap">
        <table class="program-table">
          <thead><tr><th scope="col">Program</th><th scope="col">Time</th></tr></thead>
          <tbody>${day.sessions.map((session) => `<tr><th scope="row">${session.name}</th><td><span>${session.time}</span>${session.overnight ? '<small class="program-overnight-badge">Ends next day</small>' : ''}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </article>`).join('');

  content.innerHTML = `
    <div class="program-content-grid">
      <div class="program-itinerary">
        <div class="program-confirmed-label"><span aria-hidden="true"></span> Official program schedule</div>
        ${dayCards}
        <p class="program-overnight-note">Sessions 2 and 5 run overnight and conclude at 2:00 am the following day.</p>
        <section class="program-logistics" aria-labelledby="program-logistics-title">
          <div class="program-logistics-heading"><span class="eyebrow">Good to know</span><h3 id="program-logistics-title">Plan the essentials.</h3></div>
          <div class="program-logistics-grid">
            <article><span class="program-logistics-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg></span><div><span>Accommodation</span><strong>Paid</strong></div></article>
            <article><span class="program-logistics-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M3 13V6a1 1 0 0 1 1-1h10l6 6v2M3 13h17l1 3v2h-2m-13 0H3v-5m4 5h8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></span><div><span>Transportation</span><strong>Free</strong></div></article>
            <article><span class="program-logistics-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M4 3v7m3-7v7M4 7h3m-1.5 3v11M14 3v18m0-18c3 2 4 5 4 8h-4"/></svg></span><div><span>Feeding</span><strong>Free</strong></div></article>
          </div>
        </section>
      </div>
      <aside class="program-flyer-aside" aria-label="Official program flyer">
        <figure class="program-flyer-card">
          <figcaption><span class="eyebrow">Keep it handy</span><strong>Official camp schedule</strong></figcaption>
          <a class="program-flyer-image" href="assets/camp-26-program-schedule.jpg" target="_blank" rel="noreferrer" aria-label="Open the full-size Transformation Camp 26 program flyer">
            <img src="assets/camp-26-program-schedule.jpg" alt="Transformation Camp 26 program flyer listing arrival and registration, Sessions 1 through 7, their times, and the accommodation, transportation, and feeding details." loading="lazy">
          </a>
          <p class="program-flyer-update-note"><strong>Schedule update</strong><span>Sessions 3 and 6 now run 8:00 am–12:00 noon. The printed flyer still shows the original times; follow the updated timetable.</span></p>
          <a class="program-flyer-download" href="assets/camp-26-program-schedule.jpg" download="transformation-camp-26-program.jpg">View or download flyer <span aria-hidden="true">↗</span></a>
        </figure>
      </aside>
    </div>`;
}
