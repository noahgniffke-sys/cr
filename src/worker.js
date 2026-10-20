import { codesMatch, sessionToken } from "./door.js";
import { PAGE } from "./page.js";
import {
  MAX_VIDEO_BYTES,
  acceptsVideoSize,
  buildUploadFields,
  knownPlatform,
  normalizeProfile,
  summarizeAccounts,
} from "./publish.js";

const UPLOAD_URL = "https://api.upload-post.com/api/upload";
const PROFILES_URL = "https://api.upload-post.com/api/uploadposts/users";
const STATUS_URL = "https://api.upload-post.com/api/uploadposts/status";
const PAGES_URL = "https://api.upload-post.com/api/uploadposts/facebook/pages";
const OAUTH_URL = "https://api.upload-post.com/api/uploadposts/oauth";
const COOKIE = "cr_session";
const MAX_AGE = 60 * 60 * 24 * 30;

const ROUTES = {
  "/api/connect": connect,
  "/api/status": status,
  "/api/publish": publish,
  "/api/accounts": accounts,
  "/api/signin": signin,
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET" && path === "/") return html(PAGE);

    if (path === "/api/unlock") {
      if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
      return unlock(request);
    }

    if (!path.startsWith("/api/")) return text("Not found", 404);

    if (!(await authorized(request))) return json({ ok: false }, 401);

    if (path === "/api/session") {
      if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
      return json({ ok: true });
    }

    const handler = ROUTES[path];
    if (!handler) return json({ error: "Not found." }, 404);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    return handler(request);
  },
};

async function unlock(request) {
  let code = "";
  try {
    const body = await request.json();
    code = body?.code ?? "";
  } catch {
    code = "";
  }
  if (!codesMatch(code)) return json({ ok: false }, 401);
  const token = await sessionToken();
  return json({ ok: true }, 200, [
    ["set-cookie", `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`],
  ]);
}

async function authorized(request) {
  const got = readCookie(request.headers.get("Cookie"), COOKIE);
  const expected = await sessionToken();
  return codesMatch(got, expected);
}

async function connect(request) {
  const key = headerValue(request, "X-CR-Key");
  if (!key || key.length > 2000) return json({ error: "API key is required." }, 400);
  let upstream;
  try {
    upstream = await globalThis.fetch(PROFILES_URL, {
      method: "GET",
      headers: { Authorization: `Apikey ${key}` },
    });
  } catch {
    return json({ error: "Upload-Post could not be reached." }, 502);
  }
  if (!upstream.ok) {
    const errText = await upstream.text();
    return text(errText, upstream.status);
  }
  let data = {};
  try {
    data = await upstream.json();
  } catch {
    data = {};
  }
  return json({ ok: true, profiles: Array.isArray(data.profiles) ? data.profiles : [] });
}

async function status(request) {
  const key = headerValue(request, "X-CR-Key");
  if (!key || key.length > 2000) return json({ error: "API key is required." }, 400);
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const requestId = typeof body?.request_id === "string" ? body.request_id.trim() : "";
  const jobId = typeof body?.job_id === "string" ? body.job_id.trim() : "";
  if ((!requestId && !jobId) || requestId.length > 200 || jobId.length > 200) {
    return json({ error: "request_id or job_id is required." }, 400);
  }
  const url = new URL(STATUS_URL);
  if (requestId) url.searchParams.set("request_id", requestId);
  if (jobId) url.searchParams.set("job_id", jobId);
  try {
    return pass(await globalThis.fetch(url, {
      method: "GET",
      headers: { Authorization: `Apikey ${key}` },
    }));
  } catch {
    return json({ error: "Upload-Post could not be reached." }, 502);
  }
}

