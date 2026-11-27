import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  clearLocalRateLimits,
  DuplicateRegistrationError,
  handleAdminMinisterRegistrations,
  handleMinisterRegistration,
  resolveStore,
  validateMinisterRegistration
} from "../server/minister-registration.mjs";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const registrationId = "550e8400-e29b-41d4-a716-446655440000";

function makeResponse() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; }
  };
}

function ministerBody(overrides = {}) {
  return {
    full_name: "Minister Example",
    email: "MINISTER@example.org",
    phone: "+234 801 234 5678",
    gender: "Female",
    church_name: "Example Church",
    ministerial_position: "Pastor",
    country: "Nigeria",
    city: "Lagos",
    session_keys: ["session-1", "session-3"],
    accompanying_persons: "1",
    accommodation_assistance: "not_sure",
    expected_arrival_date: "2026-12-21",
    additional_information: "",
    privacy_consent: true,
    contact_consent: true,
    company_website: "",
    ...overrides
  };
}

function ministerRequest(overrides = {}) {
  return {
    method: "POST",
    headers: { host: "camp.test", origin: "https://camp.test", "x-real-ip": "203.0.113.31" },
    body: ministerBody(),
    ...overrides
  };
}

function adminRequest(method, body, query = {}, overrides = {}) {
  return {
    method,
    headers: {
      host: "camp.test",
      origin: "https://camp.test",
      cookie: "tc_admin_session=test-session",
      ...overrides.headers
    },
    body,
    query,
    ...overrides
  };
}

beforeEach(() => {
  clearLocalRateLimits();
  process.env.NODE_ENV = "development";
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.ADMIN_EMAILS;
});

afterEach(() => {
  clearLocalRateLimits();
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

test("validates multi-session selections and normalizes the email", () => {
  const result = validateMinisterRegistration(ministerBody());
  assert.equal(result.ok, true);
  assert.equal(result.value.email, "minister@example.org");
  assert.deepEqual(result.value.session_keys, ["session-1", "session-3"]);
  assert.equal(result.value.session_key, "session-1");
});

test("rejects duplicate sessions, invalid session keys, dates, and missing consent", () => {
  for (const body of [
    ministerBody({ session_keys: ["session-1", "session-1"] }),
    ministerBody({ session_keys: ["session-8"] }),
    ministerBody({ expected_arrival_date: "2026-12-24" }),
    ministerBody({ privacy_consent: false })
  ]) {
    assert.equal(validateMinisterRegistration(body).ok, false);
  }
});

test("uses file storage only for explicit local development", () => {
  assert.equal(resolveStore().mode, "file");
});

test("fails safely without Supabase credentials on Vercel Preview and Production", async () => {
  for (const environment of ["preview", "production"]) {
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = environment;
    const response = makeResponse();
    await handleMinisterRegistration(ministerRequest(), response);
    assert.equal(resolveStore(), null);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.success, undefined);
    assert.match(response.body.error, /not configured/i);
  }
});

test("selects Supabase storage for a configured Vercel Preview", () => {
  process.env.VERCEL = "1";
  process.env.VERCEL_ENV = "preview";
  process.env.SUPABASE_URL = "https://database.test";
  process.env.SUPABASE_SECRET_KEY = "test-server-key";
  assert.equal(resolveStore().mode, "supabase");
});

test("does not report success or expose database errors when a Supabase write fails", async () => {
  process.env.VERCEL = "1";
  process.env.VERCEL_ENV = "preview";
  process.env.SUPABASE_URL = "https://database.test";
  process.env.SUPABASE_SECRET_KEY = "test-server-key";
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/rpc/check_registration_rate_limit")) {
      return new Response("true", { status: 200 });
    }
    return new Response("internal database detail and secret", { status: 500 });
  };

  const response = makeResponse();
  await handleMinisterRegistration(ministerRequest(), response);
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.success, undefined);
  assert.equal(response.body.reference, undefined);
  assert.doesNotMatch(JSON.stringify(response.body), /internal database detail|test-server-key/i);
});

