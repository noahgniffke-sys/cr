import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { codesMatch, normalizeCode, sessionToken } from "../src/door.js";
import { MAX_VIDEO_BYTES, acceptsVideoSize, buildUploadFields, summarizeAccounts } from "../src/publish.js";
import worker from "../src/worker.js";

const TOKEN = "6fa70c087798ae2f123671c1d5e3f136e1b455d1e831a471f049e48851b398ff";

test("the page a friend opens explains the three steps", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /Get a key/);
  assert.match(html, /Generate New API Key/);
  assert.match(html, /Sign in/);
  assert.match(html, /Post to all/);
  assert.match(html, /24 hours/);
  assert.match(html, /app\.upload-post\.com\/api-keys/);
  assert.doesNotMatch(html, /id="lock"/);
  assert.doesNotMatch(html, /Door code/);
});

test("normalizeCode trims and lowercases", () => {
  assert.equal(normalizeCode("  Cr\n"), "cr");
  assert.equal(normalizeCode(null), "");
  assert.equal(normalizeCode(undefined), "");
});

test("codesMatch is case-insensitive and rejects other strings", () => {
  assert.equal(codesMatch("CR"), true);
  assert.equal(codesMatch("cR "), true);
  assert.equal(codesMatch("cr", "CR"), true);
  assert.equal(codesMatch("no"), false);
  assert.equal(codesMatch("c"), false);
  assert.equal(codesMatch("crx"), false);
  assert.equal(codesMatch("crcr"), false);
  assert.equal(codesMatch(""), false);
  assert.equal(codesMatch("cx", "cr"), false);
});

test("sessionToken is the door HMAC", async () => {
  assert.equal(await sessionToken(), TOKEN);
  assert.equal(await sessionToken(), await sessionToken());
});

test("buildUploadFields adds platform extras and drops unknowns", () => {
  assert.deepEqual(
    buildUploadFields({
      title: "Cut",
      platforms: ["youtube", "Instagram", "vine", "youtube", "", null],
      timezone: "Europe/Paris",
      scheduledDate: "2026-12-01T18:00:00",
      idempotencyKey: "id-1",
    }),
    [
      ["platform[]", "youtube"],
      ["platform[]", "instagram"],
      ["title", "Cut"],
      ["description", "Cut"],
      ["async_upload", "true"],
      ["timezone", "Europe/Paris"],
      ["scheduled_date", "2026-12-01T18:00:00"],
      ["media_type", "REELS"],
      ["privacyStatus", "public"],
      ["external_id", "id-1"],
    ],
  );
});

test("schedule and post-now omit an empty scheduled_date", () => {
  for (const scheduledDate of ["", "   ", null, undefined]) {
    const names = buildUploadFields({
      title: "A",
      platforms: ["tiktok"],
      scheduledDate,
    }).map(([name]) => name);
    assert.equal(names.includes("scheduled_date"), false);
  }
});

test("stories stay on Instagram and Facebook and a feed post can name a Page", () => {
  const story = buildUploadFields({
    title: "Night",
    platforms: ["youtube", "instagram", "facebook", "tiktok"],
    story: true,
    facebookPageId: "99",
  });
  assert.deepEqual(story.filter(([name]) => name === "platform[]").map(([, value]) => value), ["instagram", "facebook"]);
  assert.equal(story.find(([name]) => name === "media_type")[1], "STORIES");
  assert.equal(story.find(([name]) => name === "facebook_media_type")[1], "STORIES");
  assert.equal(story.find(([name]) => name === "facebook_page_id")[1], "99");
  assert.equal(story.some(([name]) => name === "privacyStatus"), false);

  const feed = buildUploadFields({
    title: "Night",
    platforms: ["facebook"],
    facebookPageId: "99",
  });
  assert.equal(feed.find(([name]) => name === "facebook_media_type")[1], "REELS");
});

test("summarizeAccounts keeps only real sign-ins", () => {
  const rows = summarizeAccounts({
    instagram: { handle: "ada" },
    tiktok: "",
    facebook: { display_name: "Ada Page", reauth_required: true },
    x: null,
  });
  const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
  assert.equal(byId.instagram.connected, true);
  assert.equal(byId.instagram.label, "@ada");
  assert.equal(byId.instagram.story, true);
  assert.equal(byId.tiktok.connected, false);
  assert.equal(byId.facebook.connected, false);
  assert.equal(byId.facebook.label, "Sign in again");
  assert.equal(byId.youtube.story, false);
});

