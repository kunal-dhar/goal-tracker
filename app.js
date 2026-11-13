import { firebaseConfig } from "./firebase-config.js";

/* ---------- plan constants ----------
   The master copy of the plan is plan/milestones.csv and plan/plan-rules.csv in this repository.
   If you change the plan there, change PHASES below to match. */
const START = new Date(2026, 10, 11), END = new Date(2028, 9, 7), WEEK1_SUN = new Date(2026, 10, 8);
const CELEBRATION = new Date(2028, 9, 14); // 14 Oct 2028, birthday: grand celebration
const TOTAL_WEEKS = 100;
const GOAL_KG = 75; // final body-weight goal (at ~18% body fat), shown on the weight chart
const HABITS = [
  { k: "l", icon: "🌙", name: "Lights out", hint: "In bed, lights off" },
  { k: "s", icon: "📚", name: "Studied 3 hrs+", hint: "Focused study time" },
  { k: "g", icon: "🏋️", name: "Gym / workout", hint: "Training session done" }
];
// One phase per quarter. target = ★ weeks needed within the phase (the only target; it decides the reward).
// lo = lights-out time (minutes after midnight), the daily habit for that phase.
// kg, lift, wake, body, wakeTxt, career = expected outcomes: shown for monitoring, never pass/fail.
// bodyPhase, bodyCal, bodyTarget = the body plan for the quarter (phase, calories vs maintenance, end-of-quarter target).
// body = extra notes. Target plan: ~75 kg at ~18% body fat by Oct 2028.
const PHASES = [
  { name: "Q4 2026", start: [2026, 10, 11], end: [2027, 0, 2], w: [1, 8], target: 6, lo: 22 * 60, wake: 5 * 60 + 30, kg: null, lift: null,
    bodyPhase: "Foundation: full body 3x/week; DEXA scan and blood work", bodyCal: "+200 kcal over maintenance", bodyTarget: "~67 kg",
    body: "Baseline logged; training 3x/week (full body) on a set program; ~2 g protein per kg daily", wakeTxt: "Waking 5:30 am on weekdays, lights out at 10", career: "Study, Apply, Repeat", reward: "Dinner or lunch out with the family" },
  { name: "Q1 2027", start: [2027, 0, 3], end: [2027, 3, 3], w: [9, 21], target: 10, lo: 22 * 60, wake: 5 * 60, kg: 69, lift: 15,
    bodyPhase: "Lean bulk: upper/lower split 4x/week", bodyCal: "+300 kcal", bodyTarget: "~69 kg",
    body: "~+2 kg, waist up no more than ~1 cm; first visible change in shoulders and arms", wakeTxt: "5:00 am feels normal on weekdays, lights out at 10", career: "Study, Apply, Repeat", reward: "Short foreign trip; my daughter's 1st birthday" },
  { name: "Q2 2027", start: [2027, 3, 4], end: [2027, 6, 3], w: [22, 34], target: 11, lo: 21 * 60 + 45, wake: 4 * 60 + 45, kg: 70.5, lift: 25,
    bodyPhase: "Lean bulk; deload (an easier week) every 6–8 weeks", bodyCal: "+250 kcal", bodyTarget: "~70.5 kg",
    body: "~70.5 kg; clothes tighter at chest and arms, not the waist; people notice", wakeTxt: "4:45 am; lights out moves to 9:45", career: "Study, Apply, Repeat", reward: "Bike Upgrade" },
  { name: "Q3 2027", start: [2027, 6, 4], end: [2027, 9, 2], w: [35, 47], target: 12, lo: 21 * 60 + 30, wake: 4 * 60 + 30, kg: 72, lift: 35,
    bodyPhase: "Lean bulk; 4-week mini-cut only if body fat goes above ~21%", bodyCal: "+200–250 kcal", bodyTarget: "~72 kg",
    body: "~72 kg; progress slows (normal), switch to an intermediate program", wakeTxt: "4:30 am; lights out 9:30", career: "Offer or promotion to Sr Manager Product", reward: "Recliner sofa-set" },
  { name: "Q4 2027", start: [2027, 9, 3], end: [2028, 0, 1], w: [48, 60], target: 13, lo: 21 * 60 + 15, wake: 4 * 60 + 15, kg: 73, lift: 40,
    bodyPhase: "Maintenance in October (Diwali), then resume the bulk; DEXA checkpoint", bodyCal: "Maintenance, then +200 kcal", bodyTarget: "~73 kg, ~20% body fat",
    body: "~73 kg; clearly athletic look; first-year gains locked in", wakeTxt: "4:15 am; lights out 9:15", career: "Study, Apply, Repeat", reward: "5-day domestic family holiday" },
  { name: "Q1 2028", start: [2028, 0, 2], end: [2028, 3, 1], w: [61, 73], target: 13, lo: 21 * 60, wake: 4 * 60, kg: 74, lift: 45,
    bodyPhase: "Lean bulk; 12–18 sets per muscle per week", bodyCal: "+150–200 kcal", bodyTarget: "~74 kg",
    body: "~74 kg; waist within +3 cm of baseline", wakeTxt: "4:00 am on weekdays; lights out 9:00", career: "Study, Apply, Repeat", reward: "Weekend staycation for you and your partner" },
  { name: "Q2 2028", start: [2028, 3, 2], end: [2028, 6, 1], w: [74, 86], target: 13, lo: 21 * 60, wake: 4 * 60, kg: 75.5, lift: 50,
    bodyPhase: "Lean bulk", bodyCal: "+200 kcal", bodyTarget: "~75.5 kg",
    body: "~75.5 kg; muscular build obvious in side-by-side photos with baseline", wakeTxt: "4:00 am feels normal; 7 hours of sleep protected", career: "Offer or promotion to Director Product", reward: "A new car" },
  { name: "Q3 2028 (Finish)", start: [2028, 6, 2], end: [2028, 9, 7], w: [87, 100], target: 14, lo: 21 * 60, wake: 4 * 60, kg: 75, lift: 55,
    bodyPhase: "Peak at ~76.5 kg (~20%) by August; cut from September; final DEXA in October", bodyCal: "+150 kcal, then −400 kcal", bodyTarget: "~75 kg at ~18% body fat",
    body: "~75 kg at ~18% body fat and muscular; training and eating run on autopilot", wakeTxt: "4 am routine automatic, even after travel or late days", career: "Study, Apply, Repeat", reward: "Grand celebration on 14 Oct 2028 (my birthday): foreign trip with family + a printed photo book of the 2-year journey" }
].map((p) => ({ ...p, start: new Date(...p.start), end: new Date(...p.end), weeks: p.w[1] - p.w[0] + 1 }));
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
const TOTAL_Q = 8; // calendar quarters in the plan: Q4 2026 … Q3 2028 (the plan's last week, 1–7 Oct 2028, counts as Q3 2028)

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
// Phases and times of day
const phaseIdx = (d) => { const x = d0(d); for (let i = PHASES.length - 1; i > 0; i--) if (x >= PHASES[i].start) return i; return 0; };
const phaseOf = (d) => PHASES[phaseIdx(d)];
const hm = (m) => { const h = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, "0"); return ((h + 11) % 12 + 1) + ":" + mm; };
const pmTxt = (m) => hm(m) + " pm", amTxt = (m) => hm(m) + " am";
const toHHMM = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const habitName = (hb, d) => (hb.k === "l" ? "Lights out by " + hm(phaseOf(d).lo) : hb.name);
const habitHint = (hb, d) => (hb.k === "l" ? "In bed, lights off by " + pmTxt(phaseOf(d).lo) : hb.hint);
const floorBed = (d) => pmTxt(phaseOf(d).lo + 60);
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
let state = { days: {}, weights: {}, lifts: {}, wakes: {} };
let liftsLoaded = false, wakesLoaded = false, liftQ = null, wMsg = "", lMsg = "", wkMsg = "";
let delPending = null, wakeW = null;
const expOpen = {}; // which milestone cards have "Expected outcomes" open
let sync = null, user = null, authReady = false, configMissing = false, loadError = "";
let tab = ["today", "weeks", "goals", "logs"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "today";
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
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then((ok) => { lockSupported = !!ok; if (tab === "logs") render(); }).catch(() => {});
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
  let h = `<h2>App lock</h2><div class="card">`;
  if (on) h += `<div class="row between"><span>🔒 ${BIO} lock is <b>on</b></span><button class="btn ghost" data-act="lockoff">Turn off</button></div>`;
  else if (lockSupported) h += `<div class="row between"><span>🔓 ${BIO} lock is off</span><button class="btn" data-act="lockon">Turn on</button></div>`;
  else h += `<div class="muted">${BIO} lock isn't available in this browser.</div>`;
  return h + (lockMsg ? `<div class="muted" style="margin-top:8px">${esc(lockMsg)}</div>` : "") + `</div>`;
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
// Per-phase progress: only the weeks inside the phase count.
function phaseStats(p) {
  // A week counts as a win as soon as it reaches 15/21, even before it ends.
  let winsNow = 0, misses = 0, finished = 0;
  for (let n = p.w[0]; n <= p.w[1]; n++) {
    const wi = weekInfo(n);
    if (wi.win) winsNow++;
    if (wi.done) { finished++; if (!wi.win) misses++; }
  }
  const allowed = p.weeks - p.target, left = allowed - misses, t = today();
  const status = winsNow >= p.target ? "earned" : misses > allowed ? "missed" : t < p.start ? "upcoming" : "active";
  return { wins: winsNow, misses, finished, allowed, left: Math.max(0, left), toGo: p.weeks - finished, status };
}
// Weekly wake-up log: users/{uid}/wakes/w{week} -> { min } (minutes after midnight)
const wakeOf = (n) => (state.wakes["w" + n] != null ? state.wakes["w" + n] : null);
function phaseWakeAvg(p) {
  const v = []; for (let n = p.w[0]; n <= p.w[1]; n++) { const m = wakeOf(n); if (m != null) v.push(m); }
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
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
  if (t < START) h += `<div class="banner info">Your plan starts Wed 11 Nov 2026. Ticking opens on day one. You can already log your weight on the Logs tab.</div>`;

  h += `<div class="datebar"><button class="navbtn" data-act="prev" ${sel <= START ? "disabled" : ""} aria-label="Previous day">‹</button>
    <div class="datelabel"><b>${DOW[sel.getDay()]}, ${fmt(sel, true)}</b><span>Day ${Math.round((sel - START) / 864e5) + 1} of ${Math.round((END - START) / 864e5) + 1}</span>
    ${!same(sel, clampPlan(t)) ? `<div><button class="todaylink" data-act="today">Back to today</button></div>` : ""}</div>
    <button class="navbtn" data-act="next" ${sel >= END || sel >= t ? "disabled" : ""} aria-label="Next day">›</button></div>`;

  const y = addDays(sel, -1);
  if (editable && inPlan(y) && !dayCounts(key(y)) && !dayCounts(k)) {
    h += `<div class="banner warn"><b>Never miss twice.</b> ${same(sel, t) ? "Yesterday" : "The day before"} didn't count. Today, at least hit your floor day: bed by ${floorBed(sel)}, 15 min study, 15 min movement.
      ${!dayRec(key(y)).r ? `<div><button class="todaylink" style="color:inherit;text-decoration:underline" data-act="prev">Note what got in the way →</button></div>` : ""}</div>`;
  } else if (editable && dayScore(k) === 3) {
    h += `<div class="banner good">All three done. That's a full day. ✓</div>`;
  }

  const pi = phaseIdx(sel), ph = PHASES[pi];
  if (editable && pi > 0 && sel - ph.start < 7 * 864e5 && ph.lo !== PHASES[pi - 1].lo) {
    h += `<div class="banner info">🌙 <b>New phase: ${esc(ph.name)}.</b> Lights out is now by ${pmTxt(ph.lo)} (was ${pmTxt(PHASES[pi - 1].lo)}). Floor day: bed by ${floorBed(sel)}.</div>`;
  }

  HABITS.forEach((hb) => {
    h += `<button class="habit${r[hb.k] ? " on" : ""}" data-habit="${hb.k}" ${editable ? "" : "disabled"}>
      <div class="ic">${hb.icon}</div><div class="t"><b>${habitName(hb, sel)}</b><span>${habitHint(hb, sel)}</span></div><div class="check">✓</div></button>`;
  });
  h += `<button class="habit floor${r.f ? " on" : ""}" data-habit="f" ${editable ? "" : "disabled"}>
    <div class="ic">🛟</div><div class="t"><b>Floor day</b><span>Rough day? Bed by ${floorBed(sel)} · 15 min study · 15 min movement. Keeps the chain alive.</span></div><div class="check">✓</div></button>`;

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

  const curW = weekOf(clampPlan(t));
  if (wakesLoaded && same(sel, t) && t >= START && t.getDay() === 6 && wakeOf(curW) == null) {
    h += `<div class="banner info">⏰ Last day of the week: log your usual wake-up time. <button class="todaylink" style="color:inherit;text-decoration:underline" data-act="gowake">Log it →</button></div>`;
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
    const ph = PHASES.find((p) => p.w[0] === n);
    if (ph) {
      const st = phaseStats(ph);
      const tag = st.status === "earned" ? `<span class="star">🎉 earned</span>` : st.status === "missed" ? `<span class="muted">missed</span>` : `★ ${st.wins}/${ph.target}`;
      h += `<div class="phhead"><b>${esc(ph.name)}</b><span>target ${ph.target}/${ph.weeks} · ${tag}</span></div>`;
    }
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
  const W = 320, H = 90, P = 8, kgs = ws.map((w) => w.kg).concat([GOAL_KG]);
  const mn = Math.min(...kgs) - 1, mx = Math.max(...kgs) + 1;
  const t0 = parseKey(ws[0].d).getTime(), t1 = Math.max(parseKey(ws[ws.length - 1].d).getTime(), t0 + 864e5);
  const X = (d) => P + (parseKey(d).getTime() - t0) / (t1 - t0) * (W - 2 * P);
  const Y = (k) => H - P - (k - mn) / (mx - mn) * (H - 2 * P);
  const pts = ws.map((w) => X(w.d).toFixed(1) + "," + Y(w.kg).toFixed(1)).join(" ");
  const y74 = Y(GOAL_KG).toFixed(1);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <line x1="0" x2="${W}" y1="${y74}" y2="${y74}" stroke="var(--gold)" stroke-dasharray="4 4" stroke-width="1"/>
    <text x="${W - 4}" y="${+y74 - 4}" text-anchor="end" font-size="10" fill="var(--gold)">${GOAL_KG} kg goal</text>
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

// Weekly wake-up times vs the expected time for each phase (earlier = higher).
function wakeHistoryHtml() {
  const W = 320, H = 130, L = 34, R = 8, T = 10, B = 20;
  const logged = Object.keys(state.wakes).map((k) => ({ n: +k.slice(1), m: state.wakes[k] })).filter((x) => x.n >= 1 && x.n <= TOTAL_WEEKS).sort((a, b) => a.n - b.n);
  const t = today(), curW = t < START ? 1 : weekOf(clampPlan(t));
  wakeW = curW;
  const wFrom = weekSun(curW) < START ? START : weekSun(curW), wTo = addDays(weekSun(curW), 6) > END ? END : addDays(weekSun(curW), 6);
  const p = phaseOf(wFrom), m = wakeOf(curW), shown = m != null ? m : p.wake;
  // 15-minute choices from 3:00 to 8:00 am (plus the logged time if it isn't on a quarter hour)
  const opts = []; for (let x = 180; x <= 480; x += 15) opts.push(x);
  if (!opts.includes(shown)) { opts.push(shown); opts.sort((a, b) => a - b); }
  let h = `<h2 id="wakelog">Wake-up time · weekly</h2><div class="card">
    <div class="muted">Once a week, log the time you usually woke up. It's an outcome of your lights-out time, not a target.</div>
    <form id="wkform" class="stack" style="margin-top:10px">
      <div><b>Week ${curW}</b> <span class="muted">· ${fmt(wFrom)} – ${fmt(wTo, true)}</span>${m != null ? ` <span class="ok">✓ logged</span>` : ""}</div>
      <div class="row" style="gap:8px"><select id="wake" aria-label="Usual wake-up time" style="flex:1">${opts.map((x) => `<option value="${x}" ${x === shown ? "selected" : ""}>${amTxt(x)}${x === p.wake ? " (expected)" : ""}</option>`).join("")}</select>
        <button class="btn" type="submit">${m != null ? "Update" : "Save"}</button></div>
      ${wkMsg ? `<div class="err">${esc(wkMsg)}</div>` : ""}</form>`;
  if (!logged.length) return h + `</div>`;
  const all = logged.map((x) => x.m).concat(PHASES.map((p) => p.wake));
  const mn = Math.min(...all) - 15, mx = Math.max(...all) + 15;
  const X = (n) => L + (n - 1) / (TOTAL_WEEKS - 1) * (W - L - R);
  const Y = (m) => T + (m - mn) / (mx - mn) * (H - T - B); // earlier times sit higher
  let s = `<svg class="lchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly wake-up time">`;
  const ticks = []; for (let m = Math.ceil(mn / 30) * 30; m <= mx; m += 30) ticks.push(m);
  ticks.filter((_, i) => ticks.length <= 4 || i % Math.ceil(ticks.length / 4) === 0).forEach((m) => {
    s += `<line x1="${L}" x2="${W - R}" y1="${Y(m).toFixed(1)}" y2="${Y(m).toFixed(1)}" stroke="var(--line)"/>
      <text x="${L - 4}" y="${(Y(m) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--muted)">${hm(m)}</text>`;
  });
  let path = "";
  PHASES.forEach((p, i) => { path += `${i ? "L" : "M"}${X(p.w[0]).toFixed(1)},${Y(p.wake).toFixed(1)} L${X(p.w[1] + (i === PHASES.length - 1 ? 0 : 1)).toFixed(1)},${Y(p.wake).toFixed(1)} `; });
  s += `<path d="${path}" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  if (logged.length > 1) s += `<polyline points="${logged.map((x) => X(x.n).toFixed(1) + "," + Y(x.m).toFixed(1)).join(" ")}" fill="none" stroke="var(--floor)" stroke-width="2" stroke-linejoin="round"/>`;
  logged.forEach((x) => { s += `<circle cx="${X(x.n).toFixed(1)}" cy="${Y(x.m).toFixed(1)}" r="3" fill="var(--floor)"/>`; });
  [1, 25, 50, 75, 100].forEach((n) => { s += `<text x="${X(n).toFixed(1)}" y="${H - 6}" text-anchor="${n === 1 ? "start" : n === 100 ? "end" : "middle"}" font-size="9" fill="var(--muted)">wk ${n}</text>`; });
  s += `</svg><div class="legend"><span><i style="background:var(--floor)"></i>Your wake-up</span><span><i style="background:var(--gold)"></i>Expected</span></div>`;
  const last = logged[logged.length - 1];
  return h + s + `<p class="muted" style="margin:8px 0 0">Latest: week ${last.n}, ${amTxt(last.m)}. Earlier is higher on the chart.</p></div>`;
}

// Body outcome: listed like the other outcomes, with Phase, Calories, Target and Lifts stacked below it.
function bodyOutcome(p, lw, avg) {
  const row = (label, val) => `<div class="brow"><span>${label}</span><div>${val}</div></div>`;
  const lifts = p.lift != null ? `+${p.lift}% vs baseline${avg != null ? ` · now ${pctTxt(avg)}` : ""}` : `Baseline${avg != null ? ` · now ${pctTxt(avg)}` : ""}`;
  return `<li><b>Body:</b> ${esc(p.body)}<div class="bstack">
      ${row("Phase", esc(p.bodyPhase))}
      ${row("Calories", esc(p.bodyCal))}
      ${row("Target", esc(p.bodyTarget) + (lw ? ` <span class="muted">· latest ${lw.kg} kg</span>` : ""))}
      ${row("Lifts", lifts)}
    </div></li>`;
}

function viewGoals() {
  const t = today(), lw = latestWeight(), curI = t < START ? 0 : phaseIdx(clampPlan(t));
  const daysTo = (d) => Math.round((d - t) / 864e5);
  let h = `<h1>Milestones</h1><p class="sub">11 Nov 2026 – 7 Oct 2028 · 100 weeks · 🎂 celebration 14 Oct 2028</p>
    <p class="muted" style="margin:4px 0 0">Each phase has one target: ★ weeks within that phase. Hit it and the reward is yours. Miss it and the reward is gone. The rest are expected outcomes to watch, not targets.</p>
    <div class="card" style="padding:4px 16px">`;
  PHASES.forEach((p, i) => {
    const st = phaseStats(p), past = t > p.end;
    let cls = "ms" + (st.status === "earned" ? " done" : st.status === "missed" ? " miss" : "") + (i === curI && !past ? " next" : "");
    const dd = daysTo(p.end);
    let prog;
    if (st.status === "earned") prog = `<span class="ok">🎉 Target hit (${st.wins}/${p.target} ★). Reward earned.</span>`;
    else if (st.status === "missed") prog = `<span class="warnt">Missed (${st.wins}/${p.target} ★). Reward gone.</span>`;
    else if (st.status === "upcoming") prog = `Starts ${fmt(p.start, true)}`;
    else prog = `★ ${st.wins} of ${p.target} · ${st.left} ${st.left === 1 ? "miss" : "misses"} left · ${st.toGo} ${st.toGo === 1 ? "week" : "weeks"} to go`;
    // expected outcomes, each with your actual figure where there is data
    const avg = liftAvgChange(), wa = phaseWakeAvg(p);
    const ex = [
      bodyOutcome(p, lw, avg),
      `<li><b>Wake-up:</b> ${esc(p.wakeTxt)}${wa != null ? `<div class="muted">Your average ${amTxt(wa)}</div>` : ""}</li>`,
      `<li><b>Career:</b> ${esc(p.career)}</li>`
    ];
    const open = expOpen[i] != null ? expOpen[i] : i === curI;
    h += `<div class="${cls}"><div class="dot"></div><div style="flex:1;min-width:0">
      <div class="row between"><b>${esc(p.name)}</b><span class="d">${fmt(p.start)} – ${fmt(p.end, true)}${dd > 0 && t >= p.start ? " · " + dd + "&nbsp;d&nbsp;left" : ""}</span></div>
      <div class="tg"><b>Target:</b> ${p.target} wins out of ${p.weeks} weeks${p.weeks > p.target ? ` (${p.weeks - p.target} ${p.weeks - p.target === 1 ? "miss" : "misses"} allowed)` : " (no misses)"}</div>
      <div class="pr">${prog}</div>
      <div class="cel${st.status === "missed" ? " gone" : ""}">🎁 ${esc(p.reward)}</div>
      <button class="expbtn" data-exp="${i}">Expected outcomes ${open ? "▴" : "▾"}</button>
      ${open ? `<ul class="exp">${ex.join("")}</ul>` : ""}</div></div>`;
  });
  const fin = phaseStats(PHASES[PHASES.length - 1]), cd = daysTo(CELEBRATION);
  h += `<div class="ms cel-day${fin.status === "earned" ? " done" : ""}"><div class="dot"></div><div style="flex:1">
    <div class="row between"><b>🎂 Grand celebration</b><span class="d">Sat 14 Oct 2028${cd > 0 ? " · in " + cd + "&nbsp;d" : ""}</span></div>
    <div class="tg">My birthday. ${fin.status === "earned" ? "Finish target hit: the foreign trip is on! ✈️" : fin.status === "missed" ? "Finish target missed this time." : "Earned by hitting the Finish phase target (14 of 14)."}</div></div></div>`;
  h += `</div>
    <h2>The rules</h2><div class="card"><ul class="rules">
      <li><b>Each day:</b> lights out by ${pmTxt(phaseOf(clampPlan(t)).lo)} (moves earlier each phase) · studied 3 hrs+ · gym/workout</li>
      <li><b>Never miss twice</b> consecutively</li>
      <li><b>Floor day:</b> bed by ${floorBed(clampPlan(t))} (1 hour after lights out), 15 min study, 15 min movement</li>
      <li><b>Each phase:</b> hit its ★ target to earn its reward. A missed phase's reward is gone: no comeback, no rollover.</li></ul></div>`;
  return h;
}

// Logs tab: weight (any day), wake-up (weekly), lifts (quarterly), app lock, account.
function viewLogs() {
  const t = today();
  let h = `<h1>Logs</h1><p class="sub">Weight any day · wake-up weekly · lifts quarterly</p>
    <h2>Weight</h2><div class="card">
    <form id="wform" class="wform"><input id="kg" type="number" inputmode="decimal" step="0.1" min="30" max="200" placeholder="Weight (kg)">
      <input id="kgdate" type="date" value="${key(t)}" max="${key(t)}" aria-label="Date of weigh-in"><button class="btn" type="submit">Log</button></form>
    ${wMsg ? `<div class="muted" style="margin-top:6px">${esc(wMsg)}</div>` : ""}`;
  const ws = weightList();
  if (ws.length) {
    h += spark(ws) + `<div style="margin-top:8px">`;
    ws.slice(-5).reverse().forEach((w) => {
      h += `<div class="row between" style="padding:6px 0;border-top:1px solid var(--line);font-size:14px"><span>${fmt(parseKey(w.d), true)}</span>
        <span><b>${w.kg} kg</b> <button data-delw="${w.d}" class="${delPending === w.d ? "warnt" : "muted"}" style="margin-left:10px" aria-label="Delete">${delPending === w.d ? "Delete?" : "✕"}</button></span></div>`;
    });
    h += `</div>`;
  } else h += `<p class="muted" style="margin:10px 0 0">Expected: ~69 kg by Apr ’27, ~72 kg by Oct ’27, ~74 kg by Apr ’28, ~75 kg at ~18% body fat by Oct ’28.</p>`;
  h += `</div>` + wakeHistoryHtml() + liftsCardHtml() + lockCardHtml() + `
    <h2>Account</h2><div class="card stack">
      <div class="muted">${esc(user && user.email || "")}</div>
      <div class="row"><button class="btn ghost" data-act="export" style="flex:1">Export</button>
        <label class="btn ghost" style="flex:1;cursor:pointer;text-align:center">Import<input id="importFile" type="file" accept="application/json,.json" hidden></label>
        <button class="btn ghost" data-act="signout" style="flex:1">Sign out</button></div>
      ${acctText ? `<div class="muted">${esc(acctText)}</div>` : ""}</div>`;
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
    h = tab === "today" ? viewToday() : tab === "weeks" ? viewWeeks() : tab === "logs" ? viewLogs() : viewGoals();
    h += `<nav class="tabs"><div class="in">${[["today", "✅", "Today"], ["weeks", "🗓️", "Weeks"], ["goals", "🏁", "Milestones"], ["logs", "📝", "Logs"]]
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
  if (name !== tab) { wMsg = ""; lMsg = ""; wkMsg = ""; acctText = ""; delPending = null; wakeW = null; }
  tab = name;
  try { history.replaceState(null, "", "#" + tab); } catch (_) {}
  render(); window.scrollTo(0, 0);
  if (tab === "weeks") { const el = document.getElementById("w" + weekOf(clampPlan(today()))); if (el) el.scrollIntoView({ block: "center" }); }
}
window.addEventListener("pageshow", () => { if (user && locked && lockCred() && !lockAbort) autoUnlock(); });
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (["today", "weeks", "goals", "logs"].includes(h) && h !== tab) goTab(h); });

/* ---------- actions ---------- */
let acctText = "";
function acctMsg(m) { acctText = m; render(); }
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
  if (act === "gowake") { goTab("logs"); const el = document.getElementById("wakelog"); if (el) el.scrollIntoView({ block: "start" }); return; }
  if (b.dataset.exp != null) {
    const i = +b.dataset.exp, curI = today() < START ? 0 : phaseIdx(clampPlan(today()));
    const open = expOpen[i] != null ? expOpen[i] : i === curI;
    expOpen[i] = !open; return render();
  }
  if (act === "golifts") {
    liftQ = quarterOf(clampPlan(today())); goTab("logs");
    const el = document.getElementById("lifts"); if (el) el.scrollIntoView({ block: "start" });
    return;
  }
  if (act === "signout") {
    // Signing out removes the lock on this device; getting back in needs the account password.
    try { localStorage.removeItem(LOCK_KEY); } catch (_) {}
    locked = false; lockMsg = "";
    await sync.logOut(); state = { days: {}, weights: {}, lifts: {}, wakes: {} }; liftsLoaded = false; wakesLoaded = false; return;
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
    const data = JSON.stringify({ app: "goal-tracker", exported: new Date().toISOString(), days: state.days, weights: state.weights, lifts: state.lifts, wakes: state.wakes }, null, 2);
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
    if (delPending !== b.dataset.delw) { delPending = b.dataset.delw; return render(); } // first tap asks, second tap deletes
    delPending = null;
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
  if (e.target.id === "wkform") {
    const min = +document.getElementById("wake").value;
    if (!(min >= 180 && min <= 600)) { wkMsg = "Pick a time between 3:00 and 8:00 am."; return render(); }
    const n = wakeW || weekOf(clampPlan(today()));
    state.wakes["w" + n] = min; wkMsg = "";
    clean("wake"); render();
    sync.setWake("w" + n, min).catch((err) => showStatus("error", err.code));
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
    const wakes = {};
    Object.keys(data.wakes || {}).forEach((w) => { const v = data.wakes[w]; if (/^w\d{1,3}$/.test(w) && typeof v === "number" && v > 120 && v < 720) wakes[w] = v; });
    const n = await sync.importAll(days, weights, lifts, wakes);
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
        (lifts) => { state.lifts = lifts; liftsLoaded = true; render(); },
        (wakes) => { state.wakes = wakes; wakesLoaded = true; render(); });
    } else { sync.unsubscribe(); state = { days: {}, weights: {}, lifts: {}, wakes: {} }; liftsLoaded = false; wakesLoaded = false; }
    render();
    if (u && locked && lockCred()) autoUnlock(); // show the Face ID / Touch ID prompt straight away
  });
}
boot();
