import { handleAdminMinisterRegistrations } from "../server/minister-registration.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  return handleAdminMinisterRegistrations(req, res);
}