test("instagram and youtube extras are independent", () => {
  const ig = buildUploadFields({ title: "A", platforms: ["instagram"] });
  assert.equal(ig.some(([name, value]) => name === "media_type" && value === "REELS"), true);
  assert.equal(ig.some(([name]) => name === "privacyStatus"), false);

  const yt = buildUploadFields({ title: "A", platforms: ["youtube"] });
  assert.equal(yt.some(([name, value]) => name === "privacyStatus" && value === "public"), true);
  assert.equal(yt.some(([name]) => name === "media_type"), false);
});

test("unknown platforms are dropped and timezone falls back", () => {
  const pairs = buildUploadFields({
    title: "A",
    platforms: ["myspace", "tiktok", "x", "x"],
    timezone: "  ",
  });
  assert.deepEqual(
    pairs.filter(([name]) => name === "platform[]").map(([, value]) => value),
    ["tiktok", "x"],
  );
  assert.equal(pairs.find(([name]) => name === "timezone")[1], "America/Los_Angeles");
  assert.equal(pairs.every(([, value]) => typeof value === "string"), true);
});

test("video size limit is 95 MB", () => {
  assert.equal(acceptsVideoSize(MAX_VIDEO_BYTES), true);
  assert.equal(acceptsVideoSize(MAX_VIDEO_BYTES + 1), false);
  assert.equal(acceptsVideoSize(0), false);
  assert.equal(acceptsVideoSize(-1), false);
});

test("GET / serves the desk and the lock", async () => {
  const res = await worker.fetch(new Request("https://cr.desk/"));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  const html = await res.text();
  assert.match(html, /id="lock"/);
  assert.match(html, /id="desk"[^>]*hidden/);
  assert.match(html, /sign in to each network/);
  assert.match(html, /Post to all/);
  assert.match(html, /Story posts to Instagram or Facebook/);
  assert.doesNotMatch(html, /fonts\.googleapis|unpkg|cdnjs|jsdelivr/);
  assert.equal(html.includes("Apikey"), false);
});

test("unlock sets the session cookie only for cr", async () => {
  const ok = await worker.fetch(new Request("https://cr.desk/api/unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "Cr" }),
  }));
  assert.equal(ok.status, 200);
  assert.equal(
    ok.headers.get("set-cookie"),
    `cr_session=${TOKEN}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
  );

  const bad = await worker.fetch(new Request("https://cr.desk/api/unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "no" }),
  }));
  assert.equal(bad.status, 401);
  assert.equal(bad.headers.get("set-cookie"), null);

  const junk = await worker.fetch(new Request("https://cr.desk/api/unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  }));
  assert.equal(junk.status, 401);
  assert.equal(junk.headers.get("set-cookie"), null);
});

test("api routes reject a missing or forged cookie before any upstream call", async (t) => {
  const orig = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("network");
  };
  t.after(() => {
    globalThis.fetch = orig;
  });

  for (const path of ["/api/publish", "/api/connect", "/api/status", "/api/accounts", "/api/signin"]) {
    const res = await worker.fetch(new Request(`https://cr.desk${path}`, { method: "POST" }));
    assert.equal(res.status, 401);
  }
  const forged = await worker.fetch(new Request("https://cr.desk/api/status", {
    method: "POST",
    headers: { cookie: "cr_session=cr", "content-type": "application/json" },
    body: "{}",
  }));
  assert.equal(forged.status, 401);
  assert.equal(calls, 0);
});