test("persists a valid registration before returning its reference", async () => {
  const saved = [];
  const response = makeResponse();
  await handleMinisterRegistration(ministerRequest(), response, {
    mode: "file",
    async insert(record) { saved.push(record); return record; }
  });
  assert.equal(response.statusCode, 201);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].email, "minister@example.org");
  assert.deepEqual(saved[0].session_keys, ["session-1", "session-3"]);
  assert.equal(response.body.reference, saved[0].registration_reference);
});

test("rejects cross-origin submissions and reports duplicate email conflicts", async () => {
  const blocked = makeResponse();
  await handleMinisterRegistration(ministerRequest({ headers: { host: "camp.test", origin: "https://other.test" } }), blocked, {
    mode: "file", async insert() { assert.fail("cross-origin request must not persist"); }
  });
  assert.equal(blocked.statusCode, 403);

  const duplicate = makeResponse();
  await handleMinisterRegistration(ministerRequest(), duplicate, {
    mode: "file", async insert() { throw new DuplicateRegistrationError(); }
  });
  assert.equal(duplicate.statusCode, 409);
});

test("rate limits repeated submissions and rejects oversized parsed JSON bodies", async () => {
  let writes = 0;
  let last;
  for (let index = 0; index < 21; index += 1) {
    last = makeResponse();
    await handleMinisterRegistration(ministerRequest(), last, {
      mode: "file", async insert() { writes += 1; }
    });
  }
  assert.equal(last.statusCode, 429);
  assert.equal(writes, 20);

  clearLocalRateLimits();
  const oversized = makeResponse();
  await handleMinisterRegistration(ministerRequest({ body: ministerBody({ additional_information: "x".repeat(20000) }) }), oversized, {
    mode: "file", async insert() { assert.fail("oversized request must not persist"); }
  });
  assert.equal(oversized.statusCode, 413);
});

test("admin list is protected by the shared session cookie and email allowlist", async () => {
  process.env.SUPABASE_URL = "https://database.test";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SECRET_KEY = "test-server-key";
  process.env.ADMIN_EMAILS = "admin@example.org";
  let tableReads = 0;
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/auth/v1/user") {
      return new Response(JSON.stringify({ email: "admin@example.org" }), { status: 200 });
    }
    tableReads += 1;
    return new Response(JSON.stringify([]), { status: 200, headers: { "content-range": "0-0/0" } });
  };

  const unauthorized = makeResponse();
  await handleAdminMinisterRegistrations(adminRequest("GET", undefined, {}, { headers: { cookie: "" } }), unauthorized);
  assert.equal(unauthorized.statusCode, 401);
  assert.equal(tableReads, 0);

  const authorized = makeResponse();
  await handleAdminMinisterRegistrations(adminRequest("GET", undefined), authorized);
  assert.equal(authorized.statusCode, 200);
  assert.equal(tableReads, 1);
});

test("admin status updates require same-origin admin access and a valid status", async () => {
  process.env.SUPABASE_URL = "https://database.test";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SECRET_KEY = "test-server-key";
  process.env.ADMIN_EMAILS = "admin@example.org";
  let updates = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);
    if (url.pathname === "/auth/v1/user") {
      return new Response(JSON.stringify({ email: "admin@example.org" }), { status: 200 });
    }
    updates += 1;
    assert.equal(init.method, "PATCH");
    const payload = JSON.parse(init.body);
    assert.equal(payload.status, "confirmed");
    assert.equal(Number.isNaN(Date.parse(payload.updated_at)), false);
    return new Response(JSON.stringify([{ id: registrationId, status: "confirmed", updated_at: "2026-11-25T00:00:00.000Z" }]), { status: 200 });
  };

  const invalid = makeResponse();
  await handleAdminMinisterRegistrations(adminRequest("PATCH", { id: registrationId, status: "root" }), invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(updates, 0);

  const wrongOrigin = makeResponse();
  await handleAdminMinisterRegistrations(adminRequest("PATCH", { id: registrationId, status: "confirmed" }, {}, {
    headers: { origin: "https://attacker.test" }
  }), wrongOrigin);
  assert.equal(wrongOrigin.statusCode, 403);
  assert.equal(updates, 0);

  const success = makeResponse();
  await handleAdminMinisterRegistrations(adminRequest("PATCH", { id: registrationId, status: "confirmed" }), success);
  assert.equal(success.statusCode, 200);
  assert.equal(success.body.registration.status, "confirmed");
  assert.equal(updates, 1);
});
