import { firebaseConfig } from "./firebase-config.js";

/* ---------- plan constants (from My Goal Tracker) ---------- */
const START = new Date(2026, 10, 11), END = new Date(2028, 9, 14), WEEK1_SUN = new Date(2026, 10, 8);
const TOTAL_WEEKS = 101;
const HABITS = [
  { k: "l", icon: "🌙", name: "Lights out by 10", hint: "In bed, lights off by 10 pm" },
  { k: "s", icon: "📚", name: "Studied 3 hrs+", hint: "Focused study time" },
  { k: "g", icon: "🏋️", name: "Gym / workout", hint: "Training session done" }
];
const MILESTONES = [
  { name: "Week 4", date: new Date(2026, 11, 5), target: "3 wins out of 4 weeks: past my old 3-week breaking point", cel: "Lunch/dinner with family", wins: 3 },
  { name: "Month 3", date: new Date(2027, 1, 13), target: "10 wins out of 12 weeks; waking at 5 feels normal", cel: "Weekend trip with family", wins: 10 },
  { name: "Month 6", date: new Date(2027, 4, 15), target: "About 70 kg; gym weights clearly up; career moves underway", cel: "Recliner sofa-set", kg: 70, lifts: true },
  { name: "Year 1", date: new Date(2027, 10, 13), target: "Senior Manager/Director role; about 72 kg", cel: "Foreign trip with family", kg: 72 },
  { name: "Finish", date: new Date(2028, 9, 14), target: "74 kg, and the routine runs without thinking", cel: "A new bike", kg: 74 }
];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const REASONS = [
  { k: "work", label: "Late work" }, { k: "travel", label: "Travel" }, { k: "ill", label: "Unwell" },
  { k: "family", label: "Family" }, { k: "energy", label: "Low energy" }, { k: "sleep", label: "Poor sleep" },
  { k: "social", label: "Social plans" }, { k: "other", label: "Other" }
];
const reasonLabel = (k) => (REASONS.find((x) => x.k === k) || { label: k }).label;
const LIFTS = [
  { k: "squat", name: "Squat", color: "var(--accent)" },
  { k: "bench", name: "Bench", color: "var(--floor)" },
  { k: "deadlift", name: "Deadlift", color: "var(--gold)" }
];
const TOTAL_Q = 9; // calendar quarters in the plan: Q4 2026 … Q4 2028

/* ---------- date helpers ---------- */
const d0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const x = d0(d); x.setDate(x.getDate() + n); return x; };
const key = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const parseKey = (k) => { const p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); };
const fmt = (d, yr) => d.getDate() + " " + MON[d.getMonth()] + (yr ? " " + d.getFullYear() : "");
const same = (a, b) => a.getTime() === b.getTime();
const today = () => d0(new Date());
const inPlan = (d) => d >= START && d <= END;
const clampPlan = (d) => (d < START ? START : d > END ? END : d);
const weekOf = (d) => Math.floor(Math.round((d0(d) - WEEK1_SUN) / 864e5) / 7) + 1;
const weekSun = (n) => addDays(WEEK1_SUN, (n - 1) * 7);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Calendar quarters (Q1 = Jan–Mar … Q4 = Oct–Dec). Stored as q1, q2, … counting from the plan's
// first quarter: q1 = Q4 2026, q2 = Q1 2027, … q9 = Q4 2028.
const Q0 = new Date(START.getFullYear(), Math.floor(START.getMonth() / 3) * 3, 1); // 1 Oct 2026
const calStart = (n) => new Date(Q0.getFullYear(), Q0.getMonth() + 3 * (n - 1), 1);
const qStart = (n) => (n === 1 ? START : calStart(n));
const qEnd = (n) => (n >= TOTAL_Q ? END : addDays(calStart(n + 1), -1));
const quarterOf = (d) => { for (let n = TOTAL_Q; n > 1; n--) if (d0(d) >= calStart(n)) return n; return 1; };
const qNum = (n) => Math.floor(calStart(n).getMonth() / 3) + 1;
const qYear = (n) => calStart(n).getFullYear();
const qName = (n) => "Q" + qNum(n) + " " + qYear(n);                       // "Q4 2026"
const qShort = (n) => "Q" + qNum(n) + " ’" + String(qYear(n)).slice(2);     // "Q4 ’26"
const qLabel = (n) => qName(n) + " · " + MON[calStart(n).getMonth()] + " – " + MON[calStart(n).getMonth() + 2];

/* ---------- state ---------- */
let state = { days: {}, weights: {}, lifts: {} };
let liftsLoaded = false, liftQ = null, wMsg = "", lMsg = "";
let sync = null, user = null, authReady = false, configMissing = false, loadError = "";
let tab = ["today", "weeks", "goals"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "today";
let sel = clampPlan(today());
let loginMsg = "", busy = false;

/* ---------- Face ID / Touch ID lock (WebAuthn passkey on this device) ---------- */
const LOCK_KEY = "gtLockCred";
const RELOCK_AFTER_MS = 60 * 60 * 1000; // re-lock after the app has been in the background for 1 hour
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const BIO = isIOS ? "Face ID" : "Touch ID";
let lockSupported = false, lockMsg = "", hiddenAt = 0, lockAbort = null;
const lockCred = () => { try { return localStorage.getItem(LOCK_KEY); } catch (_) { return null; } };
let locked = !!lockCred();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
try {
  if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then((ok) => { lockSupported = !!ok; if (tab === "goals") render(); }).catch(() => {});
  }
} catch (_) {}

