import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";

export const SESSIONS = [
  { key: "session-1", label: "Session 1 — 21 December 2026, 2:00 pm – 5:00 pm" },
  { key: "session-2", label: "Session 2 — 21 December 2026, 9:00 pm – 2:00 am" },
  { key: "session-3", label: "Session 3 — 22 December 2026, 8:00 am – 12:00 noon" },
  { key: "session-4", label: "Session 4 — 22 December 2026, 2:00 pm – 5:00 pm" },
  { key: "session-5", label: "Session 5 — 22 December 2026, 9:00 pm – 2:00 am" },
  { key: "session-6", label: "Session 6 — 23 December 2026, 8:00 am – 12:00 noon" },
  { key: "session-7", label: "Session 7 — 23 December 2026, 2:00 pm – 5:00 pm" }
];

const SESSION_KEYS = new Set(SESSIONS.map((session) => session.key));
const ACCOMMODATION = new Set(["yes", "no", "not_sure"]);
const ARRIVAL_MIN = "2026-12-20";
const ARRIVAL_MAX = "2026-12-23";
const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

const localBuckets = new Map();

export function clearLocalRateLimits() {
  localBuckets.clear();
}

export class DuplicateRegistrationError extends Error {
  constructor() {
    super("duplicate");
    this.name = "DuplicateRegistrationError";
  }
}

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isValidPhone(value) {
  return /^[0-9+()\-\s]{7,20}$/.test(value);
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateMinisterRegistration(body) {
  const fields = {};
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request.", fields };
  }

  if (cleanString(body.company_website, 200)) {
    return { ok: false, error: "Unable to submit this registration.", fields };
  }

  const fullName = cleanString(body.full_name, 120);
  const email = cleanString(body.email, 254).toLowerCase();
  const phone = cleanString(body.phone, 20);
  const churchName = cleanString(body.church_name, 160);
  const position = cleanString(body.ministerial_position, 120);
  const country = cleanString(body.country, 80);
  const city = cleanString(body.city, 120);
  const genderRaw = cleanString(body.gender, 10);
  const sessionInput = Array.isArray(body.session_keys) ? body.session_keys : body.session_key ? [body.session_key] : [];
  const sessionKeys = sessionInput.map((key) => cleanString(key, 20));
  const accommodation = cleanString(body.accommodation_assistance, 20);
  const arrivalRaw = cleanString(body.expected_arrival_date, 10);
  const notes = cleanString(body.additional_information, 600);
  const personsRaw = body.accompanying_persons;

  if (fullName.length < 2) fields.full_name = "Please enter your full name.";
  if (!isValidEmail(email)) fields.email = "Please enter a valid email address.";
  if (!isValidPhone(phone)) fields.phone = "Please enter a valid phone or WhatsApp number.";
  if (churchName.length < 2) fields.church_name = "Please enter your church or ministry name.";
  if (position.length < 2) fields.ministerial_position = "Please enter your ministerial position or title.";
  if (country.length < 2) fields.country = "Please enter your country.";
  if (city.length < 2) fields.city = "Please enter your state or city.";
  if (genderRaw && genderRaw !== "Male" && genderRaw !== "Female") fields.gender = "Please choose a valid gender option.";
  if (
    sessionKeys.length < 1 ||
    sessionKeys.length > SESSIONS.length ||
    sessionKeys.some((key) => !SESSION_KEYS.has(key)) ||
    new Set(sessionKeys).size !== sessionKeys.length
  ) {
    fields.session_keys = "Select one or more valid sessions.";
  }
  if (!ACCOMMODATION.has(accommodation)) fields.accommodation_assistance = "Please tell us if you need accommodation assistance.";

  let accompanying = Number.NaN;
  if (typeof personsRaw === "number" && Number.isInteger(personsRaw)) accompanying = personsRaw;
  else if (typeof personsRaw === "string" && /^\d{1,2}$/.test(personsRaw.trim())) accompanying = Number(personsRaw.trim());
  if (!Number.isInteger(accompanying) || accompanying < 0 || accompanying > 20) {
    fields.accompanying_persons = "Enter a whole number from 0 to 20.";
  }

  let expectedArrival = null;
  if (arrivalRaw) {
    if (!isValidDate(arrivalRaw) || arrivalRaw < ARRIVAL_MIN || arrivalRaw > ARRIVAL_MAX) {
      fields.expected_arrival_date = "Choose an arrival date from 20 to 23 December 2026, or leave this blank.";
    } else {
      expectedArrival = arrivalRaw;
    }
  }

  if (body.privacy_consent !== true) fields.privacy_consent = "Please acknowledge the privacy notice.";
  if (body.contact_consent !== true) fields.contact_consent = "Please agree to be contacted about your registration.";

  if (Object.keys(fields).length) {
    return { ok: false, error: "Please check the highlighted fields.", fields };
  }

  const sessions = sessionKeys.map((key) => SESSIONS.find((item) => item.key === key));
  return {
    ok: true,
    value: {
      full_name: fullName,
      email,
      phone,
      church_name: churchName,
      ministerial_position: position,
      country,
      city,
      gender: genderRaw || null,
      accompanying_persons: accompanying,
      accommodation_assistance: accommodation,
      expected_arrival_date: expectedArrival,
      session_keys: sessions.map((session) => session.key),
      session_labels: sessions.map((session) => session.label),
      session_key: sessions[0].key,
      session_label: sessions[0].label,
      additional_information: notes || null,
      privacy_consent: true,
      contact_consent: true
    }
  };
}

