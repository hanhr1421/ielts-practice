# IELTS Practice Hub — Setup & Deployment Guide

---

## What's in this folder

```
ielts-site/
├── index.html              ← Home dashboard (password gate + section menu)
├── vocab.html              ← Vocab/Grammar — Unit 1 fully built (27 more units to add)
├── listening.html          ← Placeholder
├── reading.html            ← Placeholder
├── writing.html            ← Placeholder
├── speaking.html           ← Placeholder
├── google-apps-script.js   ← Paste into Google Apps Script (see Step 2)
└── README.md               ← This file
```

---

## STEP 1 — Set Your Password

Open `index.html` in any text editor. Find this line near the bottom:

```js
const PASSWORD = "ielts2024";
```

Change `ielts2024` to whatever password you want. Save the file.

---

## STEP 2 — Connect Google Sheets (for score reporting)

### 2a. Create a new Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) — sign in with `hanhr1421@gmail.com`
2. Click **+ Blank** to create a new spreadsheet
3. Name it: `IELTS Practice Hub — Student Scores`

### 2b. Open Apps Script

1. In your new Sheet, click **Extensions → Apps Script**
2. Delete all the default code in the editor
3. Open the file `google-apps-script.js` from this folder
4. Copy ALL the content and paste it into the Apps Script editor
5. Click **Save** (the floppy disk icon)

### 2c. Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon ⚙️ next to "Select type" → choose **Web app**
3. Fill in:
   - Description: `IELTS Practice Hub`
   - Execute as: **Me**
   - Who has access: **Anyone** (this is needed for the website to send data)
4. Click **Deploy**
5. Click **Authorize access** → choose your Google account → Allow
6. **Copy the Web App URL** — it looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

### 2d. Paste the URL into the website

1. Open `vocab.html` in a text editor
2. Find this line:
   ```js
   const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
3. Replace `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` with your copied URL
4. Save the file

**Test it:** Open vocab.html, complete a few questions, click Submit. Then check your Google Sheet — a new row should appear in the "Scores" tab within a few seconds.

---

## STEP 3 — Deploy to GitHub Pages (free hosting)

### Option A — No coding needed (drag and drop)

1. Go to [github.com](https://github.com) and create a free account
2. Click **+** → **New repository**
3. Name it: `ielts-practice` — set to **Public** — click **Create**
4. Click **uploading an existing file**
5. Drag ALL files from this folder into the upload area
6. Click **Commit changes**
7. Go to **Settings → Pages**
8. Under "Source", select **Deploy from a branch** → branch: **main** → folder: **/ (root)**
9. Click **Save**
10. Wait ~1 minute. Your site will be live at:
    `https://YOUR-USERNAME.github.io/ielts-practice`

### Option B — Netlify (even simpler)

1. Go to [netlify.com](https://netlify.com) → Sign up free
2. Click **Add new site → Deploy manually**
3. Drag your entire `ielts-site` folder onto the deploy area
4. Done — you get a URL like `https://random-name.netlify.app`
5. You can rename it to something nicer in Settings

---

## STEP 4 — Share with Students

Send your students:
- The URL (e.g. `https://yourusername.github.io/ielts-practice`)
- The password you set in Step 1
- Tell them to **use Chrome** (required for speaking/transcription feature when that's built)

---

## How to Monitor Student Progress

Open your Google Sheet at any time. It has 3 tabs:

| Tab | What it shows |
|-----|---------------|
| **Scores** | Every submission with timestamp, name, unit, score, % |
| **Writing Submissions** | Full writing text (when writing section is live) |
| **Summary** | Per-student: total submissions, average %, last active date |

---

## How to Update the Site

When new units or sections are added:
1. You'll receive updated HTML files from your builder
2. Just re-upload the changed files to GitHub (drag and drop again, same steps)
3. GitHub Pages updates automatically within 1–2 minutes

---

## Current Status

| Section | Status | Notes |
|---------|--------|-------|
| Vocab/Grammar | ✅ Live | Unit 1 fully built — Units 2–28 to be added |
| Listening | 🔜 Next | Awaiting Cambridge content |
| Reading | 🔜 Next | Awaiting Cambridge content |
| Writing | 🔜 Next | Prompts to be added |
| Speaking | 🔜 Next | Claude API + mic recording to be added |

---

*Built for private classroom use only.*
