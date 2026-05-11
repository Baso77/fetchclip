# FetchClip — Deployment Guide

## ✅ Supabase Status: LIVE & CONNECTED

| Resource | Value |
|---|---|
| **Project** | Downloader |
| **Project ID** | `ndmbkwxisdzfzptejxzp` |
| **Region** | ap-northeast-1 (Tokyo) |
| **Status** | ACTIVE_HEALTHY ✅ |
| **URL** | `https://ndmbkwxisdzfzptejxzp.supabase.co` |
| **Edge Function** | `fetch-media` — ACTIVE ✅ |

### Database Tables (all live with RLS):
- `downloads` — analytics & usage logs
- `contact_messages` — contact form submissions
- `media_cache` — 2-hour media URL cache

### Edge Function Endpoints:
| Endpoint | Method | Purpose |
|---|---|---|
| `/functions/v1/fetch-media` | POST | Fetch media info + URLs |
| `/functions/v1/fetch-media/log` | POST | Log download events |
| `/functions/v1/fetch-media/contact` | POST | Contact form |

---

## 🚀 Deploy to Vercel (Recommended)

### Step 1: Push to GitHub
```bash
cd fetchclip
git init
git add .
git commit -m "Initial FetchClip production release"
git remote add origin https://github.com/YOUR_USERNAME/fetchclip.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → Import Project
2. Connect your GitHub repository
3. Framework: **Other**
4. Root directory: leave as `/`
5. Add environment variables:
   - `SUPABASE_URL` = `https://ndmbkwxisdzfzptejxzp.supabase.co`
   - `SUPABASE_ANON_KEY` = *(from .env.example)*
6. Click **Deploy**

### Step 3: Install yt-dlp on Vercel (for Node backend)
Add to your Vercel build command:
```
pip install yt-dlp && node backend/server.js
```

---

## 🖥️ Run Locally

```bash
cd d:\DOWNLOAD\fetchclip-production
npm install
npm start
```

Then open `http://localhost:3000` in your browser.

> Important: Do not run `serve public` separately if you want the built-in backend route. The frontend and API must stay on the same host/port so `/api/fetch-media` resolves correctly.
>
> The local Node backend handles media extraction, while Supabase is only used for analytics and the contact form.

---

## 🔌 Architecture

```
User Browser
    │
    ▼
FetchClip Frontend (HTML/CSS/JS)
    │
    ├─── POST /api/fetch-media
    │         │
    │         ▼
    │    Local Node.js backend (backend/server.js)
    │         │
    │         ├── yt-dlp-exec media extraction
    │         └── response metadata and download URLs
    │
    └─── Direct download link → user's browser
```

---

## 📊 Analytics Dashboard

View download analytics in Supabase:
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Open project **Downloader**
3. Go to **Table Editor** → `downloads`
4. Or run SQL: `SELECT * FROM platform_popularity;`
