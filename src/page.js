export const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>CR</title>
<style>
  :root {
    --bg: #0e0d0b;
    --paper: #f3efe6;
    --brass: #e2b15a;
    --muted: #b7b1a6;
    --dim: #8c867c;
    --line: #2a2622;
    --ink: #141310;
  }
  * { box-sizing: border-box; }
  html { background: var(--bg); }
  body {
    margin: 0;
    min-height: 100vh;
    background: var(--bg);
    color: var(--paper);
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.45;
  }
  ::selection { background: var(--brass); color: var(--bg); }
  :focus-visible { outline: 1px solid var(--brass); outline-offset: 3px; }
  button, input, textarea { font: inherit; color: inherit; }
  a { color: var(--brass); }
  .mark {
    font-family: "Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif;
    font-weight: 500;
    letter-spacing: 0.14em;
  }
  #lock {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 22px;
  }
  #lock[hidden], #desk[hidden] { display: none; }
  #lock h1 {
    font-size: 96px;
    line-height: 0.9;
    margin: 0;
  }
  #door { display: flex; flex-direction: column; align-items: center; gap: 14px; }
  #code {
    width: 160px;
    padding: 8px 4px;
    text-align: center;
    letter-spacing: 0.28em;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--brass);
    font-size: 18px;
  }
  #code:focus { outline: none; }
  #lock-error {
    min-height: 1.2em;
    margin: 0;
    color: var(--brass);
    font-size: 14px;
  }
  #desk {
    max-width: 1120px;
    margin: 0 auto;
    padding: 28px 32px 80px;
  }
  header.bar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--line);
  }
  header.bar .mark { font-size: 28px; margin: 0; }
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 16px 18px;
  }
  .tools label { display: flex; flex-direction: column; gap: 4px; }
  .tools label span {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .tools input {
    width: 148px;
    padding: 6px 0;
    background: transparent;
    border: none;
    border-bottom: 1px solid #3a342c;
    font-size: 14px;
  }
  #key { width: 180px; }
  .tools input:focus { outline: none; border-bottom-color: var(--brass); }
  #test, #refresh, #clear-file {
    background: transparent;
    color: var(--brass);
    border: 1px solid rgba(226, 177, 90, 0.7);
    padding: 7px 10px;
    cursor: pointer;
    font-size: 13px;
  }
  #conn {
    margin: 0;
    max-width: 22ch;
    color: var(--muted);
    font-size: 13px;
  }
  .help {
    max-width: 68ch;
    margin: 22px 0 28px;
    color: var(--muted);
    font-size: 14px;
  }
  .stage {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 40px;
    align-items: start;
  }
  #drop {
    position: relative;
    min-height: 440px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28px;
    background: var(--ink);
    border: 1px dashed rgba(226, 177, 90, 0.55);
    cursor: pointer;
    text-align: center;
  }
  #file {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
  #drop.hot { border-style: solid; background: #1b1915; }
  #empty p { margin: 0; }
  #empty .slate {
    font-family: "Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif;
    font-size: 34px;
    letter-spacing: 0.02em;
    margin-bottom: 8px;
  }
  #empty .quiet, #meta, #time-hint { color: var(--muted); }
  #picked { width: 100%; }
  #preview { width: 100%; max-height: 320px; background: #000; }
  #meta { margin: 12px 0; font-size: 13px; word-break: break-word; }
  #file-error { color: var(--brass); font-size: 14px; margin: 12px 0 0; }
  #file-error:empty { display: none; }
  #compose { display: flex; flex-direction: column; gap: 22px; }
  .field { display: flex; flex-direction: column; gap: 8px; }
  .field > span, .group-label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  textarea, #when {
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid #3a342c;
    padding: 8px 0;
    font-size: 18px;
    resize: vertical;
  }
  textarea:focus, #when:focus { outline: none; border-bottom-color: var(--brass); }
  .when { display: flex; flex-wrap: wrap; gap: 10px 16px; }
  #account-list { display: flex; flex-direction: column; }
  .account {
    display: grid;
    grid-template-columns: 140px 1fr auto;
    gap: 12px 18px;
    align-items: center;
    padding: 14px 0;
    border-top: 1px solid var(--line);
  }
  .account .meta { color: var(--muted); font-size: 14px; }
  .actions { display: flex; gap: 14px; }
  .actions button, #pages button, #fb-page {
    background: none;
    border: none;
    border-bottom: 1px solid var(--brass);
    color: var(--paper);
    padding: 0 0 4px;
    cursor: pointer;
  }
  .actions button:disabled { opacity: 0.35; cursor: not-allowed; border-bottom-color: transparent; }
  #pages { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
  #fb-page { color: var(--paper); }
  .choice {
    background: none;
    border: none;
    border-bottom: 1px solid transparent;
    color: var(--dim);
    padding: 0 0 6px;
    cursor: pointer;
    font-size: 15px;
  }
  .choice[aria-pressed="true"] {
    color: var(--paper);
    border-bottom-color: var(--brass);
  }
  #go {
    border: none;
    background: var(--brass);
    color: var(--bg);
    padding: 14px 16px;
    font-size: 15px;
    letter-spacing: 0.06em;
    cursor: pointer;
  }
  #go:disabled { opacity: 0.35; cursor: not-allowed; }
  #notice {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 14px;
  }
  .log { margin-top: 48px; }
  .log-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }
  .log h2 {
    margin: 0;
    font-family: "Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif;
    font-weight: 500;
    font-size: 22px;
    letter-spacing: 0.08em;
  }
  #history { list-style: none; margin: 8px 0 0; padding: 0; }
  #history li {
    padding: 14px 0;
    border-top: 1px solid var(--line);
  }
  #history strong { font-weight: 550; }
  #history .meta { display: block; margin-top: 4px; color: var(--muted); font-size: 13px; }
  @media (max-width: 860px) {
    #lock h1 { font-size: 72px; }
    #desk { padding: 20px 18px 64px; }
    header.bar { flex-direction: column; align-items: flex-start; }
    .stage { grid-template-columns: 1fr; }
    .account { grid-template-columns: 1fr; }
    #drop { min-height: 280px; }
  }