async function verifyBiometric(signal) {
  const cred = lockCred(); if (!cred) return true;
  const a = await navigator.credentials.get({ signal, publicKey: {
    challenge: rnd(32), timeout: 60000, userVerification: "required",
    allowCredentials: [{ type: "public-key", id: unb64u(cred), transports: ["internal"] }]
  } });
  if (!a) return false;
  const flags = new Uint8Array(a.response.authenticatorData)[32];
  return (flags & 0x04) !== 0; // "user verified" flag: Face ID / Touch ID / device passcode succeeded
}
// WebAuthn only works when the page is visible and focused. Right after launch (or returning
// from the background) iOS can take a moment to hand focus over, so wait for it first.
function waitForFocus(maxMs) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    (function check() {
      if (document.visibilityState === "visible" && document.hasFocus()) return resolve(true);
      if (Date.now() - t0 > maxMs) return resolve(false);
      setTimeout(check, 100);
    })();
  });
}
async function autoUnlock() {
  if (!locked || !lockCred()) return;
  await waitForFocus(3000);
  await new Promise((r) => setTimeout(r, 250));
  if (!locked) return;
  const t0 = Date.now();
  const ok = await unlock(true);
  // An instant rejection means iOS wasn't ready (not a user cancel): try once more.
  if (!ok && locked && Date.now() - t0 < 900) {
    await new Promise((r) => setTimeout(r, 700));
    await waitForFocus(2000);
    if (locked) await unlock(true);
  }
}
async function unlock(auto) {
  // A tap cancels any prompt still waiting (e.g. an automatic one the browser held back) and starts fresh.
  if (lockAbort) { try { lockAbort.abort(); } catch (_) {} }
  const ctl = (typeof AbortController !== "undefined") ? new AbortController() : null;
  lockAbort = ctl; lockMsg = "";
  try {
    if (await verifyBiometric(ctl ? ctl.signal : undefined)) { locked = false; lockMsg = ""; }
    else lockMsg = "Couldn't verify. Try again.";
  } catch (err) {
    if (ctl && ctl.signal.aborted) return false; // replaced by a newer attempt
    if (!auto) lockMsg = err && err.name === "NotAllowedError" ? "Cancelled or not recognised. Tap to try again." : "Couldn't use " + BIO + " (" + (err && err.name || "error") + ").";
  }
  if (lockAbort === ctl) lockAbort = null;
  render();
  return !locked;
}
async function enableLock() {
  try {
    const c = await navigator.credentials.create({ publicKey: {
      challenge: rnd(32), rp: { name: "My Goal Tracker" },
      user: { id: rnd(16), name: (user && user.email) || "me", displayName: "Goal Tracker lock" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60000, attestation: "none"
    } });
    localStorage.setItem(LOCK_KEY, b64u(c.rawId));
    lockMsg = BIO + " lock is on for this device.";
  } catch (err) {
    lockMsg = err && err.name === "NotAllowedError" ? "Setup was cancelled." : "Couldn't turn on the lock (" + (err && err.name || "error") + ").";
  }
  render();
}
async function disableLock() {
  try {
    if (await verifyBiometric()) { localStorage.removeItem(LOCK_KEY); lockMsg = BIO + " lock is off for this device."; }
  } catch (_) { lockMsg = "Verification cancelled; the lock is still on."; }
  render();
}
function viewLock() {
  return `<div class="center" data-lockscreen style="align-items:center;text-align:center;min-height:90vh;cursor:pointer">
    <img class="logo" src="icon-192.png" alt="">
    <h1>Locked</h1><p class="sub">Tap anywhere to unlock with ${BIO}.</p>
    <button class="btn" data-act="unlock" style="margin-top:20px;min-width:240px">${isIOS ? "🙂" : "☝️"} Unlock with ${BIO}</button>
    <div class="err" style="margin-top:12px">${esc(lockMsg)}</div>
    <button class="linkbtn" data-act="signout" style="margin-top:28px">Can't unlock? Sign out and use your password</button></div>`;
}
function lockCardHtml() {
  const on = !!lockCred();
  let h = `<h2>App lock</h2><div class="card stack">`;
  if (on) h += `<div>🔒 <b>${BIO} lock is on</b> for this device. The app asks every time it opens, and again after 1 hour in the background.</div>
      <button class="btn ghost wide" data-act="lockoff">Turn off ${BIO} lock</button>`;
  else if (lockSupported) h += `<div class="muted">Require ${BIO} every time this app opens on this device.</div>
      <button class="btn wide" data-act="lockon">Turn on ${BIO} lock</button>`;
  else h += `<div class="muted">This browser can't use ${BIO} for web apps. On iPhone, open the app from your home screen; on Mac, use Safari or Chrome on a Mac with Touch ID.</div>`;
  h += `<div class="muted" id="lockMsg">${esc(lockMsg)}</div>
    <div class="muted" style="font-size:12px">Set it up separately on each device. Your login password still protects your data either way.</div></div>`;
  return h;
}

/* ---------- scoring ---------- */
const dayRec = (k) => state.days[k] || {};
const dayScore = (k) => { const r = dayRec(k); return (r.l ? 1 : 0) + (r.s ? 1 : 0) + (r.g ? 1 : 0); };
const dayCounts = (k) => dayScore(k) === 3 || !!dayRec(k).f;
function weekInfo(n) {
  const sun = weekSun(n), t = today(), days = [];
  let score = 0, possible = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(sun, i), ok = inPlan(d);
    days.push({ d, ok });
    if (ok) { possible += 3; score += dayScore(key(d)); }
  }
  const sat = addDays(sun, 6), lastDay = sat > END ? END : sat;
  const need = Math.ceil(possible * 15 / 21);
  return { n, sun, days, score, possible, need, done: t > lastDay, win: score >= need, started: t >= (sun < START ? START : sun) };
}
function winsThrough(date) {
  let w = 0;
  for (let n = 1; n <= TOTAL_WEEKS; n++) { const wi = weekInfo(n); if (wi.done && wi.win && addDays(wi.sun, 6) <= date) w++; }
  return w;
}
function allWins() {
  let w = 0, c = 0;
  for (let n = 1; n <= TOTAL_WEEKS; n++) { const wi = weekInfo(n); if (wi.done) { c++; if (wi.win) w++; } }
  return { w, c };
}
function streak() {
  const t = clampPlan(today());
  let d = dayCounts(key(t)) ? t : addDays(t, -1), s = 0;
  while (d >= START && dayCounts(key(d))) { s++; d = addDays(d, -1); }
  return s;
}
const weightList = () => Object.keys(state.weights).sort().map((d) => ({ d, kg: state.weights[d] }));
const latestWeight = () => { const l = weightList(); return l.length ? l[l.length - 1] : null; };
const liftList = () => Object.keys(state.lifts).map((q) => ({ n: +q.slice(1), ...state.lifts[q] }))
  .filter((x) => x.n >= 1 && x.n <= TOTAL_Q).sort((a, b) => a.n - b.n);
