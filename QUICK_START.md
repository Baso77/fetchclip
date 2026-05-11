# 🚀 FetchClip - Quick Start (5 Minutes)

## What Was Fixed
✅ 403 CORS errors fixed
✅ Supabase keys secured (moved to backend)
✅ Migrated to Vercel API routes
✅ Production-ready architecture

---

## Step 1: Verify Environment Variables (2 min)

Go to **Vercel Dashboard → Project Settings → Environment Variables**

Add these 3 variables:

```
SUPABASE_URL = https://ndmbkwxisdzfzptejxzp.supabase.co

SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbWJrd3hpc2R6ZnpwdGVqeHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTIyOTcsImV4cCI6MjA5Mzk2ODI5N30.roRS52ID1J3ubsqJ7aeCGPwi8vq5G-wIgga90SzP6NY

SUPABASE_SERVICE_KEY = [Get from: Supabase Dashboard → Settings → API → Service role secret key]

NODE_ENV = production
```

**⚠️ IMPORTANT:** The `SUPABASE_SERVICE_KEY` is the critical one. Get it from:
- Go to **Supabase Dashboard**
- Click your **Downloader** project
- Go to **Settings → API**
- Copy the **Service role secret key**
- Paste into Vercel

---

## Step 2: Deploy (1 min)

Push your code:
```bash
git push origin main
```

Vercel will auto-deploy. Watch the progress in Vercel Dashboard.

---

## Step 3: Test (2 min)

### Test 1: Health Check
Open in browser:
```
https://your-project.vercel.app/api/health
```

Should see:
```json
{
  "status": "ok",
  "message": "FetchClip API running",
  "timestamp": "2025-05-11T..."
}
```

### Test 2: Frontend
Open in browser:
```
https://your-project.vercel.app
```

Try:
1. Paste a video URL (e.g., Instagram Reel, TikTok)
2. Click "Fetch Media"
3. Should show preview and download options

---

## 🎉 You're Done!

If both tests passed, your FetchClip is **production-ready**!

---

## ⚠️ If Tests Fail

### Issue: 403 Forbidden
**Fix:** Check environment variables in Vercel dashboard

### Issue: "Cannot connect to API"
**Fix:** 
1. Check Vercel Logs: Dashboard → Deployments → Logs
2. Verify `SUPABASE_SERVICE_KEY` is set (not just ANON_KEY)

### Issue: "Supabase URL required"
**Fix:** Verify all 3 environment variables are set

---

## 📚 For More Details

- **Setup Guide:** Read `DEPLOYMENT.md`
- **API Docs:** Read `API.md`
- **Checklist:** Read `SETUP_CHECKLIST.md`
- **What Was Fixed:** Read `FIXES_SUMMARY.md`

---

## 🆘 Still Having Issues?

1. Check **Vercel Logs:**
   - Dashboard → Deployments → Latest → Logs

2. Check **Supabase Status:**
   - supabase.com/status

3. Verify **environment variables:**
   - Dashboard → Settings → Environment Variables

4. Read **DEPLOYMENT.md** for detailed troubleshooting

---

**Status:** ✅ Ready to Deploy
**Version:** 2.0.0
**Last Updated:** 2025-05-11