</style>
</head>
<body>
<section id="lock">
  <h1 class="mark">CR</h1>
  <form id="door">
    <input id="code" type="password" autocomplete="off" spellcheck="false" aria-label="Door code" autofocus>
    <p id="lock-error" role="alert"></p>
  </form>
</section>
<main id="desk" hidden>
  <header class="bar">
    <p class="mark">CR</p>
    <div class="tools">
      <label><span>Profile</span>
        <input id="profile" autocomplete="off" spellcheck="false">
      </label>
      <label><span>API key</span>
        <input id="key" type="password" autocomplete="off" spellcheck="false">
      </label>
      <button type="button" id="test">Test connection</button>
      <p id="conn" role="status"></p>
    </div>
  </header>
  <p class="help">Paste the API key from <a href="https://upload-post.com">upload-post.com</a> once. It stays in this browser. Then sign in to each network here. One button posts to every network that is signed in. Story posts to Instagram or Facebook only, and lasts 24 hours. Instagram has to be a Business or Creator account. Facebook posts to a Page.</p>
  <section>
    <div id="account-list"></div>
    <p id="pages"></p>
  </section>
  <div class="stage">
    <div id="drop" tabindex="0" role="button" aria-label="Choose a video">
      <input id="file" type="file" accept="video/*" tabindex="-1" aria-hidden="true">
      <div id="empty">
        <p class="slate">Drop a video</p>
        <p class="quiet">or click to choose</p>
      </div>
      <div id="picked" hidden>
        <video id="preview" controls playsinline preload="metadata"></video>
        <p id="meta"></p>
        <button type="button" id="clear-file">Remove</button>
      </div>
      <p id="file-error" role="alert"></p>
    </div>
    <form id="compose">
      <label class="field">
        <span>Title</span>
        <textarea id="title" rows="5" placeholder="Caption"></textarea>
      </label>
      <div class="when" role="group" aria-label="When to post">
        <button type="button" class="choice" id="now" aria-pressed="true">Post now</button>
        <button type="button" class="choice" id="later" aria-pressed="false">Schedule</button>
      </div>
      <label class="field" id="when-wrap" hidden>
        <span>When</span>
        <input id="when" type="datetime-local" step="60">
      </label>
      <p id="time-hint" hidden>Pick a time in the future.</p>
      <button id="go" type="submit" disabled>Post to all</button>
      <p id="notice" role="status" aria-live="polite"></p>
    </form>
  </div>
  <section class="log">
    <div class="log-head">
      <h2>History</h2>
      <button type="button" id="refresh">Refresh</button>
    </div>
    <ul id="history"></ul>
  </section>
