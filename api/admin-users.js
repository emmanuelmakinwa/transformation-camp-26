const { requireAdmin, rest } = require("./_lib/admin-access");
const json = (res, status, data) => res.status(status).json(data);
const validOrigin = (req) => {
  if (!req.headers.origin || !req.headers.host) return false;
  try { return new URL(req.headers.origin).host === req.headers.host; } catch { return false; }
};
function readBody(req) {
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { return null; } }
  return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}
async function activeSuperAdmins() {
  const rows = await rest("admin_users?select=user_id&role=eq.super_admin&is_active=eq.true");
  return rows.length;
}
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  let auth;
  try { auth = await requireAdmin(req, ["super_admin"]); }
  catch { return json(res, 503, { error: "Admin service is temporarily unavailable." }); }
  if (auth.error) return json(res, auth.status, { error: auth.error });

  if (req.method === "GET") {
    try {
      const admins = await rest("admin_users?select=user_id,email,role,is_active,created_at,updated_at&order=created_at.asc");
      return json(res, 200, { admins });
    } catch { return json(res, 500, { error: "Unable to retrieve administrator accounts." }); }
  }
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, POST, PATCH");
    return json(res, 405, { error: "Method not allowed." });
  }
  if (!validOrigin(req)) return json(res, 403, { error: "Forbidden." });
  const body = readBody(req);
  if (!body) return json(res, 400, { error: "Invalid request." });

  if (req.method === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        !["super_admin", "checkin_staff"].includes(role)) {
      return json(res, 400, { error: "Enter a valid email and administrator role." });
    }
    try {
      const existing = await rest("admin_users?select=user_id&email=eq." + encodeURIComponent(email) + "&limit=1");
      if (existing.length) return json(res, 409, { error: "This email already has an administrator account." });
      const redirect = process.env.ADMIN_INVITE_REDIRECT_URL || "https://www.transformationcamp.com.ng/admin/login";
      const invite = await fetch(process.env.SUPABASE_URL + "/auth/v1/invite?redirect_to=" + encodeURIComponent(redirect), {
        method: "POST",
        headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: "Bearer " + process.env.SUPABASE_SECRET_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const invited = await invite.json().catch(() => ({}));
      if (!invite.ok || !invited.id) return json(res, 400, { error: invited.msg || invited.message || "Supabase could not send the invitation." });
      try {
        await rest("admin_users", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ user_id: invited.id, email, role, is_active: true, created_by: auth.admin.id })
        });
      } catch (error) {
        await fetch(process.env.SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(invited.id), {
          method: "DELETE",
          headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: "Bearer " + process.env.SUPABASE_SECRET_KEY }
        }).catch(() => {});
        throw error;
      }
      return json(res, 201, { success: true, email, role });
    } catch (error) {
      console.error("Administrator invitation failed.");
      return json(res, 500, { error: "Unable to create the administrator invitation." });
    }
  }

  const userId = String(body.user_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return json(res, 400, { error: "Invalid administrator account." });
  try {
    const currentRows = await rest("admin_users?select=user_id,email,role,is_active&user_id=eq." + encodeURIComponent(userId) + "&limit=1");
    const current = currentRows[0];
    if (!current) return json(res, 404, { error: "Administrator account not found." });
    const patch = {};
    if (body.role !== undefined) {
      if (!["super_admin", "checkin_staff"].includes(body.role)) return json(res, 400, { error: "Choose a valid role." });
      patch.role = body.role;
    }
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") return json(res, 400, { error: "Choose a valid account status." });
      patch.is_active = body.is_active;
    }
    if (!Object.keys(patch).length) return json(res, 400, { error: "No account changes were provided." });
    const removesSuperAdmin = current.role === "super_admin" && current.is_active &&
      ((patch.role && patch.role !== "super_admin") || patch.is_active === false);
    if (removesSuperAdmin && await activeSuperAdmins() <= 1) {
      return json(res, 409, { error: "The last active Super Admin cannot be demoted or deactivated." });
    }
    patch.updated_at = new Date().toISOString();
    const updated = await rest("admin_users?user_id=eq." + encodeURIComponent(userId), {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch)
    });
    return json(res, 200, { admin: updated[0] });
  } catch {
    return json(res, 500, { error: "Unable to update this administrator account." });
  }
};
