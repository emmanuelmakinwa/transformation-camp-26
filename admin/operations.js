(() => {
  const $ = (selector) => document.querySelector(selector);
  const number = (value) => Number(value || 0).toLocaleString();
  const sessionLabels = ["21 Dec · 2–5 pm","21 Dec · 8 pm–2 am","22 Dec · 8 am–12 pm","22 Dec · 2–5 pm","22 Dec · 8 pm–2 am","23 Dec · 8 am–12 pm","23 Dec · 2–5 pm"];
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function load() {
    $("#status").textContent = "Refreshing event data…";
    try {
      const response = await fetch("/api/admin-dashboard", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) { location.replace("/admin/login"); return; }
      if (!response.ok) throw new Error(data.error || "Unable to load event data.");
      $("#general-total").textContent = number(data.registrations.general);
      $("#minister-total").textContent = number(data.registrations.ministers);
      $("#registration-total").textContent = number(data.registrations.total);
      $("#unique-attendance").textContent = number(data.attendance.unique_attendees);
      $("#total-checkins").textContent = number(data.attendance.total_checkins);
      $("#outstanding").textContent = number(data.attendance.outstanding);
      const maxSession = Math.max(1, ...Object.values(data.attendance.per_session));
      $("#session-bars").innerHTML = Object.entries(data.attendance.per_session).map(([key, count], i) => {
        const width = Math.round(count / maxSession * 100);
        return '<div class="bar-row"><span>' + safe(sessionLabels[i]) + '</span><svg class="bar-svg" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="100" height="10" rx="5" fill="#edf1eb"></rect><rect x="0" y="0" width="' + width + '" height="10" rx="5" fill="#547a5e"></rect></svg><strong>' + number(count) + '</strong></div>';
      }).join("");
      $("#general-accommodation").textContent = number(data.accommodation.general.yes);
      $("#minister-accommodation").textContent = number(data.accommodation.ministers.yes);
      $("#accommodation-unsure").textContent = number(data.accommodation.total_not_sure);
      const maxTrend = Math.max(1, ...data.trends.map((day) => day.general + day.ministers));
      $("#trend-chart").innerHTML = '<svg class="trend-svg" viewBox="0 0 700 170" role="img" aria-label="Daily registrations for the last fourteen days">' + data.trends.map((day, index) => {
        const x = 8 + index * 49;
        const generalHeight = Math.round(day.general / maxTrend * 140);
        const ministerHeight = Math.round(day.ministers / maxTrend * 140);
        const label = safe(day.date.slice(5));
        return '<g><title>' + safe(day.date) + ': ' + number(day.general) + ' general, ' + number(day.ministers) + ' ministers</title><rect x="' + x + '" y="' + (150 - generalHeight) + '" width="13" height="' + generalHeight + '" rx="3" fill="#547a5e"></rect><rect x="' + (x + 15) + '" y="' + (150 - ministerHeight) + '" width="13" height="' + ministerHeight + '" rx="3" fill="#b7a46a"></rect><text x="' + (x + 14) + '" y="166" text-anchor="middle">' + label + '</text></g>';
      }).join("") + '</svg>';
      $("#generated-at").textContent = "Updated " + new Date(data.generated_at).toLocaleTimeString();
      $("#status").textContent = "Event data is up to date.";
    } catch (error) { $("#status").textContent = error.message; }
  }
  $("#refresh").addEventListener("click", load);
  $("#logout").addEventListener("click", async () => {
    try { await fetch("/api/admin-auth", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); }
    finally { location.replace("/admin/login"); }
  });
  load();
  window.setInterval(load, 30000);
})();