function defaultStorePath() {
  return process.env.MINISTER_REGISTRATION_STORE || path.join(process.cwd(), ".data", "minister-registrations.json");
}

export function createFileStore(filePath = defaultStorePath()) {
  let queue = Promise.resolve();
  const enqueue = (task) => {
    const run = queue.then(task, task);
    queue = run.then(() => undefined, () => undefined);
    return run;
  };
  const readRows = async () => {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error && error.code === "ENOENT") return [];
      throw error;
    }
  };

  return {
    mode: "file",
    async insert(record) {
      return enqueue(async () => {
        const rows = await readRows();
        if (rows.some((row) => String(row.email).toLowerCase() === record.email)) {
          throw new DuplicateRegistrationError();
        }
        await mkdir(path.dirname(filePath), { recursive: true });
        rows.push(record);
        await writeFile(filePath, JSON.stringify(rows, null, 2));
        return record;
      });
    },
    async list() {
      return enqueue(async () => readRows());
    }
  };
}

export function createSupabaseStore(url, secret) {
  const headers = {
    apikey: secret,
    Authorization: "Bearer " + secret,
    "Content-Type": "application/json"
  };

  return {
    mode: "supabase",
    async insert(record) {
      const response = await fetch(url + "/rest/v1/minister_registrations", {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(record)
      });
      if (response.status === 409) throw new DuplicateRegistrationError();
      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes("23505") || errorText.toLowerCase().includes("duplicate")) {
          throw new DuplicateRegistrationError();
        }
        console.error("Minister registration insert failed:", response.status);
        const unavailable = response.status === 404 || errorText.includes("minister_registrations");
        const error = new Error(unavailable ? "storage-unavailable" : "storage-failed");
        error.code = unavailable ? "storage-unavailable" : "storage-failed";
        throw error;
      }
      const rows = await response.json();
      return Array.isArray(rows) ? rows[0] : rows;
    }
  };
}

export function resolveStore() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (url && secret) return createSupabaseStore(url, secret);
  if (process.env.VERCEL || ["preview", "production"].includes(process.env.VERCEL_ENV)) return null;
  if (process.env.NODE_ENV === "development") return createFileStore();
  return null;
}

export function getClientIp(req) {
  const raw = req.headers["x-real-ip"];
  if (typeof raw === "string") {
    const candidate = raw.trim();
    if (candidate.length <= 64 && isIP(candidate)) return candidate;
  }
  if (process.env.VERCEL_ENV !== "production") return "127.0.0.1";
  return null;
}

export function isValidOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function isRateLimited(ip, secret) {
  if (!secret) {
    const now = Date.now();
    const bucket = localBuckets.get(ip) || [];
    const recent = bucket.filter((time) => now - time < RATE_LIMIT_WINDOW_SECONDS * 1000);
    recent.push(now);
    localBuckets.set(ip, recent);
    return recent.length > RATE_LIMIT_MAX;
  }

  const key = createHmac("sha256", secret).update("transformation-camp-minister:" + ip).digest("hex");
  const response = await fetch(process.env.SUPABASE_URL + "/rest/v1/rpc/check_registration_rate_limit", {
    method: "POST",
    headers: {
      apikey: secret,
      Authorization: "Bearer " + secret,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      p_key_hash: key,
      p_max_requests: RATE_LIMIT_MAX,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS
    })
  });
  if (!response.ok) {
    console.error("Minister registration rate limiter unavailable:", response.status);
    throw new Error("rate-limit-unavailable");
  }
  return (await response.json()) === false;
}

function json(res, status, payload) {
  res.status(status).json(payload);
}

function readBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) return { error: "too-large" };
    try {
      body = JSON.parse(body);
    } catch {
      return { error: "invalid" };
    }
  }
  if (body && typeof body === "object" && Buffer.byteLength(JSON.stringify(body)) > MAX_BODY_BYTES) {
    return { error: "too-large" };
  }
  return { body };
}

export async function handleMinisterRegistration(req, res, store = resolveStore()) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed." });
  }
  if (!isValidOrigin(req)) return json(res, 403, { error: "Forbidden." });

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > MAX_BODY_BYTES) return json(res, 413, { error: "Request is too large." });
  if (!store) return json(res, 503, { error: "Registration service is not configured." });

  const clientIp = getClientIp(req);
  if (!clientIp) {
    return json(res, 503, { error: "Registration service is temporarily unavailable. Please try again." });
  }

  try {
    if (await isRateLimited(clientIp, store.mode === "supabase" ? process.env.SUPABASE_SECRET_KEY : "")) {
      res.setHeader("Retry-After", String(RATE_LIMIT_WINDOW_SECONDS));
      return json(res, 429, { error: "Too many registration attempts. Please try again in 15 minutes." });
    }
  } catch {
    return json(res, 503, { error: "Registration service is temporarily unavailable. Please try again." });
  }

  const parsed = readBody(req);
  if (parsed.error === "too-large") return json(res, 413, { error: "Request is too large." });
  if (parsed.error) return json(res, 400, { error: "Invalid request." });

  const validation = validateMinisterRegistration(parsed.body);
  if (!validation.ok) return json(res, 400, { error: validation.error, fields: validation.fields });

  const now = new Date().toISOString();
  const record = {
    ...validation.value,
    id: randomUUID(),
    registration_reference: "PM26-" + randomBytes(4).toString("hex").toUpperCase(),
    status: "pending",
    created_at: now,
    updated_at: now
  };

  try {
    await store.insert(record);
  } catch (error) {
    if (error instanceof DuplicateRegistrationError) {
      return json(res, 409, {
        error: "A registration with this email has already been received. If you need to change your details, contact the camp team and quote your earlier submission."
      });
    }
    if (error && error.code === "storage-unavailable") {
      return json(res, 503, {
        error: "Minister registration storage is not ready yet. The database migration still needs to be applied."
      });
    }
    console.error("Minister registration failed.");
    return json(res, 500, { error: "Unable to save your registration. Please try again." });
  }

  return json(res, 201, {
    success: true,
    status: "pending",
    reference: record.registration_reference,
    storage: store.mode === "file" ? "local-preview" : "database"
  });
}

function allowedAdmin(email) {
  return !!email && (process.env.ADMIN_EMAILS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

async function requireAdmin(req) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !anon || !secret) return { ok: false, status: 503, error: "Admin API is not configured." };
  const token = (req.headers.cookie || "").split(";").map((part) => part.trim()).reduce((found, part) => {
    if (found) return found;
    const index = part.indexOf("=");
    if (index > 0 && part.slice(0, index) === "tc_admin_session") return decodeURIComponent(part.slice(index + 1));
    return null;
  }, null);
  if (!token) return { ok: false, status: 401, error: "Authentication required." };
  const response = await fetch(url + "/auth/v1/user", { headers: { apikey: anon, Authorization: "Bearer " + token } });
  if (!response.ok) return { ok: false, status: 401, error: "Authentication required." };
  const user = await response.json();
  if (!allowedAdmin(user.email)) return { ok: false, status: 401, error: "Authentication required." };
  return { ok: true };
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function accommodationLabel(value) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "not_sure") return "Not sure";
  return value || "";
}

