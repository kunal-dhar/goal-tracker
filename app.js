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
  { name: "Month 6", date: new Date(2027, 4, 15), target: "About 70 kg; gym weights clearly up; career moves underway", cel: "Recliner sofa-set", kg: 70 },
  { name: "Year 1", date: new Date(2027, 10, 13), target: "Senior Manager/Director role; about 72 kg", cel: "Foreign trip with family", kg: 72 },
  { name: "Finish", date: new Date(2028, 9, 14), target: "74 kg, and the routine runs without thinking", cel: "A new bike", kg: 74 }
];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

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

/* ---------- state ---------- */
let state = { days: {}, weights: {} };
let sync = null, user = null, authReady = false, configMissing = false, loadError = "";
let tab = ["today", "weeks", "goals"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "today";
let sel = clampPlan(today());
let loginMsg = "", busy = false;

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
    h += `<div class="banner warn"><b>Never miss twice.</b> ${same(sel, t) ? "Yesterday" : "The day before"} didn't count. Today, at least hit your floor day: bed by 11, 15 min study, 15 min movement.</div>`;
  } else if (editable && dayScore(k) === 3) {
    h += `<div class="banner good">All three done. That's a full day. ✓</div>`;
  }

  HABITS.forEach((hb) => {
    h += `<button class="habit${r[hb.k] ? " on" : ""}" data-habit="${hb.k}" ${editable ? "" : "disabled"}>
      <div class="ic">${hb.icon}</div><div class="t"><b>${hb.name}</b><span>${hb.hint}</span></div><div class="check">✓</div></button>`;
  });
  h += `<button class="habit floor${r.f ? " on" : ""}" data-habit="f" ${editable ? "" : "disabled"}>
    <div class="ic">🛟</div><div class="t"><b>Floor day</b><span>Rough day? Bed by 11 · 15 min study · 15 min movement. Keeps the chain alive.</span></div><div class="check">✓</div></button>`;

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

function viewWeeks() {
  const t = today(), cur = weekOf(clampPlan(t)), aw = allWins();
  let h = `<h1>All weeks</h1><p class="sub">${aw.w} ★ out of ${aw.c} finished weeks · 15+/21 = success week</p>
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
    const days = Math.round((m.date - t) / 864e5);
    h += `<div class="${cls}"><div class="dot"></div><div style="flex:1"><div class="row between"><b>${m.name}</b><span class="d">${fmt(m.date, true)}${days > 0 ? " · in " + days + " d" : ""}</span></div>
      <div class="tg">${esc(m.target)}</div><div class="cel">🎉 ${esc(m.cel)}</div><div class="pr">${pr}</div></div></div>`;
  });
  h += `</div><h2>Weight</h2><div class="card">
    <form id="wform" class="row"><input id="kg" type="number" inputmode="decimal" step="0.1" min="30" max="200" placeholder="Today’s weight (kg)"><button class="btn" type="submit">Log</button></form>`;
  const ws = weightList();
  if (ws.length) {
    h += spark(ws) + `<div style="margin-top:8px">`;
    ws.slice(-5).reverse().forEach((w) => {
      h += `<div class="row between" style="padding:6px 0;border-top:1px solid var(--line);font-size:14px"><span>${fmt(parseKey(w.d), true)}</span>
        <span><b>${w.kg} kg</b> <button data-delw="${w.d}" class="muted" style="margin-left:10px" aria-label="Delete">✕</button></span></div>`;
    });
    h += `</div>`;
  } else h += `<p class="muted" style="margin:10px 0 0">Targets: ~70 kg by May ’27, ~72 kg by Nov ’27, 74 kg at the finish.</p>`;
  h += `</div>
    <h2>The rules</h2><div class="card"><ul class="rules">
      <li><b>Each day:</b> lights out by 10 · studied 3 hrs+ · gym/workout</li>
      <li><b>15+ / 21</b> ticks in a week = success week ★</li>
      <li><b>Never miss twice</b> consecutively</li>
      <li><b>Floor day:</b> bed by 11, 15 min study, 15 min movement</li></ul></div>
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
  const kgEl = document.getElementById("kg"), kgVal = kgEl ? kgEl.value : "";
  const emailEl = document.getElementById("email"), emailVal = emailEl ? emailEl.value : "";
  let h;
  if (configMissing) h = viewSetup();
  else if (loadError) h = `<div class="center"><h1>Can't load</h1><div class="card">${esc(loadError)}<p class="muted">Check your internet connection and reload. After the first successful load the app also works offline.</p></div></div>`;
  else if (!authReady) h = `<div class="center"><p class="muted">Loading…</p></div>`;
  else if (!user) h = viewLogin();
  else {
    h = tab === "today" ? viewToday() : tab === "weeks" ? viewWeeks() : viewGoals();
    h += `<nav class="tabs"><div class="in">${[["today", "✅", "Today"], ["weeks", "🗓️", "Weeks"], ["goals", "🏁", "Milestones"]]
      .map((x) => `<button class="tab${tab === x[0] ? " on" : ""}" data-tab="${x[0]}"><span class="ti">${x[1]}</span>${x[2]}</button>`).join("")}</div></nav>`;
  }
  root.innerHTML = h;
  const k2 = document.getElementById("kg"); if (k2 && kgVal) k2.value = kgVal;
  const e2 = document.getElementById("email"); if (e2 && emailVal) e2.value = emailVal;
}

