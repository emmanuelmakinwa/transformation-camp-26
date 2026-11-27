module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const { handleMinisterRegistration } = await import("../server/minister-registration.mjs");
  return handleMinisterRegistration(req, res);
};
