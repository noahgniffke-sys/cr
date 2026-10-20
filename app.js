import { buildUploadFields, summarizeAccounts } from "./src/publish.js";

const API = "https://api.upload-post.com";
const MAX_VIDEO = 95 * 1024 * 1024;
const PLATFORMS = [
  ["tiktok", "TikTok", false],
  ["instagram", "Instagram", true],
  ["youtube", "YouTube", false],
  ["facebook", "Facebook", true],
  ["x", "X", false],
  ["linkedin", "LinkedIn", false],
  ["threads", "Threads", false],
];
const NAMES = Object.fromEntries(PLATFORMS.map(([id, name]) => [id, name]));

const keyEl = document.getElementById("key");
const keyStatus = document.getElementById("key-status");
const accountList = document.getElementById("account-list");
const pagesEl = document.getElementById("pages");
const titleEl = document.getElementById("title");
const whenEl = document.getElementById("when");
const whenWrap = document.getElementById("when-wrap");
const goEl = document.getElementById("go");
const noticeEl = document.getElementById("notice");
const dropEl = document.getElementById("drop");
const fileEl = document.getElementById("file");
const previewEl = document.getElementById("preview");

let accountState = [];
let pageState = [];
let profileName = "";
let videoFile = null;
let previewUrl = "";
let sending = false;
let memoryKey = "";

function storageGet(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}
function schedulingOn() {
  return document.getElementById("later").getAttribute("aria-pressed") === "true";
}
function futureWhen() {
  if (!whenEl.value) return false;
  return new Date(whenEl.value).getTime() > Date.now();
}
function toIso(raw) {
  const date = new Date(raw);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}
function timeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles"; }
  catch { return "America/Los_Angeles"; }
}
function here() {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  if (url.pathname.endsWith("/index.html")) url.pathname = url.pathname.slice(0, -"index.html".length);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}
function selectedPage() {
  const saved = storageGet("cr_fb_page");
  if (pageState.some((page) => page.id === saved)) return saved;
  return pageState[0]?.id || "";
}
function postableIds(story) {
  return accountState.filter((account) => {
    if (!account.connected) return false;
    if (story && !account.story) return false;
    if (account.id === "facebook" && !selectedPage()) return false;
    return true;
  }).map((account) => account.id);
}
function explain(result) {
  const message = result.data?.message || result.data?.error;
  const text = typeof message === "string" ? message : result.text;
  if (result.status === 401) return "That key was not accepted. Open API Keys, generate a new key, and paste it again.";
  return (text || "Something went wrong.").slice(0, 400);
}
async function call(path, { method = "GET", json, form, idem } = {}) {
  const headers = { Authorization: `Apikey ${keyEl.value.trim()}` };
  let body;
  if (json) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  if (idem) headers["Idempotency-Key"] = idem;
  const res = await fetch(API + path, { method, headers, body });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = null; }
  return { ok: res.ok, status: res.status, text, data };
}
function currentIdempotency(scope) {
  const keyName = `cr_idempotency_${scope}`;
  try {
    const existing = sessionStorage.getItem(keyName);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(keyName, next);
    return next;
  } catch {
    if (!memoryKey) memoryKey = crypto.randomUUID();
    return memoryKey;
  }
}
function clearIdempotency(scope) {
  memoryKey = "";
  try { sessionStorage.removeItem(`cr_idempotency_${scope}`); } catch { /* ignore */ }
}
function updateButton() {
  const ready = !sending && videoFile && titleEl.value.trim() && keyEl.value.trim() && profileName && (!schedulingOn() || futureWhen());
  goEl.disabled = !ready || postableIds(false).length === 0;
  if (!sending) goEl.textContent = schedulingOn() ? "Schedule all" : "Post to all";
  document.getElementById("time-hint").hidden = !schedulingOn() || futureWhen();
  accountList.querySelectorAll("[data-act='post'],[data-act='story']").forEach((button) => {
    const story = button.getAttribute("data-act") === "story";
    button.disabled = !ready || !postableIds(story).includes(button.getAttribute("data-id"));
  });
}
function renderAccounts() {
  const rows = accountState.length ? accountState : PLATFORMS.map(([id, name, story]) => ({ id, name, story, connected: false, label: "" }));
  accountList.replaceChildren();
  rows.forEach((account) => {
    const row = document.createElement("div");
    row.className = "account";
    const name = document.createElement("strong");
    name.textContent = account.name;
    const status = document.createElement("span");
    status.className = "meta";
    if (account.connected && account.id === "facebook" && !selectedPage()) status.textContent = "Signed in, but no Page to post to";
    else if (account.connected) status.textContent = account.label ? `Signed in · ${account.label}` : "Signed in";
    else status.textContent = account.label || "Not signed in";
    const actions = document.createElement("div");
    actions.className = "actions";
    const button = (label, act) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "text";
      el.textContent = label;
      el.dataset.act = act;
      el.dataset.id = account.id;
      el.addEventListener("click", () => {
        if (act === "signin") startSignIn(account.id, el);
        else publish([account.id], act === "story");
      });
      return el;
    };
    if (!account.connected) actions.append(button("Sign in", "signin"));
    else {
      actions.append(button("Post", "post"));
      if (account.story) actions.append(button("Story", "story"));
    }
    row.append(name, status, actions);
    accountList.append(row);
  });
  pagesEl.replaceChildren();
  if (pageState.length > 1) {
    const label = document.createElement("label");
    label.append("Facebook Page ");
    const select = document.createElement("select");
    select.id = "fb-page";
    pageState.forEach((page) => {
      const option = document.createElement("option");
      option.value = page.id;
      option.textContent = page.name;
      if (page.id === selectedPage()) option.selected = true;
      select.append(option);
    });
    select.addEventListener("change", () => {
      storageSet("cr_fb_page", select.value);
      renderAccounts();
    });
    label.append(select);
    pagesEl.append(label);
  }
  updateButton();
}
async function refreshAccounts() {
  const key = keyEl.value.trim();
  storageSet("cr_api_key", key);
  if (!key) {
    profileName = "";
    accountState = [];
    pageState = [];
    keyStatus.textContent = "Paste a key to start.";
    renderAccounts();
    return;
  }
  keyStatus.textContent = "Checking the key…";
  let list;
  try {
    list = await call("/api/uploadposts/users");
  } catch {
    keyStatus.textContent = "This page could not reach the posting service. Try again.";
    return;
  }
  if (!list.ok) {
    profileName = "";
    keyStatus.textContent = explain(list);
    renderAccounts();
    return;
  }
  const profiles = Array.isArray(list.data?.profiles) ? list.data.profiles : [];
  let profile = profiles.find((item) => item.username === storageGet("cr_profile")) || profiles[0];
  if (!profile) {
    const made = await call("/api/uploadposts/users", {
      method: "POST",
      json: { username: "friend", display_name: "CR" },
    });
    if (!made.ok && made.status !== 409) {
      keyStatus.textContent = explain(made);
      return;
    }
    const again = await call("/api/uploadposts/users/friend");
    profile = again.data?.profile || made.data?.profile || { username: "friend", social_accounts: {} };
  }
  profileName = profile.username || "friend";
  storageSet("cr_profile", profileName);
  accountState = summarizeAccounts(profile.social_accounts);
  pageState = [];
  const pages = await call(`/api/uploadposts/facebook/pages?profile=${encodeURIComponent(profileName)}`);
  if (pages.ok && Array.isArray(pages.data?.pages)) {
    pageState = pages.data.pages
      .filter((page) => page?.page_id && (!page.profile || page.profile === profileName))
      .map((page) => ({ id: String(page.page_id), name: String(page.page_name || page.page_id) }));
  }
  const signed = accountState.filter((account) => account.connected).map((account) => account.name);
  keyStatus.textContent = signed.length
    ? `Key saved. Signed in to ${signed.join(", ")}.`
    : "Key saved. Sign in to a network below.";
  renderAccounts();
}
async function startSignIn(id, button) {
  if (!keyEl.value.trim()) {
    keyStatus.textContent = "Save a key first.";
    return;
  }
  if (!profileName) await refreshAccounts();
  if (!profileName) return;
  button.disabled = true;
  keyStatus.textContent = `Opening ${NAMES[id] || "sign-in"}…`;
  let result;
  try {
    result = await call(`/api/uploadposts/oauth/${id}/start`, {
      method: "POST",
      json: { profile: profileName, redirect_url: here() },
    });
  } catch {
    button.disabled = false;
    keyStatus.textContent = "Could not open sign-in. Try again.";
    return;
  }
  const url = result.data?.authorize_url || "";
  if (!result.ok || !url.startsWith("https://")) {
    button.disabled = false;
    keyStatus.textContent = explain(result);
    return;
  }
  location.href = url;
}
function formatSize(n) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function takeFile(file) {
  const error = document.getElementById("file-error");
  if (!file || !file.type.startsWith("video/")) {
    error.textContent = "Choose a video file.";
    return;
  }
  if (file.size > MAX_VIDEO) {
    error.textContent = "That video is over 95 MB. Choose a smaller one.";
    return;
  }
  error.textContent = "";
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  videoFile = file;
  previewUrl = URL.createObjectURL(file);
  previewEl.src = previewUrl;
  document.getElementById("meta").textContent = `${file.name} · ${formatSize(file.size)}`;
  document.getElementById("empty").hidden = true;
  document.getElementById("picked").hidden = false;
  updateButton();
}
function clearVideo() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = "";
  videoFile = null;
  previewEl.removeAttribute("src");
  fileEl.value = "";
  document.getElementById("empty").hidden = false;
  document.getElementById("picked").hidden = true;
  updateButton();
}
function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem("cr_history") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}
function renderHistory() {
  const list = document.getElementById("history");
  const rows = loadHistory();
  list.replaceChildren();
  if (!rows.length) {
    const item = document.createElement("li");
    item.className = "quiet";
    item.textContent = "Nothing sent yet.";
    list.append(item);
    return;
  }
  rows.forEach((row) => {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = row.title || "Untitled";
    const meta = document.createElement("span");
    meta.className = "meta";
    const names = (row.platforms || []).map((id) => NAMES[id] || id).join(", ");
    meta.textContent = `${names} · ${row.status || ""}`;
    item.append(title, meta);
    list.append(item);
  });
}
function saveHistory(entry) {
  const rows = [entry, ...loadHistory()].slice(0, 20);
  storageSet("cr_history", JSON.stringify(rows));
  renderHistory();
}
async function publish(platforms, story) {
  if (sending || !videoFile || !platforms.length || !profileName) return;
  const scope = `${story ? "story" : "post"}:${platforms.slice().sort().join(",")}`;
  sending = true;
  updateButton();
  noticeEl.textContent = "Sending…";
  const idem = currentIdempotency(scope);
  try {
    const fields = buildUploadFields({
      title: titleEl.value.trim(),
      platforms,
      timezone: timeZone(),
      scheduledDate: schedulingOn() ? toIso(whenEl.value) : "",
      idempotencyKey: idem,
      story,
      facebookPageId: platforms.includes("facebook") ? selectedPage() : "",
    });
    const fd = new FormData();
    fd.append("user", profileName);
    for (const [name, value] of fields) fd.append(name, value);
    fd.append("video", videoFile, videoFile.name);
    const result = await call("/api/upload", { method: "POST", form: fd, idem });
    if (result.ok) {
      clearIdempotency(scope);
      const message = result.data?.message || (result.data?.job_id ? "Scheduled." : "Sent.");
      saveHistory({
        title: titleEl.value.trim(),
        platforms,
        status: `${story ? "Story · " : ""}${message}`,
        request_id: result.data?.request_id || "",
        job_id: result.data?.job_id || "",
      });
      noticeEl.textContent = message;
    } else {
      noticeEl.textContent = explain(result);
    }
  } catch {
    noticeEl.textContent = "Could not send. The video is still here.";
  } finally {
    sending = false;
    updateButton();
  }
}
function readStatus(data) {
  if (!data || typeof data !== "object") return "Updated";
  return data.status || data.message || data.state || "Updated";
}

