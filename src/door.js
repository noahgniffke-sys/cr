const DOOR_CODE = "cr";
const DOOR_KEY = "cr-desk-door-v1";
const DOOR_MSG = "cr-ok";

export function normalizeCode(code) {
  if (code == null) return "";
  return String(code).trim().toLowerCase();
}

// Lengths differ in constant steps; the byte walk always covers the longer input.
export function codesMatch(input, expected = DOOR_CODE) {
  const a = normalizeCode(input);
  const b = normalizeCode(expected);
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

export async function sessionToken() {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(DOOR_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(DOOR_MSG));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
