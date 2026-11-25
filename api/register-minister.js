import { handleMinisterRegistration } from "../server/minister-registration.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  return handleMinisterRegistration(req, res);
}