</main>
<script>
const MAX_VIDEO = 95 * 1024 * 1024;
const PLATFORMS = [
  ["tiktok", "TikTok", false],
  ["instagram", "Instagram", true],
  ["youtube", "YouTube", false],
  ["facebook", "Facebook", true],
  ["x", "X", false],
  ["linkedin", "LinkedIn", false],
  ["threads", "Threads", false]
];
const NAMES = {};
PLATFORMS.forEach(function (pair) { NAMES[pair[0]] = pair[1]; });
let accountState = [];
let pageState = [];

let videoFile = null;
let previewUrl = "";
let sending = false;
let memoryKey = "";

const profileEl = document.getElementById("profile");
const keyEl = document.getElementById("key");
const titleEl = document.getElementById("title");
const whenEl = document.getElementById("when");
const whenWrap = document.getElementById("when-wrap");
const goEl = document.getElementById("go");
const noticeEl = document.getElementById("notice");
const connEl = document.getElementById("conn");
const dropEl = document.getElementById("drop");
const fileEl = document.getElementById("file");
const previewEl = document.getElementById("preview");
const metaEl = document.getElementById("meta");
const fileErrorEl = document.getElementById("file-error");
const historyEl = document.getElementById("history");
const accountListEl = document.getElementById("account-list");
const pagesEl = document.getElementById("pages");

function storageGet(key) {
  try { return localStorage.getItem(key) || ""; } catch (err) { return ""; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (err) {}
}
function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem("cr_history") || "[]");
    return Array.isArray(raw) ? raw.slice(0, 20) : [];
  } catch (err) {
    return [];
  }
}
function timeZone() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) return zone;
  } catch (err) {}
  return "America/Los_Angeles";
}
function selectedPage() {
  const saved = storageGet("cr_fb_page");
  if (pageState.some(function (page) { return page.id === saved; })) return saved;
  if (pageState.length) return pageState[0].id;
  return "";
}
function postableIds(story) {
  return accountState.filter(function (account) {
    if (!account.connected) return false;
    if (story && !account.story) return false;
    if (account.id === "facebook" && !selectedPage()) return false;
    return true;
  }).map(function (account) { return account.id; });
}
function schedulingOn() {
  return document.getElementById("later").getAttribute("aria-pressed") === "true";
}
function futureWhen() {
  if (!whenEl.value) return false;
  const picked = new Date(whenEl.value);
  return !Number.isNaN(picked.getTime()) && picked.getTime() > Date.now();
}
function toIso(raw) {
  return raw.length === 16 ? raw + ":00" : raw;
}
function pad(n) { return String(n).padStart(2, "0"); }
function localInputValue(date) {
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}
function formatSize(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}
function updateButton() {
  const ready = !sending && videoFile && titleEl.value.trim() && profileEl.value.trim() && keyEl.value.trim() && (!schedulingOn() || futureWhen());
  goEl.disabled = !ready || postableIds(false).length === 0;
  if (!sending) goEl.textContent = schedulingOn() ? "Schedule all" : "Post to all";
  document.getElementById("time-hint").hidden = !schedulingOn() || futureWhen();
  accountListEl.querySelectorAll("[data-act]").forEach(function (button) {
    const story = button.getAttribute("data-act") === "story";
    const id = button.getAttribute("data-id");
    button.disabled = !ready || postableIds(story).indexOf(id) === -1;
  });
}
function showLock(message) {
  document.getElementById("desk").hidden = true;
  document.getElementById("lock").hidden = false;
  document.getElementById("lock-error").textContent = message || "";
  document.getElementById("code").focus();
}
function currentIdempotency(scope) {
  const keyName = "cr_idempotency_" + scope;
  try {
    const existing = sessionStorage.getItem(keyName);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(keyName, next);
    return next;
  } catch (err) {
    if (!memoryKey) memoryKey = crypto.randomUUID();
    return memoryKey;
  }
}
function clearIdempotency(scope) {
  memoryKey = "";
  try { sessionStorage.removeItem("cr_idempotency_" + scope); } catch (err) {}
}
function setFileError(message) {
  fileErrorEl.textContent = message || "";
}
function takeFile(file) {
  if (!file || !file.type || file.type.indexOf("video/") !== 0 || !file.size) {
    setFileError("Choose a video file.");
    return;
  }
  if (file.size > MAX_VIDEO) {
    setFileError("That video is over 95 MB. This desk cannot send a file that large.");
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  videoFile = file;
  previewUrl = URL.createObjectURL(file);
  previewEl.src = previewUrl;
  metaEl.textContent = file.name + " · " + formatSize(file.size);
  fileErrorEl.textContent = "";
  document.getElementById("empty").hidden = true;
  document.getElementById("picked").hidden = false;
  fileEl.value = "";
  updateButton();
}
function clearVideo() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = "";
  videoFile = null;
  previewEl.removeAttribute("src");
  previewEl.load();
  metaEl.textContent = "";
  fileErrorEl.textContent = "";
  document.getElementById("empty").hidden = false;
  document.getElementById("picked").hidden = true;
  fileEl.value = "";
  updateButton();
}
function renderHistory() {
  const list = loadHistory();
  historyEl.replaceChildren();
  if (!list.length) {
    const li = document.createElement("li");
    li.className = "meta";
    li.textContent = "Nothing sent from this browser yet.";
    historyEl.appendChild(li);
    return;
  }
  list.forEach(function (row) {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = row.title || "Untitled";
    const meta = document.createElement("span");
    meta.className = "meta";
    const names = (row.platforms || []).map(function (id) { return NAMES[id] || id; }).join(", ");
    let when = row.time || "";
    try { if (row.time) when = new Date(row.time).toLocaleString(); } catch (err) {}
    meta.textContent = [names, when, row.status || ""].filter(Boolean).join(" · ");
    li.append(title, meta);
    historyEl.appendChild(li);
  });
}
function readStatus(data) {
  if (!data || typeof data !== "object") return "updated";
  if (data.status && data.message) return data.status + " — " + data.message;
  if (typeof data.status === "string") return data.status;
  if (typeof data.message === "string") return data.message;
  return "updated";
}
function saveHistory(entry) {
  const list = loadHistory();
  list.unshift(entry);
  storageSet("cr_history", JSON.stringify(list.slice(0, 20)));
  renderHistory();
}

