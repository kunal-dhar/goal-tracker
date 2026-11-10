# My Goal Tracker — setup guide

An installable app for your iPhone and MacBook. Your ticks sync between the two
through your own free Firebase database, and the app keeps working offline.

Setup takes about 15–20 minutes and you only do it once. You need:
- your Google account (for Firebase)
- your GitHub account (to host the app for free)
- the files from `goal-tracker-app.zip`, unzipped on your Mac

---

## Part A — Firebase (your database)

### 1. Create the project
1. Go to **https://console.firebase.google.com** and sign in with Google.
2. Click **Create a project** (or **Create a new Firebase project**).
3. Name it `goal-tracker` and continue.
4. If it offers Gemini or Google Analytics, you can switch them **off**. They aren't needed.
5. Click **Create project**, then **Continue**.

You are now on the free **Spark** plan. It never asks for a card unless you choose to upgrade, so you can't be charged.

### 2. Turn on sign-in (email + password)
1. In the left menu, open **Build → Authentication → Get started**.
2. On the **Sign-in method** tab choose **Email/Password**.
3. Switch on the first toggle (**Email/Password**). Leave "Email link" off. Click **Save**.
4. Go to the **Users** tab → **Add user**. Enter your email and a strong password → **Add user**.
   This is the login you'll use on both devices.
5. *(Recommended)* Go to the **Settings** tab → **User actions** and **untick "Enable create (sign-up)"**, then save.
   Now nobody else can create an account in your project. You've already made yours.

> Why not "Sign in with Google"? Google sign-in pop-ups are unreliable inside
> iPhone home-screen apps. Email + password works the same everywhere.

### 3. Create the database
1. Left menu: **Build → Firestore Database → Create database**.
2. If asked for an edition, choose **Standard**.
3. Location: choose **asia-south1 (Mumbai)**. This can't be changed later.
4. Choose **Start in production mode** → **Create**.
5. Open the **Rules** tab. Delete everything in the editor, then paste in the full contents of
   **`firestore.rules`** from the zip. Click **Publish**.

These rules let only *your* signed-in account read or write *your* data, and they refuse everything else.

### 4. Get your app's config
1. Click the **gear icon ⚙ → Project settings**.
2. Under **Your apps**, click the **Web** icon **`</>`**.
3. Nickname: `goal-tracker`. **Don't** tick "Firebase Hosting". Click **Register app**.
4. Firebase shows a code block containing `const firebaseConfig = { apiKey: "...", ... }`.
   Keep this page open. You'll copy these values in step 7.

---

## Part B — GitHub Pages (hosting the app)

### 5. Create the repository
1. Go to **https://github.com/new**.
2. Repository name: `goal-tracker`.
3. Choose **Public**. Free GitHub Pages needs a public repo. Your *data* stays private in
   Firebase. Only the app's code is visible, and the Firebase config is designed to be public.
4. Click **Create repository**.

### 6. Upload the files
1. On the new repo page, click **uploading an existing file**.
2. Drag **all the files from the unzipped folder** onto the page:
   `index.html, app.js, sync.js, firebase-config.js, sw.js, manifest.webmanifest,
   firestore.rules, README.md` and the four `.png` icons.
   (Drag the files themselves, not the folder.)
3. Click **Commit changes**.

### 7. Paste your Firebase config
1. In the repo, click **`firebase-config.js`**, then the **pencil ✏️ (Edit)** icon.
2. Replace each `PASTE_...` value with the matching value from step 4
   (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
   Keep the quotes and commas.
3. Click **Commit changes**.

### 8. Switch on GitHub Pages
1. In the repo: **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: **main**, folder **/ (root)** → **Save**.
4. Wait 1–2 minutes and refresh. The page shows your link:
   **`https://YOUR-GITHUB-USERNAME.github.io/goal-tracker/`**

---

## Part C — Install on your devices

### MacBook
1. Open your link in **Safari** and sign in.
2. Menu bar: **File → Add to Dock** (needs macOS Sonoma or later). It now opens in its own window, like an app.
   *In Chrome:* click the install icon at the right end of the address bar instead.

### iPhone
1. Open the same link in **Safari** (not Chrome) and sign in.
2. Tap **Share** (□↑) → **Add to Home Screen** → **Add**.
3. Open it from the new **Goals** icon. It runs full-screen, with no Safari bars.
   You'll need to sign in once more inside the home-screen app.

### Check that sync works
On your Mac, log a weight on the **Milestones** tab. Within a few seconds it appears on
your iPhone. A small **"Synced ✓"** badge appears at the top right whenever a change is saved.
(Habit ticking opens on 11 Nov 2026, the day your plan starts.)

---

## Everyday notes
- **Offline:** tick away without internet. The badge shows "Offline · will sync later" and it catches up when you reconnect.
- **Backup:** Milestones → **Export my data** saves a `.json` file. **Import backup** restores one. Exporting once a month is a good habit, because free plans don't include backups.
- **Forgot your password:** use "Forgot password?" on the sign-in screen.
- **Updating the app later:** after changing any file on GitHub, also edit `sw.js` and change
  `gt-v1` to `gt-v2` (then `gt-v3`, …). This makes your devices fetch the new version.
  Close and reopen the app once or twice to see it.
