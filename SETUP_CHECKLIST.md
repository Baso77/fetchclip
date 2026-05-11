# 🚀 FetchClip Setup Checklist

## ✅ What's Already Done

- [x] Fixed CORS 403 errors
- [x] Migrated to Vercel API routes
- [x] Secured Supabase keys (moved to backend)
- [x] Updated frontend to use `/api` endpoints
- [x] Configured proper CORS headers
- [x] Created database schema
- [x] Updated vercel.json routing

---

## 📋 Pre-Deployment Checklist

### Step 1: Verify Supabase Connection
- [ ] Log in to Supabase Dashboard
- [ ] Project: `Downloader` (ndmbkwxisdzfzptejxzp)
- [ ] Region: ap-northeast-1 (Tokyo)
- [ ] Navigate to: **Settings → API → Project URL** (copy value)
- [ ] Navigate to: **Settings → API → Anon public key** (copy value)
- [ ] Navigate to: **Settings → API → Service role secret key** (copy value - KEEP SECRET)

### Step 2: Test Locally (OPTIONAL)
```bash
cd fetchclip
npm install
npm run dev
# Visit http://localhost:3000
# Test: Paste a video URL and click "Fetch Media"
```

### Step 3: Set Vercel Environment Variables
Go to **Vercel Dashboard → Project Settings → Environment Variables**:

Add these variables (copy values from Supabase):

| Key | Value | From |
|-----|-------|------|
| `SUPABASE_URL` | `https://ndmbkwxisdzfzptejxzp.supabase.co` | Supabase Settings → API |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Supabase Settings → API → Anon Key |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOi...` | **Settings → API → Service Role Key** |
| `NODE_ENV` | `production` | Manual entry |

### Step 4: Deploy to Vercel
```bash
git add -A
git commit -m "Ready for production"
git push origin main
```

Vercel will auto-deploy. Watch the deployment in the dashboard.

### Step 5: Verify Deployment

**Test Health Endpoint:**
```bash
curl https://your-project.vercel.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "FetchClip API running",
  "timestamp": "2025-05-11T10:00:00Z"
}
```

**Test Frontend:**
- Visit: `https://your-project.vercel.app`
- Paste a video URL
- Click "Fetch Media"
- Should work without errors

### Step 6: Verify Database

In Supabase Dashboard:
1. Go to **Table Editor**
2. Check tables exist:
   - [ ] `downloads` (has data after you fetch media)
   - [ ] `contact_messages` (submits work from contact form)
   - [ ] `media_cache` (optional - speeds up repeated requests)

---

## 🔐 Security Checklist

- [ ] `SUPABASE_SERVICE_KEY` is set in Vercel (not in code)
- [ ] No API keys in `.env.example` file
- [ ] `.env.local` is in `.gitignore` (not committed)
- [ ] Supabase Row Level Security is enabled
- [ ] CORS headers are properly set on all endpoints

---

## 🧪 Testing Checklist

### API Endpoints
- [ ] `GET /api/health` returns 200
- [ ] `POST /api/fetch-media` with valid URL returns media data
- [ ] `POST /api/log` logs analytics to database
- [ ] `POST /api/contact` saves messages to database

### Frontend Features
- [ ] Can paste URLs and fetch media
- [ ] Video preview loads
- [ ] Download button works
- [ ] Contact form submits
- [ ] Mobile responsive

### Error Handling
- [ ] Invalid URL shows error
- [ ] Network timeout handled gracefully
- [ ] Missing env vars caught (check logs)

---

## 📊 Monitoring

### Vercel Logs
- Visit: **Dashboard → Deployments → Latest → Logs**
- Check for errors after deployment

### Supabase Logs
- Visit: **Dashboard → Logs**
- Search for recent activity

### Browser Console
- Open DevTools (F12)
- Check Console tab for JS errors
- Check Network tab for failed API calls

---

## 🐛 Common Issues & Fixes

### Problem: 403 Forbidden (CORS Error)
**Cause:** Environment variables not set
**Fix:**
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add all required variables
3. Re-deploy: Click "Redeploy" button

### Problem: "Cannot find module '@supabase/supabase-js'"
**Cause:** Dependencies not installed
**Fix:**
```bash
npm install
git add package-lock.json
git commit -m "Install dependencies"
git push
```

### Problem: API returns 500 error
**Cause:** Missing SUPABASE_SERVICE_KEY
**Fix:** Add SUPABASE_SERVICE_KEY to Vercel environment variables

### Problem: "Supabase URL is required"
**Cause:** SUPABASE_URL not set
**Fix:** Set SUPABASE_URL in Vercel environment variables

---

## 🎯 Final Status

When all checkboxes are checked:

✅ **Your FetchClip is production-ready!**

---

## 📞 Still Having Issues?

1. **Check Vercel Logs:** Dashboard → Deployments → Logs
2. **Check Supabase Status:** supabase.com/status
3. **Review DEPLOYMENT.md** for detailed setup guide

---

**Last Updated:** 2025-05-11
**Version:** 2.0.0 (Production Ready)
