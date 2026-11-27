(() => {
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date = (value) => value ? new Date(value).toLocaleDateString() : "—";
  async function request(method = "GET", body) {
    const response = await fetch("/api/admin-users", { method, credentials: "same-origin", cache: "no-store", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) { location.replace("/admin/login"); throw new Error("Access denied."); }
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }
  async function load() {
    $("#status").textContent = "Loading administrator accounts…";
    try {
      const data = await request();
      $("#admin-rows").innerHTML = data.admins.map((admin) => '<tr><td><strong>' + escape(admin.email) + '</strong></td><td><select data-role="' + escape(admin.user_id) + '"><option value="super_admin"' + (admin.role === "super_admin" ? " selected" : "") + '>Super Admin</option><option value="checkin_staff"' + (admin.role === "checkin_staff" ? " selected" : "") + '>Check-in Staff</option></select></td><td>' + (admin.is_active ? "Active" : "Deactivated") + '</td><td>' + escape(date(admin.created_at)) + '</td><td><button class="button-secondary" type="button" data-toggle="' + escape(admin.user_id) + '" data-active="' + String(admin.is_active) + '">' + (admin.is_active ? "Deactivate" : "Reactivate") + '</button></td></tr>').join("");
      $("#admin-rows").querySelectorAll("[data-role]").forEach((select) => select.addEventListener("change", async () => {
        select.disabled = true;
        try { await request("PATCH", { user_id: select.dataset.role, role: select.value }); $("#status").textContent = "Administrator role updated."; }
        catch (error) { $("#status").textContent = error.message; await load(); }
        finally { select.disabled = false; }
      }));
      $("#admin-rows").querySelectorAll("[data-toggle]").forEach((button) => button.addEventListener("click", async () => {
        button.disabled = true;
        try { await request("PATCH", { user_id: button.dataset.toggle, is_active: button.dataset.active !== "true" }); await load(); }
        catch (error) { $("#status").textContent = error.message; button.disabled = false; }
      }));
      $("#status").textContent = data.admins.length + " administrator account(s).";
    } catch (error) { $("#status").textContent = error.message; }
  }
  $("#invite-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#invite-submit"); button.disabled = true; $("#invite-status").textContent = "Sending invitation…";
    try {
      const data = await request("POST", { email: $("#invite-email").value.trim(), role: $("#invite-role").value });
      $("#invite-status").textContent = "Invitation sent to " + data.email + ".";
      $("#invite-form").reset(); await load();
    } catch (error) { $("#invite-status").textContent = error.message; }
    finally { button.disabled = false; }
  });
  $("#refresh").addEventListener("click", load);
  $("#logout").addEventListener("click", async () => { try { await fetch("/api/admin-auth", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); } finally { location.replace("/admin/login"); } });
  load();
})();