// First and latest logged value of one lift, and the % change between them.
function liftChange(k) {
  const l = liftList().filter((x) => typeof x[k] === "number");
  if (l.length < 2) return null;
  const a = l[0], b = l[l.length - 1];
  return { from: a[k], to: b[k], pct: (b[k] - a[k]) / a[k] * 100 };
}
function liftAvgChange() {
  const c = LIFTS.map((x) => liftChange(x.k)).filter(Boolean);
  return c.length ? c.reduce((s, x) => s + x.pct, 0) / c.length : null;
}
const pctTxt = (p) => (p >= 0 ? "+" : "−") + Math.abs(Math.round(p)) + "%";

/* ---------- sync status pill ---------- */
let statusTimer = null;
function showStatus(kind, code) {
  const el = document.getElementById("status");
  const msg = { synced: "Synced ✓", syncing: "Syncing…", connecting: "Connecting…", offline: "Offline · will sync later", error: "Sync problem" + (code ? " (" + code + ")" : "") }[kind] || "";
  el.textContent = msg;
  el.classList.toggle("off", kind === "offline" || kind === "error");
  el.classList.add("show");
  clearTimeout(statusTimer);
  if (kind === "synced") statusTimer = setTimeout(() => el.classList.remove("show"), 1500);
}
window.addEventListener("online", () => showStatus("connecting"));
window.addEventListener("offline", () => showStatus("offline"));

/* ---------- views ---------- */
function cellsHtml(wi, t, showNums) {
  return wi.days.map((x) => {
    let cls = "cell";
    if (!x.ok) cls += " na";
    else {
      const s = dayScore(key(x.d));
      if (s) cls += " l" + s;
      if (dayRec(key(x.d)).f) cls += " fl";
      if (x.d > t) cls += " future";
      if (same(x.d, showNums ? t : sel)) cls += " today";
    }
    const label = showNums ? (x.ok && dayScore(key(x.d)) ? dayScore(key(x.d)) : "") : DOW[x.d.getDay()][0];
    return `<button class="${cls}" data-go="${key(x.d)}">${label}</button>`;
  }).join("");
}

