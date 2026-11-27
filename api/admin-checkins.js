const BASE = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const COOKIE = "tc_admin_session";
const SESSIONS = new Set(["session-1","session-2","session-3","session-4","session-5","session-6","session-7"]);

function json(res, status, data) { res.status(status).json(data); }
function getCookie(req) {
  for (const part of (req.headers.cookie || "").split(";")) {
    const item = part.trim();
    const index = item.indexOf("=");
    if (index > 0 && item.slice(0, index) === COOKIE) {
      try { return decodeURIComponent(item.slice(index + 1)); } catch { return null; }
    }
  }
  return null;
}
function allowed(email) {
  return !!email && (process.env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}
function validOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return req.method === "GET";
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
async function getAdmin(req) {
  if (!BASE || !ANON || !SECRET) return { error: "Check-in service is not configured.", status: 503 };
  const token = getCookie(req);
  if (!token) return { error: "Authentication required.", status: 401 };
  const response = await fetch(BASE + "/auth/v1/user", { headers: { apikey: ANON, Authorization: "Bearer " + token } });
  if (!response.ok) return { error: "Authentication required.", status: 401 };
  const user = await response.json();
  if (!allowed(user.email)) return { error: "Authentication required.", status: 401 };
  return { email: user.email };
}
const dbHeaders = () => ({ apikey: SECRET, Authorization: "Bearer " + SECRET, "Content-Type": "application/json" });
async function db(path, options = {}) {
  const response = await fetch(BASE + "/rest/v1/" + path, { ...options, headers: { ...dbHeaders(), ...(options.headers || {}) } });
  const text = await response.text();
  let data = [];
  try { data = text ? JSON.parse(text) : []; } catch { throw new Error("Invalid database response."); }
  if (!response.ok) {
    const error = new Error("Database request failed.");
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return { data, response };
}
function cleanSearch(value) {
  return String(value || "").replace(/[,%()_*]/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
async function checkinsFor(sessionKey, generalIds, ministerIds) {
  const result = new Map();
  const requests = [];
  if (generalIds.length) requests.push(db("attendee_checkins?select=id,general_registration_id,checked_in_at,checked_in_by&session_key=eq." + sessionKey + "&general_registration_id=in.(" + generalIds.join(",") + ")"));
  if (ministerIds.length) requests.push(db("attendee_checkins?select=id,minister_registration_id,checked_in_at,checked_in_by&session_key=eq." + sessionKey + "&minister_registration_id=in.(" + ministerIds.join(",") + ")"));
  const responses = await Promise.all(requests);
  for (const response of responses) for (const row of response.data) {
    const key = row.general_registration_id ? "general:" + row.general_registration_id : "minister:" + row.minister_registration_id;
    result.set(key, { checked_in: true, checked_in_at: row.checked_in_at, checked_in_by: row.checked_in_by });
  }
  return result;
}
async function searchAttendees(sessionKey, term) {
  const encoded = encodeURIComponent(term);
  const tokens = term.split(" ").filter(Boolean).slice(0, 4);
  const nameMatch = tokens.length > 1 ? "and(first_name.ilike.*" + encodeURIComponent(tokens[0]) + "*,last_name.ilike.*" + encodeURIComponent(tokens.slice(1).join(" ")) + "*)" : "first_name.ilike.*" + encoded + "*,last_name.ilike.*" + encoded;
  const generalFilter = "or=(" + nameMatch + ",phone.ilike.*" + encoded + "*,registration_reference.ilike.*" + encoded + "*)";
  const ministerFilter = "or=(full_name.ilike.*" + encoded + "*,phone.ilike.*" + encoded + "*,registration_reference.ilike.*" + encoded + "*)";
  const [general, ministers] = await Promise.all([
    db("registrations?select=id,registration_reference,first_name,last_name,phone&" + generalFilter + "&order=created_at.desc&limit=15"),
    db("minister_registrations?select=id,registration_reference,full_name,phone&" + ministerFilter + "&order=created_at.desc&limit=15")
  ]);
  const generalRows = general.data.map((row) => ({ id: row.id, type: "general", name: [row.first_name, row.last_name].filter(Boolean).join(" "), phone: row.phone, reference: row.registration_reference }));
  const ministerRows = ministers.data.map((row) => ({ id: row.id, type: "minister", name: row.full_name, phone: row.phone, reference: row.registration_reference }));
  const checked = await checkinsFor(sessionKey, generalRows.map((row) => row.id), ministerRows.map((row) => row.id));
  return [...generalRows, ...ministerRows].map((row) => ({ ...row, ...(checked.get(row.type + ":" + row.id) || { checked_in: false }) }));
}
async function handlePost(req, res, admin) {
  if (!req.headers.origin || !validOrigin(req)) return json(res, 403, { error: "Forbidden." });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { return json(res, 400, { error: "Invalid request." }); } }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json(res, 400, { error: "Invalid request." });
  const sessionKey = String(body.session_key || "");
  const attendeeType = String(body.attendee_type || "");
  const attendeeId = String(body.attendee_id || "");
  if (!SESSIONS.has(sessionKey) || !["general", "minister"].includes(attendeeType) || !/^[0-9a-f-]{36}$/i.test(attendeeId)) {
    return json(res, 400, { error: "Choose a valid attendee and event session." });
  }
  const table = attendeeType === "general" ? "registrations" : "minister_registrations";
  const idColumn = attendeeType === "general" ? "general_registration_id" : "minister_registration_id";
  try {
    const attendee = await db(table + "?select=id&id=eq." + encodeURIComponent(attendeeId) + "&limit=1");
    if (!attendee.data.length) return json(res, 404, { error: "This registration could not be found. Refresh the search and try again." });
    const inserted = await db("attendee_checkins", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ [idColumn]: attendeeId, session_key: sessionKey, checked_in_by: admin.email })
    });
    const row = inserted.data[0];
    return json(res, 201, { checkin: { checked_in: true, checked_in_at: row.checked_in_at, checked_in_by: row.checked_in_by }, already_checked_in: false });
  } catch (error) {
    if (error.code === "23505" || error.status === 409) {
      try {
        const existing = await db("attendee_checkins?select=checked_in_at,checked_in_by&" + idColumn + "=eq." + encodeURIComponent(attendeeId) + "&session_key=eq." + sessionKey + "&limit=1");
        if (existing.data.length) return json(res, 200, { checkin: { checked_in: true, checked_in_at: existing.data[0].checked_in_at, checked_in_by: existing.data[0].checked_in_by }, already_checked_in: true });
      } catch { /* Return the generic failure below. */ }
    }
    console.error("Event check-in write failed:", error.status || "unknown");
    return json(res, 500, { error: "Unable to record this check-in. Please try again." });
  }
}
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!validOrigin(req)) return json(res, 403, { error: "Forbidden." });
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed." });
  }
  let admin;
  try { admin = await getAdmin(req); } catch { return json(res, 503, { error: "Admin service is temporarily unavailable." }); }
  if (admin.error) return json(res, admin.status, { error: admin.error });
  if (req.method === "POST") return handlePost(req, res, admin);
  const query = req.query || {};
  const sessionKey = String(query.session_key || "");
  const term = cleanSearch(query.search);
  if (!SESSIONS.has(sessionKey)) return json(res, 400, { error: "Select a valid event session." });
  if (term.length < 2) return json(res, 200, { attendees: [] });
  try {
    const attendees = await searchAttendees(sessionKey, term);
    return json(res, 200, { attendees });
  } catch (error) {
    console.error("Event check-in search failed:", error.status || "unknown");
    return json(res, 500, { error: "Unable to search registrations right now." });
  }
};
