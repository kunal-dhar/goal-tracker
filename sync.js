// Firestore + Auth glue. All data lives under users/{uid}/... and is
// protected by firestore.rules so only the signed-in owner can read or write it.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let auth, db, uid = null, unsubs = [];

export function init(config) {
  const app = initializeApp(config);
  auth = getAuth(app);
  try {
    // Keeps a copy on the device so the app works offline and syncs later.
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
  }
}

export const onAuth = (cb) => onAuthStateChanged(auth, cb);
export const signIn = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const logOut = () => { unsubscribe(); return signOut(auth); };
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

export function unsubscribe() { unsubs.forEach((u) => u()); unsubs = []; uid = null; }

export function subscribe(userId, onDays, onWeights, onStatus, onLifts) {
  unsubscribe();
  uid = userId;
  const meta = { days: null, weights: null, lifts: null };
  const report = () => {
    const m = [meta.days, meta.weights, meta.lifts].filter(Boolean);
    if (!m.length) return;
    const pending = m.some((x) => x.hasPendingWrites);
    const cache = m.some((x) => x.fromCache);
    if (!navigator.onLine) onStatus("offline");
    else if (pending) onStatus("syncing");
    else if (cache) onStatus("connecting");
    else onStatus("synced");
  };
  const onErr = (err) => onStatus("error", err && err.code);

  unsubs.push(onSnapshot(collection(db, "users", uid, "days"), { includeMetadataChanges: true }, (snap) => {
    const out = {};
    snap.forEach((d) => {
      const x = d.data(), r = {};
      ["l", "s", "g", "f"].forEach((k) => { if (x[k]) r[k] = 1; });
      // r = reason that got in the way, n = optional note
      if (typeof x.r === "string" && x.r) r.r = x.r;
      if (typeof x.n === "string" && x.n) r.n = x.n;
      if (Object.keys(r).length) out[d.id] = r;
    });
    meta.days = snap.metadata; onDays(out); report();
  }, onErr));

  unsubs.push(onSnapshot(collection(db, "users", uid, "weights"), { includeMetadataChanges: true }, (snap) => {
    const out = {};
    snap.forEach((d) => { const x = d.data(); if (typeof x.kg === "number") out[d.id] = x.kg; });
    meta.weights = snap.metadata; onWeights(out); report();
  }, onErr));

  // One document per plan quarter: users/{uid}/lifts/q1 -> { squat, bench, deadlift } (kg)
  unsubs.push(onSnapshot(collection(db, "users", uid, "lifts"), { includeMetadataChanges: true }, (snap) => {
    const out = {};
    snap.forEach((d) => {
      const x = d.data(), r = {};
      ["squat", "bench", "deadlift"].forEach((k) => { if (typeof x[k] === "number") r[k] = x[k]; });
      if (Object.keys(r).length) out[d.id] = r;
    });
    meta.lifts = snap.metadata; if (onLifts) onLifts(out); report();
  }, onErr));
}

export function setLift(q, rec) {
  const ref = doc(db, "users", uid, "lifts", q);
  return rec ? setDoc(ref, { ...rec, updatedAt: serverTimestamp() }) : deleteDoc(ref);
}

// Writes resolve when the server confirms; the UI updates instantly from the local cache.
export function setDay(key, rec) {
  const ref = doc(db, "users", uid, "days", key);
  return rec ? setDoc(ref, { ...rec, updatedAt: serverTimestamp() }) : deleteDoc(ref);
}

export function setWeight(key, kg) {
  const ref = doc(db, "users", uid, "weights", key);
  return kg == null ? deleteDoc(ref) : setDoc(ref, { kg, updatedAt: serverTimestamp() });
}

export async function importAll(days, weights, lifts) {
  const ops = [];
  Object.keys(days || {}).forEach((k) => ops.push(["days", k, { ...days[k] }]));
  Object.keys(weights || {}).forEach((k) => ops.push(["weights", k, { kg: weights[k] }]));
  Object.keys(lifts || {}).forEach((k) => ops.push(["lifts", k, { ...lifts[k] }]));
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach(([col, k, data]) =>
      batch.set(doc(db, "users", uid, col, k), { ...data, updatedAt: serverTimestamp() }));
    await batch.commit();
  }
  return ops.length;
}