function viewToday() {
  const t = today(), k = key(sel), r = dayRec(k), future = sel > t, wi = weekInfo(weekOf(sel));
  const editable = !future && inPlan(sel) && t >= START;
  let h = `<h1>${same(sel, t) ? "Today" : DOW[sel.getDay()]}</h1>
    <p class="sub">Week ${wi.n} of ${TOTAL_WEEKS} · health, career move, family</p>`;
  if (t < START) h += `<div class="banner info">Your plan starts Wed 11 Nov 2026. Ticking opens on day one. You can already log your weight on the Milestones tab.</div>`;

  h += `<div class="datebar"><button class="navbtn" data-act="prev" ${sel <= START ? "disabled" : ""} aria-label="Previous day">‹</button>
    <div class="datelabel"><b>${DOW[sel.getDay()]}, ${fmt(sel, true)}</b><span>Day ${Math.round((sel - START) / 864e5) + 1} of ${Math.round((END - START) / 864e5) + 1}</span>
    ${!same(sel, clampPlan(t)) ? `<div><button class="todaylink" data-act="today">Back to today</button></div>` : ""}</div>
    <button class="navbtn" data-act="next" ${sel >= END || sel >= t ? "disabled" : ""} aria-label="Next day">›</button></div>`;

  const y = addDays(sel, -1);
  if (editable && inPlan(y) && !dayCounts(key(y)) && !dayCounts(k)) {
    h += `<div class="banner warn"><b>Never miss twice.</b> ${same(sel, t) ? "Yesterday" : "The day before"} didn't count. Today, at least hit your floor day: bed by 11, 15 min study, 15 min movement.
      ${!dayRec(key(y)).r ? `<div><button class="todaylink" style="color:inherit;text-decoration:underline" data-act="prev">Note what got in the way →</button></div>` : ""}</div>`;
  } else if (editable && dayScore(k) === 3) {
    h += `<div class="banner good">All three done. That's a full day. ✓</div>`;
  }

  HABITS.forEach((hb) => {
    h += `<button class="habit${r[hb.k] ? " on" : ""}" data-habit="${hb.k}" ${editable ? "" : "disabled"}>
      <div class="ic">${hb.icon}</div><div class="t"><b>${hb.name}</b><span>${hb.hint}</span></div><div class="check">✓</div></button>`;
  });
  h += `<button class="habit floor${r.f ? " on" : ""}" data-habit="f" ${editable ? "" : "disabled"}>
    <div class="ic">🛟</div><div class="t"><b>Floor day</b><span>Rough day? Bed by 11 · 15 min study · 15 min movement. Keeps the chain alive.</span></div><div class="check">✓</div></button>`;

  // "What got in the way?": shown for floor days, for past days that weren't full, or if a reason is already saved.
  if (editable && dayScore(k) < 3 && (r.f || sel < t || r.r || r.n)) {
    h += `<div class="card obst"><div><b>What got in the way?</b> <span class="muted">${r.f ? "Floor day ticked." : sel < t ? "This day wasn't a full one." : ""}</span></div>
      <div class="chips">${REASONS.map((x) => `<button class="chip${r.r === x.k ? " on" : ""}" data-reason="${x.k}">${x.label}</button>`).join("")}</div>
      <input id="note" type="text" maxlength="120" placeholder="Add a note (optional)" value="${esc(r.n || "")}" enterkeyhint="done"></div>`;
  }

  if (liftsLoaded && t >= START && !state.lifts["q" + quarterOf(t)]) {
    const qn = quarterOf(t);
    h += `<div class="banner info">🏋️ <b>${qn === 1 ? "Set your gym baseline." : "New quarter: time to log your lifts."}</b> Record your squat, bench and deadlift for ${qName(qn)}.
      <div><button class="todaylink" style="color:inherit;text-decoration:underline" data-act="golifts">Log lifts →</button></div></div>`;
  }

  const pct = wi.possible ? Math.min(100, wi.score / wi.possible * 100) : 0;
  const markPct = wi.possible ? wi.need / wi.possible * 100 : 0;
  const left = Math.max(0, wi.need - wi.score);
  h += `<div class="card"><div class="row between"><div><div class="muted">This week · from ${fmt(wi.sun < START ? START : wi.sun)}</div>
      <div class="big">${wi.score}<span class="muted" style="font-size:16px;font-weight:500"> / ${wi.possible}</span></div></div>
      <div style="text-align:right">${wi.win ? `<div class="big" style="color:var(--gold)">★</div><div class="muted">Success week</div>` : `<div class="muted">${left} more for a ★</div><div class="muted">target ${wi.need}</div>`}</div></div>
      <div class="bar"><i style="width:${pct}%"></i><span class="mark" style="left:${markPct}%"></span></div>
      <div class="cells" style="margin-top:12px">${cellsHtml(wi, t, false)}</div></div>`;

  const aw = allWins();
  h += `<div class="stats"><div class="stat"><b>${aw.w}</b><span>★ weeks won</span></div>
    <div class="stat"><b>${streak()}</b><span>day streak</span></div>
    <div class="stat"><b>${aw.c ? Math.round(aw.w / aw.c * 100) + "%" : "–"}</b><span>win rate</span></div></div>`;
  return h;
}

// Summary of what got in the way over the last 90 days.
function obstaclesHtml() {
  const from = key(addDays(today(), -89)), counts = {}, notes = [];
  Object.keys(state.days).filter((k) => k >= from).sort().forEach((k) => {
    const r = state.days[k];
    if (r.r) counts[r.r] = (counts[r.r] || 0) + 1;
    if (r.n) notes.push({ k, r: r.r, n: r.n });
  });
  const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  if (!top.length && !notes.length) return "";
  const max = top.length ? counts[top[0]] : 1;
  let h = `<div class="card"><div class="row between"><b>What got in the way</b><span class="muted">last 90 days</span></div>`;
  top.slice(0, 4).forEach((x) => {
    h += `<div class="obrow"><span>${esc(reasonLabel(x))}</span><div class="bar"><i style="width:${counts[x] / max * 100}%;background:var(--warn)"></i></div><b>${counts[x]}</b></div>`;
  });
  if (notes.length) {
    h += `<div class="muted" style="margin-top:10px">Latest notes</div>`;
    notes.slice(-3).reverse().forEach((x) => {
      h += `<button class="note" data-go="${x.k}"><span class="muted">${fmt(parseKey(x.k))}${x.r ? " · " + esc(reasonLabel(x.r)) : ""}</span><br>${esc(x.n)}</button>`;
    });
  }
  return h + `</div>`;
}

function viewWeeks() {
  const t = today(), cur = weekOf(clampPlan(t)), aw = allWins();
  let h = `<h1>All weeks</h1><p class="sub">${aw.w} ★ out of ${aw.c} finished weeks · 15+/21 = success week</p>
    ${obstaclesHtml()}
    <div class="card" style="padding:12px 10px">
    <div class="dayhead"><div></div><div class="cells">${DOW.map((d) => `<div>${d[0]}</div>`).join("")}</div><div style="text-align:right">Win?</div></div>`;
  for (let n = 1; n <= TOTAL_WEEKS; n++) {
    const wi = weekInfo(n), first = wi.sun < START ? START : wi.sun;
    const lbl = fmt(first) + (n === 1 || (first.getMonth() === 0 && first.getDate() <= 7) ? " ’" + String(first.getFullYear()).slice(2) : "");
    const sc = !wi.started ? `<span class="muted">–</span>` : wi.win ? `<span class="star">★</span> ${wi.score}` : `${wi.score}<span class="muted">/${wi.need}</span>`;
    h += `<div class="wk" id="w${n}"><div class="n">${n}</div><div><div class="lbl">${lbl}${n === cur && t >= START ? " · this week" : ""}</div>
      <div class="cells">${cellsHtml(wi, t, true)}</div></div><div class="score">${sc}</div></div>`;
  }
  h += `</div><p class="muted" style="margin-top:10px">Numbers = habits done that day. Blue ring = floor day. Tap any day to edit it. Week 1 is a short week (Wed–Sat), so its ★ needs ${weekInfo(1).need}/${weekInfo(1).possible}.</p>`;
  return h;
}