function actionButton(label, act, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("data-act", act);
  button.setAttribute("data-id", id);
  button.addEventListener("click", function () {
    if (act === "signin") startSignIn(id, button);
    else publish([id], act === "story");
  });
  return button;
}
function renderAccounts() {
  accountListEl.replaceChildren();
  const rows = accountState.length ? accountState : PLATFORMS.map(function (pair) {
    return { id: pair[0], name: pair[1], story: pair[2], connected: false, label: "" };
  });
  rows.forEach(function (account) {
    const row = document.createElement("div");
    row.className = "account";
    const name = document.createElement("strong");
    name.textContent = account.name;
    const status = document.createElement("span");
    status.className = "meta";
    if (account.connected && account.id === "facebook" && !selectedPage()) status.textContent = "Signed in, but no Page to post to";
    else if (account.connected) status.textContent = account.label ? "Signed in · " + account.label : "Signed in";
    else status.textContent = account.label || "Not signed in";
    const actions = document.createElement("div");
    actions.className = "actions";
    if (!account.connected) actions.appendChild(actionButton("Sign in", "signin", account.id));
    else {
      actions.appendChild(actionButton("Post", "post", account.id));
      if (account.story) actions.appendChild(actionButton("Story", "story", account.id));
    }
    row.append(name, status, actions);
    accountListEl.appendChild(row);
  });
  pagesEl.replaceChildren();
  if (pageState.length > 1) {
    const label = document.createElement("label");
    label.append("Facebook Page ");
    const select = document.createElement("select");
    select.id = "fb-page";
    pageState.forEach(function (page) {
      const option = document.createElement("option");
      option.value = page.id;
      option.textContent = page.name;
      if (page.id === storageGet("cr_fb_page")) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      storageSet("cr_fb_page", select.value);
      renderAccounts();
      updateButton();
    });
    label.appendChild(select);
    pagesEl.appendChild(label);
    if (!storageGet("cr_fb_page")) storageSet("cr_fb_page", select.value);
  }
  updateButton();
}
function authHeaders(jsonBody) {
  const headers = {
    "X-CR-Key": keyEl.value.trim(),
    "X-CR-Profile": profileEl.value.trim() || "friend"
  };
  if (jsonBody) headers["content-type"] = "application/json";
  return headers;
}
async function refreshAccounts() {
  if (!keyEl.value.trim()) {
    connEl.textContent = "Add the API key, then sign in.";
    accountState = [];
    pageState = [];
    renderAccounts();
    return;
  }
  connEl.textContent = "Checking sign-ins…";
  let res;
  try {
    res = await fetch("/api/accounts", { method: "POST", headers: authHeaders(false) });
  } catch (err) {
    connEl.textContent = "Could not reach the desk.";
    return;
  }
  const text = await res.text();
  if (res.status === 401) {
    showLock("The door closed. Enter the code again.");
    return;
  }
  if (!res.ok) {
    connEl.textContent = text || "Not connected.";
    return;
  }
  let data = {};
  try { data = JSON.parse(text); } catch (err) { data = {}; }
  accountState = Array.isArray(data.accounts) ? data.accounts : [];
  pageState = Array.isArray(data.pages) ? data.pages : [];
  const signed = accountState.filter(function (account) { return account.connected; }).map(function (account) { return account.name; });
  connEl.textContent = signed.length ? "Signed in to " + signed.join(", ") + "." : "Key works. Sign in to a network.";
  renderAccounts();
}
async function startSignIn(id, button) {
  if (!keyEl.value.trim()) {
    connEl.textContent = "Add the API key first.";
    return;
  }
  button.disabled = true;
  connEl.textContent = "Opening " + (NAMES[id] || "sign-in") + "…";
  let res;
  try {
    res = await fetch("/api/signin", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ platform: id })
    });
  } catch (err) {
    button.disabled = false;
    connEl.textContent = "Could not reach the desk.";
    return;
  }
  const text = await res.text();
  if (res.status === 401) {
    showLock("The door closed. Enter the code again.");
    return;
  }
  let data = {};
  try { data = JSON.parse(text); } catch (err) { data = {}; }
  if (!res.ok || !data.authorize_url) {
    button.disabled = false;
    connEl.textContent = text || "Could not open sign-in.";
    return;
  }
  window.location.href = data.authorize_url;
}
function openDesk() {
  document.getElementById("lock").hidden = true;
  document.getElementById("desk").hidden = false;
  const params = new URLSearchParams(window.location.search);
  const status = params.get("connect_status");
  if (status) {
    const name = NAMES[params.get("platform")] || "That network";
    if (status === "success") noticeEl.textContent = name + " is signed in.";
    else if (params.get("error_code") === "ACCESS_DENIED") noticeEl.textContent = name + " sign-in was cancelled.";
    else noticeEl.textContent = "Could not sign in to " + name + ".";
    window.history.replaceState({}, "", window.location.pathname);
  }
  refreshAccounts();
}

