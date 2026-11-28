(() => {
  const form = document.querySelector("#invite-form");
  const message = document.querySelector("#message");
  const button = document.querySelector("#submit");
  const params = new URLSearchParams(location.hash.slice(1));
  const token = params.get("access_token");
  const type = params.get("type");
  if (token && (type === "invite" || type === "recovery")) {
    history.replaceState(null, "", location.pathname + location.search);
  } else {
    message.textContent = "This invitation link is invalid or has expired. Ask a Super Admin to send a new invitation.";
    form.hidden = true;
    return;
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    const password = document.querySelector("#password").value;
    const confirmation = document.querySelector("#confirm-password").value;
    if (password.length < 10) { message.textContent = "Use at least 10 characters for your password."; return; }
    if (password !== confirmation) { message.textContent = "The passwords do not match."; return; }
    button.disabled = true;
    button.textContent = "Activating account…";
    try {
      const response = await fetch("/api/admin-auth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-password", accessToken: token, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to activate this account.");
      message.textContent = "Your password has been set. You can now sign in.";
      form.hidden = true;
      window.setTimeout(() => location.replace("/admin/login"), 1200);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Activate administrator account";
    }
  });
})();