function spark(ws) {
  const W = 320, H = 90, P = 8, kgs = ws.map((w) => w.kg).concat([74]);
  const mn = Math.min(...kgs) - 1, mx = Math.max(...kgs) + 1;
  const t0 = parseKey(ws[0].d).getTime(), t1 = Math.max(parseKey(ws[ws.length - 1].d).getTime(), t0 + 864e5);
  const X = (d) => P + (parseKey(d).getTime() - t0) / (t1 - t0) * (W - 2 * P);
  const Y = (k) => H - P - (k - mn) / (mx - mn) * (H - 2 * P);
  const pts = ws.map((w) => X(w.d).toFixed(1) + "," + Y(w.kg).toFixed(1)).join(" ");
  const y74 = Y(74).toFixed(1);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <line x1="0" x2="${W}" y1="${y74}" y2="${y74}" stroke="var(--gold)" stroke-dasharray="4 4" stroke-width="1"/>
    <text x="${W - 4}" y="${+y74 - 4}" text-anchor="end" font-size="10" fill="var(--gold)">74 kg goal</text>
    ${ws.length > 1 ? `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` : ""}
    ${ws.map((w) => `<circle cx="${X(w.d).toFixed(1)}" cy="${Y(w.kg).toFixed(1)}" r="3" fill="var(--accent)"/>`).join("")}
  </svg>`;
}

function liftChart(list) {
  const W = 320, H = 140, L = 30, R = 12, T = 10, B = 32;
  const vals = []; list.forEach((x) => LIFTS.forEach((lf) => { if (typeof x[lf.k] === "number") vals.push(x[lf.k]); }));
  let mn = Math.min(...vals), mx = Math.max(...vals);
  const pad = Math.max(5, (mx - mn) * 0.15); mn = Math.max(0, mn - pad); mx += pad;
  const X = (n) => L + (n - 1) / (TOTAL_Q - 1) * (W - L - R);
  const Y = (v) => T + (1 - (v - mn) / (mx - mn)) * (H - T - B);
  let s = `<svg class="lchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lift progress by quarter">`;
  [mn, (mn + mx) / 2, mx].forEach((v) => {
    s += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)" stroke-width="1"/>
      <text x="${L - 4}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--muted)">${Math.round(v)}</text>`;
  });
  for (let n = 1; n <= TOTAL_Q; n++) {
    s += `<text x="${X(n).toFixed(1)}" y="${H - 17}" text-anchor="middle" font-size="9" fill="var(--muted)">Q${qNum(n)}</text>`;
    if (n === 1 || qNum(n) === 1) s += `<text x="${X(n).toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="9" font-weight="600" fill="var(--muted)">${qYear(n)}</text>`;
  }
  LIFTS.forEach((lf) => {
    const pts = list.filter((x) => typeof x[lf.k] === "number").map((x) => [X(x.n), Y(x[lf.k])]);
    if (pts.length > 1) s += `<polyline points="${pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="none" stroke="${lf.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p) => { s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${lf.color}"/>`; });
  });
  return s + `</svg><div class="legend">${LIFTS.map((lf) => `<span><i style="background:${lf.color}"></i>${lf.name}</span>`).join("")}</div>`;
}

function liftsCardHtml() {
  const t = today(), curQ = quarterOf(clampPlan(t));
  if (liftQ == null || liftQ > curQ) liftQ = curQ;
  const cur = state.lifts["q" + liftQ] || {};
  let h = `<h2 id="lifts">Gym lifts · quarterly</h2><div class="card">
    <div class="muted">Once a quarter, log your best working set for each lift (kg). ${qName(1)} is your baseline.</div>
    <form id="lform" class="stack" style="margin-top:10px">
      <select id="liftq" aria-label="Quarter">${Array.from({ length: curQ }, (_, i) => i + 1).reverse()
        .map((n) => `<option value="${n}" ${n === liftQ ? "selected" : ""}>${qLabel(n)}${state.lifts["q" + n] ? " ✓" : ""}</option>`).join("")}</select>
      <div class="lgrid">${LIFTS.map((lf) => `<label><span>${lf.name}</span><input id="lift_${lf.k}" type="number" inputmode="decimal" step="0.5" min="1" max="499" placeholder="kg" value="${cur[lf.k] != null ? cur[lf.k] : ""}"></label>`).join("")}</div>
      <button class="btn wide" type="submit">${(Object.keys(cur).length ? "Update " : "Save ") + qName(liftQ)}</button>
      <div class="muted">${esc(lMsg)}</div></form>`;
  const list = liftList();
  if (list.length) {
    h += liftChart(list) + `<table class="lt"><tr><th></th>${LIFTS.map((lf) => `<th>${lf.name}</th>`).join("")}</tr>`;
    list.forEach((x) => { h += `<tr><td>${qShort(x.n)}</td>${LIFTS.map((lf) => `<td>${x[lf.k] != null ? x[lf.k] : "–"}</td>`).join("")}</tr>`; });
    const ch = LIFTS.map((lf) => liftChange(lf.k));
    if (ch.some(Boolean)) h += `<tr class="chg"><td>Change</td>${ch.map((c) => `<td>${c ? `<b class="${c.pct >= 0 ? "up" : "down"}">${pctTxt(c.pct)}</b>` : "–"}</td>`).join("")}</tr>`;
    h += `</table>`;
    if (list.length === 1) h += `<p class="muted" style="margin:8px 0 0">Baseline saved. Log again in ${qName(2)} (from ${fmt(qStart(2), true)}) to see your progress.</p>`;
  }
  return h + `</div>`;
}

