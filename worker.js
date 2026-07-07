const ALLOWED_ORIGIN = "https://YOUR-PAGES-DOMAIN.pages.dev";
const SNOWFLAKE = /^\d{15,25}$/;
const MAX_CONTENT_LENGTH = 2048;

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(status, data, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...corsHeaders(origin),
    },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (origin !== ALLOWED_ORIGIN) {
      return jsonResponse(403, { error: "origin_not_allowed" }, origin);
    }

    if (request.method !== "POST") {
      return jsonResponse(405, { error: "method_not_allowed" }, origin);
    }

    const contentLength = Number(request.headers.get("Content-Length") || "0");
    if (contentLength <= 0 || contentLength > MAX_CONTENT_LENGTH) {
      return jsonResponse(413, { error: "payload_too_large" }, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(400, { error: "invalid_json" }, origin);
    }

    const { applicationId, userId, botToken } = payload || {};

    if (typeof applicationId !== "string" || !SNOWFLAKE.test(applicationId)) {
      return jsonResponse(400, { error: "invalid_application_id" }, origin);
    }
    if (typeof userId !== "string" || !SNOWFLAKE.test(userId)) {
      return jsonResponse(400, { error: "invalid_user_id" }, origin);
    }
    if (
      typeof botToken !== "string" ||
      botToken.length < 20 ||
      botToken.length > 100 ||
      /\s/.test(botToken)
    ) {
      return jsonResponse(400, { error: "invalid_bot_token" }, origin);
    }

    const url = `https://discord.com/api/v9/applications/${applicationId}/users/${userId}/identities/0/profile`;

    let discordRes;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      discordRes = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${botToken}`,
          "User-Agent":
            "DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)",
        },
        body: JSON.stringify({ username: "widget" }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
    } catch {
      return jsonResponse(502, { error: "discord_unreachable" }, origin);
    }

    const text = await discordRes.text();

    return new Response(text, {
      status: discordRes.status,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        ...corsHeaders(origin),
      },
    });
  },
};
