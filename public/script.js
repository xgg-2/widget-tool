// تست
const WORKER_URL = "https://domain.ur-user.workers.dev";

const $ = (id) => document.getElementById(id);
const appIdEl = $("appId");
const userIdEl = $("userId");
const tokenEl = $("botToken");
const previewEl = $("preview");
const statusEl = $("status");
const btn = $("submitBtn");
const form = $("form");

const SNOWFLAKE = /^\d{15,25}$/;

function redactToken(t) {
  if (!t) return "........";
  if (t.length <= 8) return "*".repeat(t.length);
  return t.slice(0, 4) + "..." + t.slice(-4);
}

function updatePreview() {
  const app = appIdEl.value.trim() || "...";
  const user = userIdEl.value.trim() || "...";
  const tok = redactToken(tokenEl.value.trim());

  previewEl.innerHTML =
    `PATCH /api/v9/applications/<span class="redacted">${escapeHtml(app)}</span>/users/<span class="redacted">${escapeHtml(user)}</span>/identities/0/profile\n` +
    `<span class="k">Authorization:</span> Bot <span class="redacted">${escapeHtml(tok)}</span>\n` +
    `<span class="k">Content-Type:</span> <span class="s">application/json</span>\n\n` +
    `{ <span class="k">"username"</span>: <span class="s">"widget"</span> }`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

[appIdEl, userIdEl, tokenEl].forEach((el) => {
  el.addEventListener("input", updatePreview);
});

function setStatus(kind, message) {
  statusEl.className = "show " + kind;
  statusEl.textContent = message;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const applicationId = appIdEl.value.trim();
  const userId = userIdEl.value.trim();
  const botToken = tokenEl.value.trim();

  if (!SNOWFLAKE.test(applicationId)) {
    setStatus("fail", "Application ID doesn't look like a Discord ID (15-25 digits).");
    appIdEl.focus();
    return;
  }
  if (!SNOWFLAKE.test(userId)) {
    setStatus("fail", "User ID doesn't look like a Discord ID (15-25 digits).");
    userIdEl.focus();
    return;
  }
  if (botToken.length < 20 || /\s/.test(botToken)) {
    setStatus("fail", "That doesn't look like a full bot token - check for missing characters or stray spaces.");
    tokenEl.focus();
    return;
  }

  btn.disabled = true;
  setStatus("pending", "Sending request to Discord...");

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, userId, botToken }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setStatus("ok", "Done. Your application identity was created. If your widget shows draft, publish it from the Developer Portal.");
      tokenEl.value = "";
      updatePreview();
    } else if (res.status === 401) {
      setStatus("fail", "Discord rejected the token (401 Unauthorized). Reset the bot token and try again with the new one.");
    } else if (res.status === 400) {
      setStatus("fail", "Discord rejected the request - double-check the Application ID and User ID.");
    } else {
      setStatus("fail", `Discord returned an error (${res.status}). ${data.message || ""}`.trim());
    }
  } catch (err) {
    setStatus("fail", "Could not reach the proxy. Check your connection, or the Worker may be down.");
  } finally {
    btn.disabled = false;
  }
});

updatePreview();