function viewGoals() {
  const t = today(), lw = latestWeight();
  let nextFound = false;
  let h = `<h1>Milestones</h1><p class="sub">11 Nov 2026 – 14 Oct 2028</p><div class="card" style="padding:4px 16px">`;
  MILESTONES.forEach((m) => {
    const done = t > m.date;
    let cls = "ms" + (done ? " done" : "");
    if (!done && !nextFound) { cls += " next"; nextFound = true; }
    let pr = "";
    if (m.wins) pr = `★ weeks by this date: ${winsThrough(m.date)} / ${m.wins} needed`;
    if (m.kg) pr = lw ? `Latest weight: ${lw.kg} kg → target ${m.kg} kg` : "Log your weight below to track this";
    if (m.lifts) {
      const avg = liftAvgChange();
      pr += `<br>${avg != null ? `Lifts vs your ${qName(1)} baseline: ${pctTxt(avg)} on average` : "Log your quarterly lifts below to track gym progress"}`;
    }
    const days = Math.round((m.date - t) / 864e5);
    h += `<div class="${cls}"><div class="dot"></div><div style="flex:1"><div class="row between"><b>${m.name}</b><span class="d">${fmt(m.date, true)}${days > 0 ? " · in " + days + " d" : ""}</span></div>
      <div class="tg">${esc(m.target)}</div><div class="cel">🎉 ${esc(m.cel)}</div><div class="pr">${pr}</div></div></div>`;
  });
  h += `</div><h2>Weight</h2><div class="card">
    <form id="wform" class="wform"><input id="kg" type="number" inputmode="decimal" step="0.1" min="30" max="200" placeholder="Weight (kg)">
      <input id="kgdate" type="date" value="${key(t)}" max="${key(t)}" aria-label="Date of weigh-in"><button class="btn" type="submit">Log</button></form>
    ${wMsg ? `<div class="muted" style="margin-top:6px">${esc(wMsg)}</div>` : ""}`;
  const ws = weightList();
  if (ws.length) {
    h += spark(ws) + `<div style="margin-top:8px">`;
    ws.slice(-5).reverse().forEach((w) => {
      h += `<div class="row between" style="padding:6px 0;border-top:1px solid var(--line);font-size:14px"><span>${fmt(parseKey(w.d), true)}</span>
        <span><b>${w.kg} kg</b> <button data-delw="${w.d}" class="muted" style="margin-left:10px" aria-label="Delete">✕</button></span></div>`;
    });
    h += `</div>`;
  } else h += `<p class="muted" style="margin:10px 0 0">Targets: ~70 kg by May ’27, ~72 kg by Nov ’27, 74 kg at the finish.</p>`;
  h += `</div>` + liftsCardHtml() + `
    <h2>The rules</h2><div class="card"><ul class="rules">
      <li><b>Each day:</b> lights out by 10 · studied 3 hrs+ · gym/workout</li>
      <li><b>15+ / 21</b> ticks in a week = success week ★</li>
      <li><b>Never miss twice</b> consecutively</li>
      <li><b>Floor day:</b> bed by 11, 15 min study, 15 min movement</li></ul></div>
    ${lockCardHtml()}
    <h2>Account & backup</h2><div class="card stack">
      <div class="muted">Signed in as ${esc(user && user.email || "")}</div>
      <div class="row"><button class="btn ghost" data-act="export" style="flex:1">Export my data</button>
        <label class="btn ghost" style="flex:1;cursor:pointer">Import backup<input id="importFile" type="file" accept="application/json,.json" hidden></label></div>
      <div class="err" id="acctMsg"></div>
      <button class="btn ghost wide" data-act="signout">Sign out</button></div>`;
  return h;
}

function viewLogin() {
  return `<div class="center"><img class="logo" src="icon-192.png" alt="">
    <h1>My Goal Tracker</h1><p class="sub">Sign in to sync your iPhone and Mac.</p>
    <form id="login" class="card stack">
      <input id="email" type="email" autocomplete="username" placeholder="Email" required>
      <input id="pw" type="password" autocomplete="current-password" placeholder="Password" required>
      <button class="btn wide" type="submit" ${busy ? "disabled" : ""}>${busy ? "Signing in…" : "Sign in"}</button>
      <div class="err" id="loginMsg">${esc(loginMsg)}</div>
      <button class="linkbtn" type="button" data-act="reset">Forgot password?</button>
    </form></div>`;
}

function viewSetup() {
  return `<div class="center"><h1>Almost there</h1>
    <div class="card"><p style="margin-top:0">This app isn't connected to your Firebase project yet.</p>
    <p class="muted" style="margin-bottom:0">Open <b>firebase-config.js</b> in your GitHub repository and paste in your Firebase config values (step 4 of the setup guide). Then reload this page.</p></div></div>`;
}