export async function handleAdminMinisterRegistrations(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  const isUpdate = req.method === "PATCH";
  if (!isValidOrigin(req) || (isUpdate && (!req.headers.origin || !req.headers.host))) {
    return json(res, 403, { error: "Forbidden." });
  }
  if (req.method !== "GET" && !isUpdate) {
    res.setHeader("Allow", "GET, PATCH");
    return json(res, 405, { error: "Method not allowed." });
  }

  let auth;
  try {
    auth = await requireAdmin(req);
  } catch {
    return json(res, 503, { error: "Admin service is temporarily unavailable." });
  }
  if (!auth.ok) return json(res, auth.status, { error: auth.error });

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const query = req.query || {};
  const select = "id,registration_reference,full_name,email,phone,gender,church_name,ministerial_position,country,city,accompanying_persons,accommodation_assistance,expected_arrival_date,session_keys,session_labels,session_key,session_label,additional_information,status,created_at,updated_at";
  const headers = { apikey: secret, Authorization: "Bearer " + secret, Prefer: "count=exact" };

  if (isUpdate) {
    const parsed = readBody(req);
    if (parsed.error === "too-large") return json(res, 413, { error: "Request is too large." });
    if (parsed.error || !parsed.body || typeof parsed.body !== "object" || Array.isArray(parsed.body)) {
      return json(res, 400, { error: "Invalid request." });
    }
    const id = String(parsed.body.id || "");
    const status = String(parsed.body.status || "");
    if (!/^[0-9a-f-]{36}$/i.test(id) || !["pending", "confirmed", "declined"].includes(status)) {
      return json(res, 400, { error: "Choose a valid registration status." });
    }

    try {
      const response = await fetch(url + "/rest/v1/minister_registrations?id=eq." + encodeURIComponent(id) + "&select=" + encodeURIComponent("id,status,updated_at"), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ status, updated_at: new Date().toISOString() })
      });
      if (!response.ok) throw new Error("update");
      const rows = await response.json();
      if (!rows.length) return json(res, 404, { error: "Registration not found." });
      return json(res, 200, { registration: rows[0] });
    } catch {
      console.error("Minister admin status update failed.");
      return json(res, 500, { error: "Unable to update registration status right now." });
    }
  }

  const filters = [];
  if (query.search) {
    const term = String(query.search).replace(/[,%()*]/g, " ").trim().slice(0, 100);
    if (term) {
      const encoded = encodeURIComponent(term);
      filters.push("or=(full_name.ilike.*" + encoded + "*,email.ilike.*" + encoded + "*,phone.ilike.*" + encoded + "*,church_name.ilike.*" + encoded + "*,registration_reference.ilike.*" + encoded + "*)");
    }
  }
  if (query.accommodation_assistance && ACCOMMODATION.has(query.accommodation_assistance)) {
    filters.push("accommodation_assistance=eq." + query.accommodation_assistance);
  }
  if (query.session_key && SESSION_KEYS.has(query.session_key)) filters.push("session_keys=cs.{" + query.session_key + "}");
  if (["pending", "confirmed", "declined"].includes(query.status)) filters.push("status=eq." + query.status);
  if (query.id) {
    if (!/^[0-9a-f-]{36}$/i.test(String(query.id))) return json(res, 400, { error: "Invalid registration ID." });
    filters.push("id=eq." + encodeURIComponent(query.id));
  }

  const filterQuery = filters.length ? filters.join("&") + "&" : "";
  try {
    if (query.export === "csv") {
      headers.Range = "0-4999";
      const response = await fetch(url + "/rest/v1/minister_registrations?select=" + select + "&" + filterQuery + "order=created_at.desc", { headers });
      if (!response.ok) throw new Error("query");
      const rows = await response.json();
      const columns = ["registration_reference", "full_name", "email", "phone", "church_name", "ministerial_position", "country", "city", "gender", "accompanying_persons", "accommodation_assistance", "expected_arrival_date", "session_labels", "additional_information", "status", "created_at"];
      const csv = "\uFEFF" + [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((key) => csvCell(key === "accommodation_assistance" ? accommodationLabel(row[key]) : Array.isArray(row[key]) ? row[key].join("; ") : row[key])).join(","))].join("\r\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="pastors-ministers-registrations.csv"');
      res.status(200).send(csv);
      return;
    }

    if (query.id) {
      headers.Range = "0-0";
      const response = await fetch(url + "/rest/v1/minister_registrations?select=" + select + "&" + filterQuery, { headers });
      if (!response.ok) throw new Error("query");
      const rows = await response.json();
      if (!rows.length) return json(res, 404, { error: "Registration not found." });
      return json(res, 200, { registration: rows[0] });
    }

    const page = Math.max(0, Math.min(100000, parseInt(query.page, 10) || 0));
    const size = Math.max(1, Math.min(100, parseInt(query.page_size, 10) || 25));
    headers.Range = page * size + "-" + (page * size + size - 1);
    const listResponse = await fetch(url + "/rest/v1/minister_registrations?select=" + select + "&" + filterQuery + "order=created_at.desc", { headers });
    if (!listResponse.ok) throw new Error("query");
    const rows = await listResponse.json();
    const count = Number(listResponse.headers.get("content-range")?.split("/")[1] || rows.length);
    return json(res, 200, { registrations: rows, count });
  } catch (error) {
    console.error("Minister admin query failed.");
    return json(res, 500, { error: "Unable to retrieve minister registrations right now." });
  }
}
