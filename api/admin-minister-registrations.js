module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  const { handleAdminMinisterRegistrations } = await import("../server/minister-registration.mjs");
  return handleAdminMinisterRegistrations(req, res);
};
