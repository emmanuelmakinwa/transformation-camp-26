const BASE = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const COOKIE = "tc_admin_session";
const LEGACY_ADMINS = (process.env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);

function cookieToken(req) {
  for (const part of (req.headers.cookie || "").split(";")) {
    const item = part.trim();
    const index = item.indexOf("=");
    if (index > 0 && item.slice(0, index) === COOKIE) {
      try { return decodeURIComponent(item.slice(index + 1)); } catch { return null; }
    }
  }
  return null;
}

function headers(secret = SECRET) {
  return { apikey: secret, Authorization: "Bearer " + secret, "Content-Type": "application/json" };
}

async function rest(path, options = {}) {
  const response = await fetch(BASE + "/rest/v1/" + path, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  const raw = await response.text();
  let data = [];
  try { data = raw ? JSON.parse(raw) : []; } catch { throw new Error("Invalid admin database response."); }
  if (!response.ok) {
    const error = new Error("Admin database request failed.");
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

async function getUser(req) {
  if (!BASE || !ANON || !SECRET) return { error: "Admin service is not configured.", status: 503 };
  const token = cookieToken(req);
  if (!token) return { error: "Authentication required.", status: 401 };
  const response = await fetch(BASE + "/auth/v1/user", {
    headers: { apikey: ANON, Authorization: "Bearer " + token }
  });
  if (!response.ok) return { error: "Authentication required.", status: 401 };
  const user = await response.json();
  if (!user.id || !user.email) return { error: "Authentication required.", status: 401 };
  return { user };
}

async function resolveAdmin(user) {
  const query = "admin_users?select=user_id,email,role,is_active&user_id=eq." + encodeURIComponent(user.id) + "&limit=1";
  let rows = await rest(query);
  if (!rows.length && LEGACY_ADMINS.includes(user.email.toLowerCase())) {
    try {
      await rest("admin_users", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email.toLowerCase(),
          role: "super_admin",
          is_active: true
        })
      });
    } catch (error) {
      // A concurrent first login may have inserted the bootstrap row.
      if (error.code !== "23505") throw error;
    }
    rows = await rest(query);
  }
  const admin = rows[0];
  if (!admin || !admin.is_active) return null;
  return { id: user.id, email: user.email, role: admin.role };
}

async function requireAdmin(req, allowedRoles = ["super_admin"]) {
  const auth = await getUser(req);
  if (auth.error) return auth;
  const admin = await resolveAdmin(auth.user);
  if (!admin || !allowedRoles.includes(admin.role)) {
    return { error: "You do not have permission to access this resource.", status: 403 };
  }
  return { admin };
}

module.exports = { requireAdmin, rest };
