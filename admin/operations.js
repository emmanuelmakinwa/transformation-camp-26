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
      $("#session-bars").innerHTML = Object.entries(data.attendance.per_session).map(([key, count], i) =>
        '<div class="bar-row"><span>' + safe(sessionLabels[i]) + '</span><div class="bar-track"><i style="width:' + (count / maxSession * 100) + '%"></i></div><strong>' + number(count) + '</strong></div>'
      ).join("");
      $("#general-accommodation").textContent = number(data.accommodation.general.yes);
      $("#minister-accommodation").textContent = number(data.accommodation.ministers.yes);
      $("#accommodation-unsure").textContent = number(data.accommodation.total_not_sure);
      const maxTrend = Math.max(1, ...data.trends.map((day) => day.general + day.ministers));
      $("#trend-chart").innerHTML = data.trends.map((day) => {
        const general = day.general / maxTrend * 100;
        const ministers = day.ministers / maxTrend * 100;
        return '<div class="trend-day" title="' + safe(day.date) + ': ' + number(day.general) + ' general, ' + number(day.ministers) + ' ministers"><div class="trend-bars"><i class="trend-general" style="height:' + general + '%"></i><i class="trend-minister" style="height:' + ministers + '%"></i></div><small>' + safe(day.date.slice(5)) + '</small></div>';
      }).join("");
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
