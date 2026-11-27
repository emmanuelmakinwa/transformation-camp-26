(() => {
  const $ = (selector) => document.querySelector(selector);
  const rows = $("#rows");
  const status = $("#status");
  let attendees = [];
  let timer;
  let request = 0;
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
  const date = (value) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString(); };
  async function api(url, options) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
    if (response.status === 401) { location.replace("/admin/login"); throw new Error("Your admin session has expired."); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The request could not be completed.");
    return data;
  }
  function render() {
    rows.innerHTML = attendees.map((person, index) => {
      const checked = person.checked_in;
      const statusHtml = checked
        ? '<strong>Checked in</strong><br><small>' + escape(date(person.checked_in_at)) + '</small>'
        : '<span>Not checked in</span>';
      const action = checked
        ? '<button type="button" class="button-secondary" disabled>Already checked in</button>'
        : '<button type="button" data-index="' + index + '">Check in</button>';
      return '<tr><td><strong>' + escape(person.name) + '</strong></td><td>' + (person.type === "minister" ? "Pastor / minister" : "General attendee") + '</td><td>' + escape(person.phone) + '</td><td>' + escape(person.reference) + '</td><td>' + statusHtml + '</td><td>' + action + '</td></tr>';
    }).join("");
    rows.querySelectorAll("button[data-index]").forEach((button) => button.addEventListener("click", () => checkIn(Number(button.dataset.index), button)));
  }
  async function search() {
    const current = ++request;
    const term = $("#search").value.trim();
    attendees = [];
    render();
    if (term.length < 2) { status.textContent = "Enter at least 2 characters to search registrations."; return; }
    status.textContent = "Searching both registration databases…";
    try {
      const query = new URLSearchParams({ session_key: $("#session").value, search: term });
      const data = await api("/api/admin-checkins?" + query);
      if (current !== request) return;
      attendees = data.attendees || [];
      render();
      status.textContent = attendees.length ? attendees.length + " matching registration(s). Select Check in to record attendance." : "No matching completed registrations were found.";
    } catch (error) {
      if (current !== request) return;
      status.textContent = error.message;
    }
  }
  async function checkIn(index, button) {
    const person = attendees[index];
    if (!person || person.checked_in) return;
    button.disabled = true;
    button.textContent = "Recording…";
    status.textContent = "Recording check-in…";
    try {
      const data = await api("/api/admin-checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_key: $("#session").value, attendee_type: person.type, attendee_id: person.id })
      });
      person.checked_in = true;
      person.checked_in_at = data.checkin.checked_in_at;
      person.checked_in_by = data.checkin.checked_in_by;
      render();
      status.textContent = data.already_checked_in ? "This attendee was already checked in for this session." : "Check-in recorded successfully.";
    } catch (error) {
      button.disabled = false;
      button.textContent = "Check in";
      status.textContent = error.message;
    }
  }
  $("#search").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(search, 250); });
  $("#session").addEventListener("change", () => { clearTimeout(timer); search(); });
  $("#refresh").addEventListener("click", search);
  $("#logout").addEventListener("click", async () => {
    try { await fetch("/api/admin-auth", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); }
    finally { location.replace("/admin/login"); }
  });
  search();
})();
