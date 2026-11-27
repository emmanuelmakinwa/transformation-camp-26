(() => {
  const root = document.querySelector("[data-camp-countdown]");
  if (!root) return;
  const target = new Date("2026-12-21T14:00:00+01:00").getTime();
  const fields = ["days", "hours", "minutes", "seconds"];
  const nodes = Object.fromEntries(fields.map((key) => [key, root.querySelector('[data-countdown="' + key + '"]')]));
  const pad = (value) => String(value).padStart(2, "0");
  function update() {
    const remaining = target - Date.now();
    if (remaining <= 0) {
      root.classList.add("countdown-started");
      root.querySelector("[data-countdown-message]").textContent = "Transformation Camp 26 is now underway.";
      fields.forEach((key) => { nodes[key].textContent = "00"; });
      return;
    }
    const total = Math.floor(remaining / 1000);
    nodes.days.textContent = String(Math.floor(total / 86400));
    nodes.hours.textContent = pad(Math.floor(total % 86400 / 3600));
    nodes.minutes.textContent = pad(Math.floor(total % 3600 / 60));
    nodes.seconds.textContent = pad(total % 60);
  }
  update();
  window.setInterval(update, 1000);
})();