test("connect proxies the profile list and returns upstream errors as text", async (t) => {
  const orig = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = orig;
  });
  const token = await sessionToken();
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = { url: String(url), init };
    return new Response(JSON.stringify({
      success: true,
      profiles: [{ username: "friend" }],
      secret: "super-secret-key-xyz",
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const res = await worker.fetch(new Request("https://cr.desk/api/connect", {
    method: "POST",
    headers: {
      cookie: `cr_session=${token}`,
      "x-cr-key": "super-secret-key-xyz",
      "x-cr-profile": "friend",
    },
  }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, profiles: [{ username: "friend" }] });
  assert.equal(seen.url, "https://api.upload-post.com/api/uploadposts/users");
  assert.equal(seen.init.method, "GET");
  assert.deepEqual(seen.init.headers, { Authorization: "Apikey super-secret-key-xyz" });

  globalThis.fetch = async () => new Response("bad key", { status: 401 });
  const err = await worker.fetch(new Request("https://cr.desk/api/connect", {
    method: "POST",
    headers: { cookie: `cr_session=${token}`, "x-cr-key": "super-secret-key-xyz" },
  }));
  assert.equal(err.status, 401);
  assert.equal(await err.text(), "bad key");
});

test("publish rebuilds the upload and does not forward the door cookie", async (t) => {
  const orig = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = orig;
  });
  const token = await sessionToken();
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = { url: String(url), init };
    return new Response(JSON.stringify({
      success: true,
      message: "Upload initiated successfully in background.",
      request_id: "req_1",
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const file = new File([new Uint8Array([0, 0, 0, 24])], "reel.mov", { type: "video/quicktime" });
  const fd = new FormData();
  fd.append("video", file, "reel.mov");
  fd.append("title", "Night cut");
  fd.append("platform", "tiktok");
  fd.append("platform", "instagram");
  fd.append("platform", "youtube");
  fd.append("platform", "vine");
  fd.append("timezone", "America/Los_Angeles");
  fd.append("media_type", "SHOULD_NOT_PASS");

  const res = await worker.fetch(new Request("https://cr.desk/api/publish", {
    method: "POST",
    headers: {
      cookie: `cr_session=${token}`,
      "x-cr-key": "super-secret-key-xyz",
      "x-cr-profile": "friend",
      "x-idempotency-key": "11111111-1111-1111-1111-111111111111",
      "x-should-not-forward": "no",
    },
    body: fd,
  }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).request_id, "req_1");
  assert.equal(seen.url, "https://api.upload-post.com/api/upload");
  assert.deepEqual(Object.keys(seen.init.headers).sort(), ["Authorization", "Idempotency-Key"]);
  assert.equal(seen.init.headers.Authorization, "Apikey super-secret-key-xyz");
  assert.equal(seen.init.headers["Idempotency-Key"], "11111111-1111-1111-1111-111111111111");
  assert.equal(JSON.stringify(seen.init.headers).includes(token), false);

  const out = seen.init.body;
  const names = [...out.keys()];
  assert.deepEqual(names, [
    "user",
    "platform[]",
    "platform[]",
    "platform[]",
    "title",
    "description",
    "async_upload",
    "timezone",
    "media_type",
    "privacyStatus",
    "external_id",
    "video",
  ]);
  assert.equal(out.get("user"), "friend");
  assert.deepEqual(out.getAll("platform[]"), ["tiktok", "instagram", "youtube"]);
  assert.equal(out.get("title"), "Night cut");
  assert.equal(out.get("description"), "Night cut");
  assert.equal(out.get("async_upload"), "true");
  assert.equal(out.get("media_type"), "REELS");
  assert.equal(out.get("privacyStatus"), "public");
  assert.equal(out.get("external_id"), "11111111-1111-1111-1111-111111111111");
  assert.equal(out.get("scheduled_date"), null);
  assert.equal(out.get("video").name, "reel.mov");
});

test("publish forwards scheduled_date only when the desk sent one", async (t) => {
  const orig = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = orig;
  });
  const token = await sessionToken();
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = init;
    return new Response(JSON.stringify({ success: true, job_id: "job_1" }), { status: 202 });
  };
  const fd = new FormData();
  fd.append("video", new File([new Uint8Array([1])], "a.mp4", { type: "video/mp4" }));
  fd.append("title", "Later");
  fd.append("platform", "x");
  fd.append("timezone", "America/Los_Angeles");
  fd.append("scheduled_date", "2026-12-01T18:00:00");
  const res = await worker.fetch(new Request("https://cr.desk/api/publish", {
    method: "POST",
    headers: {
      cookie: `cr_session=${token}`,
      "x-cr-key": "k",
      "x-cr-profile": "friend",
      "x-idempotency-key": "sched-1",
    },
    body: fd,
  }));
  assert.equal(res.status, 202);
  assert.equal(seen.body.get("scheduled_date"), "2026-12-01T18:00:00");
  assert.equal(seen.body.get("media_type"), null);
  assert.equal(seen.body.get("privacyStatus"), null);
});

test("status proxies request_id or job_id", async (t) => {
  const orig = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = orig;
  });
  const token = await sessionToken();
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = { url: String(url), init };
    return new Response(JSON.stringify({ status: "pending", job_id: "job_1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const res = await worker.fetch(new Request("https://cr.desk/api/status", {
    method: "POST",
    headers: {
      cookie: `cr_session=${token}`,
      "content-type": "application/json",
      "x-cr-key": "super-secret-key-xyz",
    },
    body: JSON.stringify({ job_id: "job_1" }),
  }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "pending");
  assert.equal(seen.url, "https://api.upload-post.com/api/uploadposts/status?job_id=job_1");
  assert.equal(seen.init.headers.Authorization, "Apikey super-secret-key-xyz");
  assert.equal(JSON.stringify(seen.init.headers).includes("super-secret-key-xyz") , true);
  assert.equal(Object.keys(seen.init.headers).length, 1);
});

