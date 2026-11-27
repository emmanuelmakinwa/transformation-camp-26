const { requireAdmin } = require("./_lib/admin-access");

const SESSIONS = ["session-1","session-2","session-3","session-4","session-5","session-6","session-7"];
const MAX_ROWS = 100000;
const json = (res, status, data) => res.status(status).json(data);

async function rows(path) {
  const response = await fetch(process.env.SUPABASE_URL + "/rest/v1/" + path, {
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      Authorization: "Bearer " + process.env.SUPABASE_SECRET_KEY,
      Prefer: "count=exact",
      Range: "0-" + (MAX_ROWS - 1)
    }
  });
  if (!response.ok) throw new Error("Dashboard query failed.");
  const data = await response.json();
  const total = Number(response.headers.get("content-range")?.split("/")[1] || data.length);
  if (total > MAX_ROWS) throw new Error("Dashboard dataset exceeds the supported reporting window.");
  return data;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed." });
  }
  let auth;
  try { auth = await requireAdmin(req, ["super_admin"]); }
  catch { return json(res, 503, { error: "Admin service is temporarily unavailable." }); }
  if (auth.error) return json(res, auth.status, { error: auth.error });

  try {
    const [general, ministers, checkins] = await Promise.all([
      rows("registrations?select=id,created_at,accommodation_required&order=created_at.asc"),
      rows("minister_registrations?select=id,created_at,accommodation_assistance&order=created_at.asc"),
      rows("attendee_checkins?select=id,session_key,general_registration_id,minister_registration_id,checked_in_at&order=checked_in_at.asc")
    ]);
    const checked = new Set();
    const perSession = Object.fromEntries(SESSIONS.map((key) => [key, 0]));
    for (const item of checkins) {
      if (Object.prototype.hasOwnProperty.call(perSession, item.session_key)) perSession[item.session_key] += 1;
      if (item.general_registration_id) checked.add("general:" + item.general_registration_id);
      if (item.minister_registration_id) checked.add("minister:" + item.minister_registration_id);
    }

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    const trendMap = new Map();
    for (let i = 0; i < 14; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      trendMap.set(day.toISOString().slice(0, 10), { date: day.toISOString().slice(0, 10), general: 0, ministers: 0 });
    }
    for (const item of general) {
      const day = item.created_at ? localDateKey(item.created_at) : "";
      if (trendMap.has(day)) trendMap.get(day).general += 1;
    }
    for (const item of ministers) {
      const day = String(item.created_at || "").slice(0, 10);
      if (trendMap.has(day)) trendMap.get(day).ministers += 1;
    }

    const generalAccommodation = { yes: 0, no: 0 };
    for (const item of general) {
      if (item.accommodation_required === true) generalAccommodation.yes += 1;
      else if (item.accommodation_required === false) generalAccommodation.no += 1;
    }
    const ministerAccommodation = { yes: 0, no: 0, not_sure: 0 };
    for (const item of ministers) {
      if (Object.prototype.hasOwnProperty.call(ministerAccommodation, item.accommodation_assistance)) {
        ministerAccommodation[item.accommodation_assistance] += 1;
      }
    }

    const total = general.length + ministers.length;
    return json(res, 200, {
      generated_at: new Date().toISOString(),
      registrations: { general: general.length, ministers: ministers.length, total },
      attendance: {
        unique_attendees: checked.size,
        total_checkins: checkins.length,
        outstanding: Math.max(0, total - checked.size),
        per_session: perSession
      },
      trends: Array.from(trendMap.values()),
      accommodation: {
        general: generalAccommodation,
        ministers: ministerAccommodation,
        total_requests: generalAccommodation.yes + ministerAccommodation.yes,
        total_not_sure: ministerAccommodation.not_sure
      }
    });
  } catch (error) {
    console.error("Operations dashboard query failed.");
    return json(res, 500, { error: "Unable to load event operations data. " + (error.message || "") });
  }
};
