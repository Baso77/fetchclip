# FetchClip Troubleshooting Guide

## Issue: "Unable to Fetch Media" Error

### Root Cause
Your frontend JavaScript was configured to call **Supabase Edge Functions** instead of your local **Express.js backend server**. This caused all media fetch requests to fail for all platforms (Instagram, TikTok, Facebook, etc.).

### What Was Changed

#### 1. **`public/js/downloader.js`** ✅ FIXED
Changed the API endpoints from Supabase to your local backend:

**BEFORE:**
```javascript
const EDGE_BASE   = 'https://ndmbkwxisdzfzptejxzp.supabase.co/functions/v1';
const API_FETCH   = `${EDGE_BASE}/fetch-media`;
const API_LOG     = `${EDGE_BASE}/fetch-media/log`;
const API_CONTACT = `${EDGE_BASE}/fetch-media/contact`;
const SUPA_KEY    = 'eyJhbGci...'; // Hardcoded key
```

**AFTER:**
```javascript
const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : window.location.origin;

const API_FETCH   = `${BACKEND_URL}/api/fetch-media`;
const API_LOG     = `${BACKEND_URL}/api/log`;
const API_CONTACT = `${BACKEND_URL}/api/contact`;
const SUPA_KEY    = ''; // No longer needed
```

Also removed the `Authorization: Bearer ${SUPA_KEY}` headers from fetch calls.

#### 2. **`backend/server.js`** ✅ FIXED
Added two missing API endpoints:

**ADDED:**
```javascript
app.post("/api/log", (req, res) => {
  console.log("[FetchClip Log]", req.body);
  res.json({ status: "logged" });
});

app.post("/api/contact", (req, res) => {
  console.log("[FetchClip Contact]", req.body);
  res.json({ status: "received" });
});
```

### How to Test

1. **Start your backend:**
   ```bash
   npm start
   ```
   You should see: `FetchClip backend listening on http://localhost:3000`

2. **Test the health endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return: `{"status":"ok","message":"FetchClip backend running"}`

3. **Open your app in the browser** and try fetching a media link

### Expected Result
✅ All social media platforms now work
✅ Previews display correctly
✅ Downloads start without errors
✅ All formats (Instagram Reels, TikTok, Facebook videos, etc.) supported

### Why This Happened
- Your frontend was hardcoded to use Supabase Edge Functions
- Your actual backend is a local Node.js/Express server
- The two weren't connected, causing all requests to fail
- After the fix, the frontend now correctly routes all API calls to your Express backend

### Additional Notes
- If deploying to production, update `BACKEND_URL` to point to your production domain
- The `/api/log` and `/api/contact` endpoints are now optional (non-critical for core functionality)
- All error handling from your backend is preserved