function render() {
  const root = document.getElementById("root");
  // Keep anything half-typed (and the cursor) when the screen redraws, e.g. after a sync update.
  const keep = {};
  root.querySelectorAll("input[data-dirty], select[data-dirty]").forEach((el) => { if (el.id) keep[el.id] = el.value; });
  const ae = document.activeElement, focusId = ae && ae !== document.body && root.contains(ae) && ae.id ? ae.id : null;
  let caret = null; try { if (focusId && ae.selectionStart != null) caret = [ae.selectionStart, ae.selectionEnd]; } catch (_) {}
  let h;
  if (configMissing) h = viewSetup();
  else if (loadError) h = `<div class="center"><h1>Can't load</h1><div class="card">${esc(loadError)}<p class="muted">Check your internet connection and reload. After the first successful load the app also works offline.</p></div></div>`;
  else if (!authReady) h = `<div class="center"><p class="muted">Loading…</p></div>`;
  else if (!user) h = viewLogin();
  else if (locked && lockCred()) h = viewLock();
  else {
    h = tab === "today" ? viewToday() : tab === "weeks" ? viewWeeks() : viewGoals();
    h += `<nav class="tabs"><div class="in">${[["today", "✅", "Today"], ["weeks", "🗓️", "Weeks"], ["goals", "🏁", "Milestones"]]
      .map((x) => `<button class="tab${tab === x[0] ? " on" : ""}" data-tab="${x[0]}"><span class="ti">${x[1]}</span>${x[2]}</button>`).join("")}</div></nav>`;
  }
  root.innerHTML = h;
  Object.keys(keep).forEach((id) => { const el = document.getElementById(id); if (el) { el.value = keep[id]; el.dataset.dirty = "1"; } });
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) { try { el.focus({ preventScroll: true }); if (caret) el.setSelectionRange(caret[0], caret[1]); } catch (_) {} }
  }
}
document.addEventListener("input", (e) => { if (e.target.id && e.target.matches("input,select")) e.target.dataset.dirty = "1"; });
const clean = (...ids) => ids.forEach((id) => { const el = document.getElementById(id); if (el) delete el.dataset.dirty; });

/* ---------- day record writes ---------- */
function saveDay(k, r) {
  Object.keys(r).forEach((x) => { if (!r[x]) delete r[x]; });
  const rec = Object.keys(r).length ? r : null;
  if (rec) state.days[k] = rec; else delete state.days[k];
  sync.setDay(k, rec).catch((err) => showStatus("error", err.code));
}
// Saves the note box (if it was changed) for the day currently on screen.
function saveNote() {
  const el = document.getElementById("note");
  if (!el || !el.dataset.dirty) return;
  const k = key(sel), r = { ...dayRec(k) }, v = el.value.trim().slice(0, 120);
  delete el.dataset.dirty;
  if ((r.n || "") === v) return;
  r.n = v; saveDay(k, r);
}

function goTab(name) {
  saveNote();
  if (name !== tab) { wMsg = ""; lMsg = ""; }
  tab = name;
  try { history.replaceState(null, "", "#" + tab); } catch (_) {}
  render(); window.scrollTo(0, 0);
  if (tab === "weeks") { const el = document.getElementById("w" + weekOf(clampPlan(today()))); if (el) el.scrollIntoView({ block: "center" }); }
}
window.addEventListener("pageshow", () => { if (user && locked && lockCred() && !lockAbort) autoUnlock(); });
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (["today", "weeks", "goals"].includes(h) && h !== tab) goTab(h); });

/* ---------- actions ---------- */
function acctMsg(m) { const el = document.getElementById("acctMsg"); if (el) el.textContent = m; }
function authError(e) {
  const c = (e && e.code) || "";
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return "Email or password is wrong.";
  if (/too-many-requests/.test(c)) return "Too many attempts. Wait a few minutes and try again.";
  if (/network/.test(c)) return "No internet connection.";
  return "Couldn't sign in (" + (c || "unknown error") + ").";
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) { if (e.target.closest("[data-lockscreen]")) unlock(false); return; }
  if (b.dataset.tab) return goTab(b.dataset.tab);
  const act = b.dataset.act;
  if (act === "prev" || act === "next" || act === "today") {
    saveNote(); clean("note");
    sel = act === "today" ? clampPlan(today()) : clampPlan(addDays(sel, act === "prev" ? -1 : 1));
    render(); window.scrollTo(0, 0); return;
  }
  if (act === "golifts") {
    liftQ = quarterOf(clampPlan(today())); goTab("goals");
    const el = document.getElementById("lifts"); if (el) el.scrollIntoView({ block: "start" });
    return;
  }
  if (act === "signout") {
    // Signing out removes the lock on this device; getting back in needs the account password.
    try { localStorage.removeItem(LOCK_KEY); } catch (_) {}
    locked = false; lockMsg = "";
    await sync.logOut(); state = { days: {}, weights: {}, lifts: {} }; liftsLoaded = false; return;
  }
  if (act === "unlock") return unlock(false);
  if (act === "lockon") return enableLock();
  if (act === "lockoff") return disableLock();
  if (act === "reset") {
    const em = (document.getElementById("email").value || "").trim();
    const el = document.getElementById("loginMsg");
    if (!em) { el.textContent = "Type your email above first."; return; }
    try { await sync.resetPassword(em); el.textContent = "If that account exists, a reset email is on its way."; }
    catch (err) { el.textContent = authError(err); }
    return;
  }
  if (act === "export") {
    const data = JSON.stringify({ app: "goal-tracker", exported: new Date().toISOString(), days: state.days, weights: state.weights, lifts: state.lifts }, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.download = "goal-tracker-backup-" + key(today()) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return acctMsg("Backup saved to your downloads.");
  }
  if (b.dataset.go) {
    const d = parseKey(b.dataset.go); if (d > today()) return;
    saveNote(); clean("note");
    sel = clampPlan(d); return goTab("today");
  }
  if (b.dataset.habit) {
    if (sel > today() || today() < START) return;
    saveNote();
    const k = key(sel), r = { ...dayRec(k) };
    r[b.dataset.habit] = r[b.dataset.habit] ? 0 : 1;
    saveDay(k, r); render();
    return;
  }
  if (b.dataset.reason) {
    if (sel > today() || today() < START) return;
    saveNote();
    const k = key(sel), r = { ...dayRec(k) };
    r.r = r.r === b.dataset.reason ? "" : b.dataset.reason; // tap again to clear
    saveDay(k, r); render();
    return;
  }
  if (b.dataset.delw) {
    delete state.weights[b.dataset.delw]; render();
    sync.setWeight(b.dataset.delw, null).catch((err) => showStatus("error", err.code));
  }
});

