(() => {
  const path = location.pathname.replace(/\/$/, "") || "/admin";
  const isCheckin = path === "/admin/check-in";
  fetch("/api/admin-auth", { credentials: "same-origin", cache: "no-store" })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.authenticated) throw new Error("unauthorized");
      if (data.role === "checkin_staff" && !isCheckin) {
        location.replace("/admin/check-in");
        return;
      }
      if (data.role !== "super_admin" && data.role !== "checkin_staff") {
        location.replace("/admin/login");
        return;
      }
      document.documentElement.dataset.adminRole = data.role;
      document.querySelectorAll("[data-super-admin-only]").forEach((node) => {
        node.hidden = data.role !== "super_admin";
      });
    })
    .catch(() => location.replace("/admin/login"));
})();