profileEl.value = storageGet("cr_profile") || "friend";
storageSet("cr_profile", profileEl.value);
keyEl.value = storageGet("cr_api_key");
renderHistory();
renderAccounts();

document.getElementById("code").addEventListener("keydown", function (event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  document.getElementById("door").requestSubmit();
});
document.getElementById("door").addEventListener("submit", async function (event) {
  event.preventDefault();
  const error = document.getElementById("lock-error");
  error.textContent = "";
  let res;
  try {
    res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: document.getElementById("code").value })
    });
  } catch (err) {
    error.textContent = "Could not reach the desk.";
    return;
  }
  if (!res.ok) {
    error.textContent = "That code does not open the desk.";
    return;
  }
  openDesk();
  titleEl.focus();
});

profileEl.addEventListener("input", function () {
  storageSet("cr_profile", profileEl.value);
  updateButton();
});
profileEl.addEventListener("change", refreshAccounts);
keyEl.addEventListener("input", function () {
  storageSet("cr_api_key", keyEl.value);
  updateButton();
});
keyEl.addEventListener("change", refreshAccounts);
titleEl.addEventListener("input", updateButton);
whenEl.addEventListener("input", updateButton);

document.getElementById("now").addEventListener("click", function () {
  document.getElementById("now").setAttribute("aria-pressed", "true");
  document.getElementById("later").setAttribute("aria-pressed", "false");
  whenWrap.hidden = true;
  updateButton();
});
document.getElementById("later").addEventListener("click", function () {
  document.getElementById("now").setAttribute("aria-pressed", "false");
  document.getElementById("later").setAttribute("aria-pressed", "true");
  whenWrap.hidden = false;
  if (!whenEl.value) whenEl.value = localInputValue(new Date(Date.now() + 60 * 60 * 1000));
  updateButton();
});