keyEl.value = storageGet("cr_api_key");
renderHistory();
renderAccounts();

document.getElementById("save-key").addEventListener("click", refreshAccounts);
keyEl.addEventListener("change", refreshAccounts);
titleEl.addEventListener("input", updateButton);
whenEl.addEventListener("input", updateButton);
document.getElementById("now").addEventListener("click", () => {
  document.getElementById("now").setAttribute("aria-pressed", "true");
  document.getElementById("later").setAttribute("aria-pressed", "false");
  whenWrap.hidden = true;
  updateButton();
});
document.getElementById("later").addEventListener("click", () => {
  document.getElementById("now").setAttribute("aria-pressed", "false");
  document.getElementById("later").setAttribute("aria-pressed", "true");
  whenWrap.hidden = false;
  if (!whenEl.value) {
    const next = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    whenEl.value = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;
  }
  updateButton();
});
dropEl.addEventListener("click", (event) => {
  if (event.target.closest("button, video")) return;
  fileEl.click();
});
dropEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileEl.click();
  }
});
fileEl.addEventListener("change", () => { if (fileEl.files[0]) takeFile(fileEl.files[0]); });
["dragenter", "dragover"].forEach((name) => {
  dropEl.addEventListener(name, (event) => {
    event.preventDefault();
    dropEl.classList.add("hot");
  });
});
dropEl.addEventListener("dragleave", () => dropEl.classList.remove("hot"));
dropEl.addEventListener("drop", (event) => {
  event.preventDefault();
  dropEl.classList.remove("hot");
  const file = event.dataTransfer?.files?.[0];
  if (file) takeFile(file);
});
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());
document.getElementById("clear-file").addEventListener("click", (event) => {
  event.stopPropagation();
  clearVideo();
});
document.getElementById("compose").addEventListener("submit", (event) => {
  event.preventDefault();
  publish(postableIds(false), false);
});
document.getElementById("refresh").addEventListener("click", async () => {
  const button = document.getElementById("refresh");
  const rows = loadHistory();
  button.disabled = true;
  try {
    for (const row of rows) {
      if (!row.request_id && !row.job_id) continue;
      const query = row.job_id ? `job_id=${encodeURIComponent(row.job_id)}` : `request_id=${encodeURIComponent(row.request_id)}`;
      try {
        const result = await call(`/api/uploadposts/status?${query}`);
        row.status = result.ok ? readStatus(result.data) : explain(result);
      } catch {
        row.status = "Could not refresh";
      }
    }
    storageSet("cr_history", JSON.stringify(rows.slice(0, 20)));
    renderHistory();
  } finally {
    button.disabled = false;
  }
});

const returned = new URLSearchParams(location.search);
const returnedStatus = returned.get("connect_status");
if (returnedStatus) {
  const name = NAMES[returned.get("platform")] || "That network";
  if (returnedStatus === "success") noticeEl.textContent = `${name} is signed in.`;
  else if (returned.get("error_code") === "ACCESS_DENIED") noticeEl.textContent = `${name} sign-in was cancelled.`;
  else noticeEl.textContent = `Could not sign in to ${name}.`;
  history.replaceState({}, "", here());
}
if (keyEl.value.trim()) refreshAccounts();
