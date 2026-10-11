import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const MAX_BODY_BYTES = 10 * 1024;
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

function json(res, status, payload) {
  res.status(status).json(payload);
}

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^[0-9+()\-\s]{7,20}$/.test(value);
}


function getClientIp(req) {
  const raw = req.headers["x-real-ip"];

  if (typeof raw !== "string" || raw.length > 64) return null;

  const candidate = raw.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

function hashRateLimitKey(clientIp) {
  return createHmac("sha256", SUPABASE_SECRET_KEY)
    .update("transformation-camp-registration:" + clientIp)
    .digest("hex");
}

async function isRateLimited(clientIp) {
  const response = await fetch(
    SUPABASE_URL + "/rest/v1/rpc/check_registration_rate_limit",
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: "Bearer " + SUPABASE_SECRET_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_key_hash: hashRateLimitKey(clientIp),
        p_max_requests: RATE_LIMIT_MAX_REQUESTS,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS
      })
    }
  );

  if (!response.ok) {
    console.error("Registration rate limiter unavailable:", response.status);
    throw new Error("Registration rate limiter unavailable");
  }

  return (await response.json()) === false;
}
function isValidOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed." });
  }

  if (!isValidOrigin(req)) {
    return json(res, 403, { error: "Forbidden." });
  }

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error("Registration API is missing required server configuration.");
    return json(res, 500, { error: "Registration service is not configured." });
  }

  const contentLength = Number(req.headers["content-length"] || 0);

  if (contentLength > MAX_BODY_BYTES) {
    return json(res, 413, { error: "Request is too large." });
  }

  const clientIp = getClientIp(req);

  if (!clientIp) {
    console.error("Registration request did not include a valid client IP.");
    return json(res, 503, {
      error: "Registration service is temporarily unavailable. Please try again."
    });
  }

  try {
    if (await isRateLimited(clientIp)) {
      res.setHeader("Retry-After", String(RATE_LIMIT_WINDOW_SECONDS));
      return json(res, 429, {
        error: "Too many registration attempts. Please try again in 15 minutes."
      });
    }
  } catch {
    return json(res, 503, {
      error: "Registration service is temporarily unavailable. Please try again."
    });
  }

  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { error: "Invalid request." });
    }
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(res, 400, { error: "Invalid request." });
  }

  const firstName = cleanString(body.first_name, 80);
  const lastName = cleanString(body.last_name, 80);
  const email = cleanString(body.email, 254).toLowerCase();
  const phone = cleanString(body.phone, 20);
  const gender = cleanString(body.gender, 10);
  const country = cleanString(body.country, 80);
  const state = cleanString(body.state, 100);
  const city = cleanString(body.city, 100);
  const accommodationRequired = body.accommodation_required;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !gender ||
    !country ||
    !state ||
    !city ||
    typeof accommodationRequired !== "boolean"
  ) {
    return json(res, 400, {
      error: "Please complete all required fields."
    });
  }

  if (!isValidEmail(email)) {
    return json(res, 400, {
      error: "Please enter a valid email address."
    });
  }

  if (!isValidPhone(phone)) {
    return json(res, 400, {
      error: "Please enter a valid phone number."
    });
  }

  if (gender !== "Male" && gender !== "Female") {
    return json(res, 400, {
      error: "Invalid gender selection."
    });
  }

  const payload = {
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email,
    p_phone: phone,
    p_gender: gender,
    p_country: country,
    p_state: state,
    p_city: city,
    p_accommodation_required: accommodationRequired
  };

  try {
    const response = await fetch(
      SUPABASE_URL + "/rest/v1/rpc/register_attendee",
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: "Bearer " + SUPABASE_SECRET_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Supabase registration error:",
        response.status,
        errorText
      );

      return json(res, 500, {
        error: "Unable to complete registration."
      });
    }

    const registration = await response.json();

    return json(res, 201, {
      success: true,
      registration_reference: registration.registration_reference
    });
  } catch (error) {
    console.error("Registration API error:", error);

    return json(res, 500, {
      error: "Unable to complete registration."
    });
  }
}
