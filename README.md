# 🎥 FetchClip — Social Media Video Downloader

> Download Instagram Reels, TikTok videos, YouTube Shorts, and more in HD quality. Fast, free, no signup required.

## 🎉 Version 2.0 - Production Ready (FIXED)

✅ **403 CORS errors fixed**
✅ **Supabase keys secured**
✅ **Vercel API routes implemented**
✅ **Complete documentation provided**

---

## 📚 Documentation

### Quick Links
| Resource | Time | Purpose |
|----------|------|---------|
| **[QUICK_START.md](QUICK_START.md)** | 5 min | Get running in 5 minutes |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | 15 min | Complete setup guide |
| **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** | 10 min | Step-by-step checklist |
| **[API.md](API.md)** | Reference | API documentation |
| **[FIXES_SUMMARY.md](FIXES_SUMMARY.md)** | Reference | What was fixed |
| **[BEFORE_AFTER.md](BEFORE_AFTER.md)** | Reference | Visual comparison |

---

## 🚀 Quick Start (5 Minutes)

### 1. Set Environment Variables in Vercel Dashboard
```
SUPABASE_URL=https://ndmbkwxisdzfzptejxzp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_KEY=eyJhbGciOi...  (⚠️ Get from Supabase)
NODE_ENV=production
```

### 2. Deploy
```bash
git push origin main
```

### 3. Test
Visit: `https://your-project.vercel.app/api/health`

Should see:
```json
{
  "status": "ok",
  "message": "FetchClip API running"
}
```

---

## 🛠️ Local Development

```bash
# Install
npm install

# Run
npm run dev

# Visit
http://localhost:3000
```

---

## ✅ Supabase Status

| Resource | Value |
|----------|-------|
| **Project** | Downloader |
| **Project ID** | ndmbkwxisdzfzptejxzp |
| **Region** | ap-northeast-1 (Tokyo) |
| **Status** | ✅ ACTIVE |

### Database Tables
- `downloads` — Analytics & usage logs
- `contact_messages` — Contact form submissions
- `media_cache` — 2-hour media cache (optional)

---

## 🔌 Architecture

```
Frontend (Browser)
    ↓
Vercel API Routes (/api/*)
    ├── /health          → Health check
    ├── /fetch-media     → Fetch video data
    ├── /log             → Log analytics
    └── /contact         → Contact form
    ↓
Supabase (Database + Authentication)
    ├── downloads table
    ├── contact_messages table
    └── media_cache table (optional)
    ↓
Response to Frontend
```

---

## 🚀 Supported Platforms

- ✅ Instagram (Reels, Stories, Posts, IGTV)
- ✅ TikTok (Videos)
- ✅ YouTube (Videos, Shorts, up to 4K)
- ✅ Facebook (Videos)
- ✅ Twitter/X (Videos)
- ✅ Pinterest (Videos)

---

## 📊 Analytics

View download statistics in Supabase:
1. Dashboard → **Downloader** project
2. **Table Editor** → `downloads` table
3. Or query: `SELECT * FROM platform_popularity;`

---

## 🔐 Security Features

- ✅ Supabase keys in backend environment variables only
- ✅ Proper CORS headers on all endpoints
- ✅ IP hashing (never store raw IPs)
- ✅ Row Level Security (RLS) enabled
- ✅ Input validation on all endpoints

---

## 🆘 Troubleshooting

### 403 Forbidden Error
→ Check [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)

### API Returns 500
→ Check Vercel Logs: Dashboard → Deployments → Logs

### Can't connect to Supabase
→ Verify `SUPABASE_SERVICE_KEY` is set

---

## 📦 API Endpoints

All endpoints are at `/api/*`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/fetch-media` | Fetch video data |
| `POST` | `/api/log` | Log analytics |
| `POST` | `/api/contact` | Contact form |

See [API.md](API.md) for full documentation.

---

## 📋 Project Structure

```
fetchclip/
├── api/                  # Vercel API Routes (Backend)
│   ├── health.js
│   ├── fetch-media.js
│   ├── log.js
│   └── contact.js
├── public/               # Frontend (Static)
│   ├── index.html
│   ├── js/
│   │   ├── downloader.js
│   │   └── main.js
│   ├── css/main.css
│   └── pages/
├── supabase/
│   └── schema.sql        # Database schema
├── Documentation/
│   ├── QUICK_START.md
│   ├── DEPLOYMENT.md
│   ├── SETUP_CHECKLIST.md
│   ├── API.md
│   ├── FIXES_SUMMARY.md
│   └── BEFORE_AFTER.md
├── vercel.json           # Vercel configuration
├── .env.local            # Development env vars
├── .env.example          # Example env vars
└── package.json
```

---

## 🎯 What's New in v2.0

- 🔄 **Migrated to Vercel API Routes** — Better performance, native integration
- 🔐 **Secured Supabase Keys** — Moved to backend environment variables
- ✅ **Fixed CORS Issues** — Proper headers on all endpoints
- 📚 **Complete Documentation** — 5+ guides covering everything
- 🧪 **Full API Reference** — Examples in curl, JavaScript, Python
- 🎓 **Before/After Comparison** — Understand what changed and why

---

## 💡 Features

- 🎬 Download videos in HD quality
- ⚡ Fast processing (<3 seconds average)
- 📱 Mobile responsive
- 🆓 100% free, no signup required
- 🔒 Private & secure
- 📊 Analytics dashboard
- 💬 Contact form

---

## 📞 Support

1. Read the [QUICK_START.md](QUICK_START.md) (5 min)
2. Check [DEPLOYMENT.md](DEPLOYMENT.md) (15 min)
3. Review [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)
4. Check Vercel logs for errors
5. Review [API.md](API.md) for endpoint details

---

## 📄 License

MIT - See LICENSE file

---

## 👨‍💻 Development

**Stack:**
- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js (Vercel Functions)
- Database: Supabase PostgreSQL
- Hosting: Vercel

**Version:** 2.0.0
**Status:** ✅ Production Ready
**Last Updated:** 2025-05-11