test("session stays open only with the door cookie", async () => {
  const token = await sessionToken();
  const closed = await worker.fetch(new Request("https://cr.desk/api/session"));
  assert.equal(closed.status, 401);
  const open = await worker.fetch(new Request("https://cr.desk/api/session", {
    headers: { cookie: `cr_session=${token}` },
  }));
  assert.equal(open.status, 200);
  assert.deepEqual(await open.json(), { ok: true });
});

test("accounts creates a missing profile and returns sign-ins", async (t) => {
  const orig = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = orig;
  });
  const token = await sessionToken();
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init.method || "GET", body: init.body });
    if (String(url).endsWith("/users/friend") && calls.filter((call) => call.url.endsWith("/users/friend")).length === 1) {
      return new Response("missing", { status: 404 });
    }
    if (String(url).endsWith("/users") && init.method === "POST") {
      return new Response(JSON.stringify({
        profile: { username: "friend", social_accounts: { instagram: { handle: "ada" }, tiktok: "" } },
      }), { status: 201, headers: { "content-type": "application/json" } });
    }
    if (String(url).includes("/facebook/pages")) {
      return new Response(JSON.stringify({
        pages: [{ page_id: "99", page_name: "Ada Page", profile: "friend" }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("unexpected", { status: 500 });
  };
  const res = await worker.fetch(new Request("https://cr.desk/api/accounts", {
    method: "POST",
    headers: { cookie: `cr_session=${token}`, "x-cr-key": "super-secret-key-xyz" },
  }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.profile, "friend");
  assert.equal(data.accounts.find((row) => row.id === "instagram").connected, true);
  assert.equal(data.accounts.find((row) => row.id === "tiktok").connected, false);
  assert.deepEqual(data.pages, [{ id: "99", name: "Ada Page" }]);
  assert.equal(JSON.stringify(calls).includes("super-secret-key-xyz"), false);
});

test("signin returns the network authorize url", async (t) => {
  const orig = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = orig;
  });
  const token = await sessionToken();
  let start;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/users/friend")) {
      return new Response(JSON.stringify({ profile: { social_accounts: {} } }), { status: 200 });
    }
    start = { url: String(url), body: JSON.parse(init.body) };
    return new Response(JSON.stringify({
      authorize_url: "https://www.instagram.com/oauth/authorize?state=1",
    }), { status: 200 });
  };
  const res = await worker.fetch(new Request("https://cr.desk/api/signin", {
    method: "POST",
    headers: {
      cookie: `cr_session=${token}`,
      "content-type": "application/json",
      "x-cr-key": "k",
      "x-cr-profile": "friend",
    },
    body: JSON.stringify({ platform: "instagram" }),
  }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).authorize_url, "https://www.instagram.com/oauth/authorize?state=1");
  assert.equal(start.url, "https://api.upload-post.com/api/uploadposts/oauth/instagram/start");
  assert.equal(start.body.profile, "friend");
  assert.equal(start.body.redirect_url, "https://cr.desk/");
});

test("a story upload is limited to story networks and facebook needs a page", async (t) => {
  const orig = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = orig;
  });
  const token = await sessionToken();
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = init;
    return new Response(JSON.stringify({ success: true, request_id: "req_story" }), { status: 200 });
  };
  const headers = {
    cookie: `cr_session=${token}`,
    "x-cr-key": "k",
    "x-cr-profile": "friend",
    "x-idempotency-key": "story-1",
  };
  const missingPage = new FormData();
  missingPage.append("video", new File([new Uint8Array([1])], "a.mp4", { type: "video/mp4" }));
  missingPage.append("title", "Story");
  missingPage.append("platform", "facebook");
  missingPage.append("story", "1");
  const blocked = await worker.fetch(new Request("https://cr.desk/api/publish", { method: "POST", headers, body: missingPage }));
  assert.equal(blocked.status, 400);
  assert.equal(seen, undefined);

  const fd = new FormData();
  fd.append("video", new File([new Uint8Array([1])], "a.mp4", { type: "video/mp4" }));
  fd.append("title", "Story");
  fd.append("platform", "instagram");
  fd.append("platform", "youtube");
  fd.append("story", "1");
  const res = await worker.fetch(new Request("https://cr.desk/api/publish", { method: "POST", headers, body: fd }));
  assert.equal(res.status, 200);
  assert.deepEqual(seen.body.getAll("platform[]"), ["instagram"]);
  assert.equal(seen.body.get("media_type"), "STORIES");
  assert.equal(seen.body.get("privacyStatus"), null);
});