dropEl.addEventListener("click", function (event) {
  if (event.target.closest("button, video, input")) return;
  fileEl.click();
});
dropEl.addEventListener("keydown", function (event) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileEl.click();
  }
});
fileEl.addEventListener("change", function () {
  if (fileEl.files && fileEl.files[0]) takeFile(fileEl.files[0]);
});
["dragenter", "dragover"].forEach(function (name) {
  dropEl.addEventListener(name, function (event) {
    event.preventDefault();
    dropEl.classList.add("hot");
  });
});
dropEl.addEventListener("dragleave", function () { dropEl.classList.remove("hot"); });
dropEl.addEventListener("drop", function (event) {
  event.preventDefault();
  dropEl.classList.remove("hot");
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (file) takeFile(file);
});
window.addEventListener("dragover", function (event) { event.preventDefault(); });
window.addEventListener("drop", function (event) { event.preventDefault(); });
document.getElementById("clear-file").addEventListener("click", function (event) {
  event.stopPropagation();
  clearVideo();
});

document.getElementById("test").addEventListener("click", refreshAccounts);

document.getElementById("compose").addEventListener("submit", function (event) {
  event.preventDefault();
  publish(postableIds(false), false);
});

async function publish(platforms, story) {
  if (sending || !videoFile || !platforms.length) return;
  const scope = (story ? "story" : "post") + ":" + platforms.slice().sort().join(",");
  sending = true;
  updateButton();
  noticeEl.textContent = "";
  const idem = currentIdempotency(scope);
  try {
    const fd = new FormData();
    fd.append("video", videoFile, videoFile.name);
    fd.append("title", titleEl.value.trim());
    platforms.forEach(function (id) { fd.append("platform", id); });
    fd.append("timezone", timeZone());
    if (story) fd.append("story", "1");
    const pageId = selectedPage();
    if (platforms.indexOf("facebook") !== -1 && pageId) fd.append("facebook_page_id", pageId);
    if (schedulingOn()) fd.append("scheduled_date", toIso(whenEl.value));
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: {
        "X-CR-Key": keyEl.value.trim(),
        "X-CR-Profile": profileEl.value.trim() || "friend",
        "X-Idempotency-Key": idem
      },
      body: fd
    });
    const text = await res.text();
    if (res.status === 401) {
      showLock("The door closed. Enter the code again.");
      return;
    }
    if (res.status === 200 || res.status === 202) {
      let data = {};
      try { data = JSON.parse(text); } catch (err) { data = { message: text }; }
      clearIdempotency(scope);
      const message = data.message || (data.job_id ? "Scheduled." : "Sent.");
      saveHistory({
        title: titleEl.value.trim(),
        platforms: platforms,
        time: new Date().toISOString(),
        status: (story ? "Story · " : "") + message,
        request_id: data.request_id || "",
        job_id: data.job_id || ""
      });
      noticeEl.textContent = message;
    } else {
      noticeEl.textContent = text || ("The post was not accepted (" + res.status + ").");
    }
  } catch (err) {
    noticeEl.textContent = "Could not reach the desk. The video is still here.";
  } finally {
    sending = false;
    updateButton();
  }
}

document.getElementById("refresh").addEventListener("click", async function () {
  const button = document.getElementById("refresh");
  const list = loadHistory();
  button.disabled = true;
  try {
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      if (!row.request_id && !row.job_id) continue;
      const payload = {};
      if (row.job_id) payload.job_id = row.job_id;
      else payload.request_id = row.request_id;
      let res;
      try {
        res = await fetch("/api/status", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "X-CR-Key": keyEl.value.trim(),
            "X-CR-Profile": profileEl.value.trim()
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        row.status = "Could not refresh";
        continue;
      }
      const text = await res.text();
      if (res.status === 401) {
        storageSet("cr_history", JSON.stringify(list.slice(0, 20)));
        renderHistory();
        showLock("The door closed. Enter the code again.");
        return;
      }
      if (!res.ok) {
        row.status = text || "Could not refresh";
        continue;
      }
      let data = {};
      try { data = JSON.parse(text); } catch (err) { data = {}; }
      row.status = readStatus(data);
    }
    storageSet("cr_history", JSON.stringify(list.slice(0, 20)));
    renderHistory();
  } finally {
    button.disabled = false;
  }
});

fetch("/api/session").then(function (res) {
  if (res.ok) openDesk();
}).catch(function () {});
</script>
</body>
</html>
`;