async function publish(request) {
  const key = headerValue(request, "X-CR-Key");
  const profile = headerValue(request, "X-CR-Profile");
  const idem = headerValue(request, "X-Idempotency-Key");
  if (!key || !profile || key.length > 2000 || profile.length > 500) {
    return json({ error: "Profile and API key are required." }, 400);
  }
  if (!idem || idem.length > 200) return json({ error: "Missing idempotency key." }, 400);

  let incoming;
  try {
    incoming = await request.formData();
  } catch {
    return json({ error: "Expected a video upload." }, 400);
  }

  const video = incoming.get("video");
  if (!video || typeof video === "string" || typeof video.size !== "number") {
    return json({ error: "Choose a video." }, 400);
  }
  if (!acceptsVideoSize(video.size)) {
    const tooBig = video.size > MAX_VIDEO_BYTES;
    return json(
      { error: tooBig ? "That video is over 95 MB. This desk cannot send a file that large." : "Choose a video." },
      tooBig ? 413 : 400,
    );
  }

  const platforms = [...incoming.getAll("platform"), ...incoming.getAll("platform[]")].filter(
    (value) => typeof value === "string",
  );
  const title = typeof incoming.get("title") === "string" ? incoming.get("title") : "";
  const timezone = typeof incoming.get("timezone") === "string" ? incoming.get("timezone") : "";
  const scheduled = incoming.get("scheduled_date");
  const story = incoming.get("story") === "1" || incoming.get("story") === "true";
  const pageId = incoming.get("facebook_page_id");
  const fields = buildUploadFields({
    title,
    platforms,
    timezone,
    scheduledDate: typeof scheduled === "string" ? scheduled : "",
    idempotencyKey: idem,
    story,
    facebookPageId: typeof pageId === "string" ? pageId : "",
  });
  if (!fields.some(([name]) => name === "platform[]")) {
    return json(
      { error: story ? "Stories are available on Instagram and Facebook." : "Sign in to a network first." },
      400,
    );
  }
  const ids = fields.filter(([name]) => name === "platform[]").map(([, value]) => value);
  if (ids.includes("facebook") && !fields.some(([name]) => name === "facebook_page_id")) {
    return json({ error: "Facebook needs a Page on this login." }, 400);
  }

  const out = new FormData();
  out.append("user", profile);
  for (const [name, value] of fields) out.append(name, value);
  const filename = (typeof video.name === "string" ? video.name : "").replace(/[\r\n"]/g, "") || "video.mp4";
  out.append("video", video, filename);

  try {
    return pass(await globalThis.fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Apikey ${key}`,
        "Idempotency-Key": idem,
      },
      body: out,
    }));
  } catch {
    return json({ error: "Upload-Post could not be reached." }, 502);
  }
}

async function accounts(request) {
  const key = headerValue(request, "X-CR-Key");
  const profile = normalizeProfile(headerValue(request, "X-CR-Profile"));
  if (!key || key.length > 2000) return json({ error: "API key is required." }, 400);
  if (!profile) return json({ error: "Profile name can use letters, numbers, and dashes." }, 400);
  const loaded = await loadProfile(key, profile);
  if (!loaded.ok) return text(loaded.error, loaded.status);
  let pages = [];
  try {
    const pageRes = await upstream(`${PAGES_URL}?profile=${encodeURIComponent(profile)}`, key);
    if (pageRes.ok) {
      const data = await pageRes.json();
      pages = (Array.isArray(data.pages) ? data.pages : [])
        .filter((page) => page && page.page_id && (!page.profile || page.profile === profile))
        .map((page) => ({ id: String(page.page_id), name: String(page.page_name || page.page_id) }));
    }
  } catch {
    pages = [];
  }
  return json({
    ok: true,
    profile,
    accounts: summarizeAccounts(loaded.social),
    pages,
  });
}

async function signin(request) {
  const key = headerValue(request, "X-CR-Key");
  const profile = normalizeProfile(headerValue(request, "X-CR-Profile"));
  if (!key || key.length > 2000) return json({ error: "API key is required." }, 400);
  if (!profile) return json({ error: "Profile name can use letters, numbers, and dashes." }, 400);
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const platform = typeof body?.platform === "string" ? body.platform.trim().toLowerCase() : "";
  if (!knownPlatform(platform)) return json({ error: "Unknown network." }, 400);
  const loaded = await loadProfile(key, profile);
  if (!loaded.ok) return text(loaded.error, loaded.status);
  const redirect = new URL("/", request.url).toString();
  let started;
  try {
    started = await upstream(`${OAUTH_URL}/${platform}/start`, key, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile, redirect_url: redirect }),
    });
  } catch {
    return json({ error: "Upload-Post could not be reached." }, 502);
  }
  const payload = await started.text();
  if (!started.ok) return text(payload, started.status);
  let data = {};
  try {
    data = JSON.parse(payload);
  } catch {
    data = {};
  }
  const authorize = typeof data.authorize_url === "string" ? data.authorize_url : "";
  if (!authorize.startsWith("https://")) return json({ error: "Sign-in link was not returned." }, 502);
  return json({ ok: true, authorize_url: authorize });
}

async function loadProfile(key, profile) {
  const url = `${PROFILES_URL}/${encodeURIComponent(profile)}`;
  let got;
  try {
    got = await upstream(url, key);
  } catch {
    return { ok: false, status: 502, error: "Upload-Post could not be reached." };
  }
  if (got.status === 404) {
    let made;
    try {
      made = await upstream(PROFILES_URL, key, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: profile, display_name: "CR" }),
      });
    } catch {
      return { ok: false, status: 502, error: "Upload-Post could not be reached." };
    }
    if (made.status === 409) {
      try {
        got = await upstream(url, key);
      } catch {
        return { ok: false, status: 502, error: "Upload-Post could not be reached." };
      }
    } else if (!made.ok) {
      return { ok: false, status: made.status, error: await made.text() };
    } else {
      let created = {};
      try {
        created = await made.json();
      } catch {
        created = {};
      }
      return { ok: true, social: created.profile?.social_accounts || {} };
    }
  }
  if (!got.ok) return { ok: false, status: got.status, error: await got.text() };
  let data = {};
  try {
    data = await got.json();
  } catch {
    data = {};
  }
  return { ok: true, social: data.profile?.social_accounts || {} };
}

function upstream(url, key, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Apikey ${key}`);
  return globalThis.fetch(url, { ...init, headers });
}

function readCookie(header, name) {
  if (!header) return "";
  for (const bit of header.split(";")) {
    const piece = bit.trim();
    const eq = piece.indexOf("=");
    if (eq < 0) continue;
    if (piece.slice(0, eq) === name) return piece.slice(eq + 1);
  }
  return "";
}

function headerValue(request, name) {
  const value = request.headers.get(name);
  return value == null ? "" : value.trim();
}

function html(body) {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function json(data, status = 200, extra) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (extra) for (const [key, value] of extra) headers.set(key, value);
  return new Response(JSON.stringify(data), { status, headers });
}

function text(body, status) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function pass(upstream) {
  const body = await upstream.text();
  const type = upstream.headers.get("content-type") || "application/json; charset=utf-8";
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": type,
      "cache-control": "no-store",
    },
  });
}