document.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (e.target.id === "login") {
    const em = document.getElementById("email").value.trim(), pw = document.getElementById("pw").value;
    busy = true; loginMsg = ""; render();
    document.getElementById("email").value = em;
    try { await sync.signIn(em, pw); loginMsg = ""; }
    catch (err) { loginMsg = authError(err); }
    busy = false; render();
    return;
  }
  if (e.target.id === "wform") {
    const v = parseFloat(document.getElementById("kg").value);
    if (!(v >= 30 && v <= 200)) { wMsg = "Enter a weight between 30 and 200 kg."; return render(); }
    const dv = document.getElementById("kgdate").value || key(today());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dv) || parseKey(dv) > today()) { wMsg = "Pick today or an earlier date."; return render(); }
    const kg = Math.round(v * 10) / 10, existed = state.weights[dv] != null;
    state.weights[dv] = kg;
    wMsg = (existed ? "Updated " : "Saved ") + kg + " kg for " + (dv === key(today()) ? "today" : fmt(parseKey(dv), true)) + ".";
    clean("kg", "kgdate"); document.getElementById("kg").value = ""; render();
    sync.setWeight(dv, kg).catch((err) => showStatus("error", err.code));
    return;
  }
  if (e.target.id === "lform") {
    const rec = {}; let bad = false;
    LIFTS.forEach((lf) => {
      const raw = document.getElementById("lift_" + lf.k).value.trim();
      if (!raw) return;
      const v = parseFloat(raw);
      if (!(v > 0 && v < 500)) bad = true; else rec[lf.k] = Math.round(v * 2) / 2;
    });
    if (bad) { lMsg = "Each lift must be between 1 and 499 kg."; return render(); }
    const q = "q" + liftQ;
    if (!Object.keys(rec).length) {
      if (!state.lifts[q]) { lMsg = "Enter at least one lift."; return render(); }
      delete state.lifts[q]; lMsg = qName(liftQ) + " entry removed.";
    } else { state.lifts[q] = rec; lMsg = qName(liftQ) + " lifts saved."; }
    clean(...LIFTS.map((lf) => "lift_" + lf.k)); render();
    sync.setLift(q, Object.keys(rec).length ? rec : null).catch((err) => showStatus("error", err.code));
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "note") { e.preventDefault(); e.target.blur(); }
});

document.addEventListener("change", async (e) => {
  if (e.target.id === "note") { saveNote(); return; }
  if (e.target.id === "liftq") {
    saveNote();
    liftQ = +e.target.value; lMsg = "";
    clean("liftq", ...LIFTS.map((lf) => "lift_" + lf.k)); render();
    return;
  }
  if (e.target.id !== "importFile") return;
  const f = e.target.files && e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    let weights = data.weights || {};
    if (Array.isArray(weights)) { const m = {}; weights.forEach((w) => { m[w.d] = w.kg; }); weights = m; }
    const days = {};
    Object.keys(data.days || {}).forEach((k) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
      const src = data.days[k] || {}, r = {};
      ["l", "s", "g", "f"].forEach((x) => { if (src[x]) r[x] = 1; });
      if (typeof src.r === "string" && src.r) r.r = src.r.slice(0, 20);
      if (typeof src.n === "string" && src.n) r.n = src.n.slice(0, 200);
      if (Object.keys(r).length) days[k] = r;
    });
    const lifts = {};
    Object.keys(data.lifts || {}).forEach((q) => {
      if (!/^q\d{1,2}$/.test(q)) return;
      const r = {}; ["squat", "bench", "deadlift"].forEach((x) => { const v = data.lifts[q][x]; if (typeof v === "number" && v > 0 && v < 500) r[x] = v; });
      if (Object.keys(r).length) lifts[q] = r;
    });
    const n = await sync.importAll(days, weights, lifts);
    acctMsg(`Imported ${n} entries.`);
  } catch (err) { acctMsg("That file couldn't be imported."); }
  e.target.value = "";
});

// Roll over to the new day when the app is reopened after midnight.
let lastDay = key(today());
function checkDay() {
  const k = key(today());
  if (k !== lastDay) { if (key(sel) === lastDay) sel = clampPlan(today()); lastDay = k; render(); }
}
document.addEventListener("visibilitychange", () => {
  const root = document.getElementById("root");
  if (document.hidden) {
    hiddenAt = Date.now();
    if (lockCred() && user) root.style.visibility = "hidden"; // keep data out of the app-switcher preview
    return;
  }
  root.style.visibility = "";
  if (lockCred() && user && !locked && hiddenAt && Date.now() - hiddenAt > RELOCK_AFTER_MS) {
    locked = true; lockMsg = ""; render(); autoUnlock();
  }
  checkDay();
});
setInterval(checkDay, 60000);

/* ---------- boot ---------- */
async function boot() {
  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE")) { configMissing = true; return render(); }
  try { sync = await import("./sync.js"); }
  catch (err) { loadError = "The sync library couldn't be downloaded."; return render(); }
  sync.init(firebaseConfig);
  sync.onAuth((u) => {
    user = u; authReady = true;
    if (u) {
      sync.subscribe(u.uid,
        (days) => { state.days = days; render(); },
        (weights) => { state.weights = weights; render(); },
        showStatus,
        (lifts) => { state.lifts = lifts; liftsLoaded = true; render(); });
    } else { sync.unsubscribe(); state = { days: {}, weights: {}, lifts: {} }; liftsLoaded = false; }
    render();
    if (u && locked && lockCred()) autoUnlock(); // show the Face ID / Touch ID prompt straight away
  });
}
boot();
