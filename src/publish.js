export const MAX_VIDEO_BYTES = 95 * 1024 * 1024;

export const PLATFORMS = [
  ["tiktok", "TikTok", false],
  ["instagram", "Instagram", true],
  ["youtube", "YouTube", false],
  ["facebook", "Facebook", true],
  ["x", "X", false],
  ["linkedin", "LinkedIn", false],
  ["threads", "Threads", false],
];

const PLATFORM_IDS = PLATFORMS.map(([id]) => id);
const STORY_IDS = PLATFORMS.filter(([, , story]) => story).map(([id]) => id);

export function knownPlatform(id) {
  return PLATFORM_IDS.includes(id);
}

export function normalizeProfile(value) {
  const name = value == null ? "" : String(value).trim();
  const profile = name || "friend";
  if (!/^[A-Za-z0-9_@-]{1,64}$/.test(profile)) return "";
  return profile;
}

export function summarizeAccounts(social) {
  const bag = social && typeof social === "object" ? social : {};
  return PLATFORMS.map(([id, name, story]) => {
    const value = bag[id];
    const record = value && typeof value === "object" ? value : null;
    const needsSignIn = !record || record.reauth_required === true;
    let label = "";
    if (record) {
      if (record.reauth_required === true) label = "Sign in again";
      else if (record.handle) label = String(record.handle).startsWith("@") ? String(record.handle) : `@${record.handle}`;
      else if (record.display_name) label = String(record.display_name);
    }
    return { id, name, story, connected: !needsSignIn, label };
  });
}

export function acceptsVideoSize(size) {
  return typeof size === "number" && Number.isFinite(size) && size > 0 && size <= MAX_VIDEO_BYTES;
}

export function buildUploadFields({
  title,
  platforms,
  timezone,
  scheduledDate,
  idempotencyKey,
  story,
  facebookPageId,
} = {}) {
  const text = title == null ? "" : String(title);
  const chosen = [];
  const list = Array.isArray(platforms) ? platforms : [];
  for (const raw of list) {
    const id = String(raw ?? "").trim().toLowerCase();
    if (!PLATFORM_IDS.includes(id) || chosen.includes(id)) continue;
    if (story === true && !STORY_IDS.includes(id)) continue;
    chosen.push(id);
  }

  const fields = [];
  for (const id of chosen) fields.push(["platform[]", id]);
  fields.push(["title", text]);
  fields.push(["description", text]);
  fields.push(["async_upload", "true"]);
  const zone = typeof timezone === "string" && timezone.trim() ? timezone.trim() : "America/Los_Angeles";
  fields.push(["timezone", zone]);
  if (typeof scheduledDate === "string" && scheduledDate.trim()) {
    fields.push(["scheduled_date", scheduledDate.trim()]);
  }
  if (chosen.includes("instagram")) fields.push(["media_type", story === true ? "STORIES" : "REELS"]);
  if (chosen.includes("facebook")) {
    fields.push(["facebook_media_type", story === true ? "STORIES" : "REELS"]);
    if (typeof facebookPageId === "string" && facebookPageId.trim()) {
      fields.push(["facebook_page_id", facebookPageId.trim()]);
    }
  }
  if (chosen.includes("youtube")) fields.push(["privacyStatus", "public"]);
  if (idempotencyKey != null && String(idempotencyKey).trim()) {
    fields.push(["external_id", String(idempotencyKey).trim()]);
  }
  return fields;
}
