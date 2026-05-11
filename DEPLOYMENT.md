# FetchClip — Complete Deployment Guide

## 🚀 What's Fixed

The **403 Forbidden** error was caused by:

1. ❌ **CORS Misconfiguration** → ✅ Fixed with proper CORS headers on all API routes
2. ❌ **Hardcoded Supabase Keys in Frontend** → ✅ Moved to backend environment variables
3. ❌ **Improper Express Export** → ✅ Using Vercel's native `/api` route structure
4. ❌ **Routing Conflicts** → ✅ Updated vercel.json with correct rewrites and headers

---

## 📋 Project Structure

```
fetchclip/
├── api/                          # ← Vercel API Routes (Backend)
│   ├── health.js                # Health check endpoint
│   ├── log.js                   # Analytics logging
│   ├── contact.js               # Contact form handler
│   └── fetch-media.js           # Video fetching endpoint
├── public/                       # ← Frontend (Static + JS)
│   ├── index.html
│   ├── js/
│   │   ├── downloader.js        # Updated to use /api routes
│   │   └── main.js              # Contact form handler
│   ├── css/main.css
│   └── pages/
├── backend/
│   └── server.js                # Legacy (can be removed)
├── supabase/
│   └── schema.sql               # Database schema
├── .env.local                   # Development variables
├── .env.example                 # Example variables
├── vercel.json                  # Vercel routing config (FIXED)
└── package.json                 # Updated
```

---

## 🔧 Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/Baso77/fetchclip.git
cd fetchclip
npm install
```

### 2. Set Environment Variables

Create/update `.env.local`:
```env
SUPABASE_URL=https://ndmbkwxisdzfzptejxzp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=development
```

### 3. Run Locally
```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## 🚀 Vercel Deployment

### 1. Connect GitHub Repository
- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Import from GitHub: `Baso77/fetchclip`

### 2. Set Environment Variables

In **Vercel Dashboard → Project Settings → Environment Variables**:

```
SUPABASE_URL=https://ndmbkwxisdzfzptejxzp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=<YOUR_SERVICE_KEY_FROM_SUPABASE>
NODE_ENV=production
```

**⚠️ IMPORTANT:** Get your `SUPABASE_SERVICE_KEY` from Supabase Dashboard:
- Go to: Settings → API → Service role secret key
- Copy it and add to Vercel environment variables
- Keep it SECRET — never commit to git

### 3. Deploy

```bash
git push origin main
```

Vercel will automatically deploy. Check deployment status in the dashboard.

---

## 📡 API Endpoints

All endpoints are now available at `/api/*`:

### 1. Health Check
```bash
GET /api/health
```
**Response:**
```json
{
  "status": "ok",
  "message": "FetchClip API running",
  "timestamp": "2025-05-11T10:00:00Z"
}
```

### 2. Fetch Media
```bash
POST /api/fetch-media
Content-Type: application/json

{
  "url": "https://instagram.com/p/..."
}
```

### 3. Log Event (Analytics)
```bash
POST /api/log
Content-Type: application/json

{
  "url": "https://instagram.com/p/...",
  "platform": "instagram",
  "title": "Video Title",
  "action": "download",
  "quality": "HD"
}
```

### 4. Contact Form
```bash
POST /api/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Bug Report",
  "message": "I found an issue..."
}
```

---

## 🔐 Security Best Practices

✅ **What We Fixed:**

1. **Supabase Keys**: Service Key is now backend-only
2. **CORS**: Properly configured headers
3. **IP Privacy**: Hashed IPs in database (never store raw)
4. **Environment Variables**: Secrets in Vercel, not in code
5. **Input Validation**: All endpoints validate input

---

## 🐛 Troubleshooting

### Issue: 403 Forbidden
**Solution:** Ensure environment variables are set in Vercel dashboard

### Issue: CORS Error
**Solution:** Check that API routes have correct CORS headers (already fixed)

### Issue: Supabase Connection Failed
**Solution:** Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Vercel

### Issue: API Returns 500
**Solution:** Check Vercel Logs in dashboard: Deployments → Logs

---

## 📦 Database Schema

Run this SQL in Supabase:
```sql
-- See supabase/schema.sql for full schema
CREATE TABLE downloads (
  id bigserial PRIMARY KEY,
  url text,
  platform text,
  title text,
  action text DEFAULT 'fetch',
  quality text,
  ip_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE contact_messages (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

---

## 🎯 Next Steps

1. ✅ Test locally: `npm run dev` → `http://localhost:3000`
2. ✅ Deploy to Vercel: `git push origin main`
3. ✅ Monitor: Check Vercel Logs for errors
4. ✅ Test API: Use curl/Postman to test endpoints

---

## 📞 Support

For issues:
1. Check Vercel Logs: Dashboard → Deployments → Logs
2. Check Supabase Status: Dashboard → Your Project
3. Review console errors in browser DevTools

---

**Version:** 2.0.0 (Fixed CORS & 403 Errors)
**Last Updated:** 2025-05-11