function goTab(name) {
  tab = name;
  try { history.replaceState(null, "", "#" + tab); } catch (_) {}
  render(); window.scrollTo(0, 0);
  if (tab === "weeks") { const el = document.getElementById("w" + weekOf(clampPlan(today()))); if (el) el.scrollIntoView({ block: "center" }); }
}
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
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.tab) return goTab(b.dataset.tab);
  const act = b.dataset.act;
  if (act === "prev") { sel = clampPlan(addDays(sel, -1)); return render(); }
  if (act === "next") { sel = clampPlan(addDays(sel, 1)); return render(); }
  if (act === "today") { sel = clampPlan(today()); return render(); }
  if (act === "signout") { await sync.logOut(); state = { days: {}, weights: {} }; return; }
  if (act === "reset") {
    const em = (document.getElementById("email").value || "").trim();
    const el = document.getElementById("loginMsg");
    if (!em) { el.textContent = "Type your email above first."; return; }
    try { await sync.resetPassword(em); el.textContent = "If that account exists, a reset email is on its way."; }
    catch (err) { el.textContent = authError(err); }
    return;
  }
  if (act === "export") {
    const data = JSON.stringify({ app: "goal-tracker", exported: new Date().toISOString(), days: state.days, weights: state.weights }, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.download = "goal-tracker-backup-" + key(today()) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return acctMsg("Backup saved to your downloads.");
  }
  if (b.dataset.go) {
    const d = parseKey(b.dataset.go); if (d > today()) return;
    sel = clampPlan(d); return goTab("today");
  }
  if (b.dataset.habit) {
    if (sel > today() || today() < START) return;
    const k = key(sel), r = { ...dayRec(k) };
    r[b.dataset.habit] = r[b.dataset.habit] ? 0 : 1;
    Object.keys(r).forEach((x) => { if (!r[x]) delete r[x]; });
    const rec = Object.keys(r).length ? r : null;
    if (rec) state.days[k] = rec; else delete state.days[k];
    render();
    sync.setDay(k, rec).catch((err) => showStatus("error", err.code));
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
    if (!(v >= 30 && v <= 200)) return;
    const k = key(today()), kg = Math.round(v * 10) / 10;
    state.weights[k] = kg; document.getElementById("kg").value = ""; render();
    sync.setWeight(k, kg).catch((err) => showStatus("error", err.code));
  }
});

document.addEventListener("change", async (e) => {
  if (e.target.id !== "importFile") return;
  const f = e.target.files && e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    let weights = data.weights || {};
    if (Array.isArray(weights)) { const m = {}; weights.forEach((w) => { m[w.d] = w.kg; }); weights = m; }
    const days = {};
    Object.keys(data.days || {}).forEach((k) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
      const r = {}; ["l", "s", "g", "f"].forEach((x) => { if (data.days[k][x]) r[x] = 1; });
      if (Object.keys(r).length) days[k] = r;
    });
    const n = await sync.importAll(days, weights);
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
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkDay(); });
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
        showStatus);
    } else { sync.unsubscribe(); state = { days: {}, weights: {} }; }
    render();
  });
}
boot();
