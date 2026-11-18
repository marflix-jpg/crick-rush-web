# Deploying Pitchside to Vercel

This is a **static site** (just `index.html`, `styles.css`, `app.js`). No build step,
no backend, no database. Vercel serves it as-is.

## Option 1 — Vercel CLI (fastest)

Run these in a terminal **in this project folder**:

```bash
npx vercel login
```
Pick your login method and confirm in the browser (this authenticates *your* account).

```bash
npx vercel --prod
```
Accept the defaults (framework: **Other**, no build command, output dir: `./`).
You'll get a live `https://<project>.vercel.app` URL.

## Option 2 — Drag & drop (no CLI)

1. Go to https://vercel.com/new
2. Choose **"Deploy"** → drag this whole folder onto the page
   (or zip it and upload). Vercel auto-detects a static site.
3. Click **Deploy**. Done.

## Option 3 — GitHub (best for ongoing updates)

```bash
git init && git add . && git commit -m "Pitchside"
```
Push to a GitHub repo, then import it at https://vercel.com/new — every push auto-deploys.

---
No environment variables or settings are required. The included `vercel.json` only sets
clean URLs and sensible cache headers.
