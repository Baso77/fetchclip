const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ============================================================
// CORS Configuration
// ============================================================
const allowedOrigins = [
  "https://fetchclip.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ============================================================
// Supabase Client (Service Role)
// ============================================================
const supabase = createClient(
  process.env.SUPABASE_URL || "https://ndmbkwxisdzfzptejxzp.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "FetchClip backend running",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// LOG DOWNLOAD EVENT
// ============================================================
app.post("/api/log", async (req, res) => {
  try {
    const { url, platform, title, action, quality } = req.body;

    if (!url || !platform) {
      return res.status(400).json({ error: "Missing url or platform" });
    }

    // Hash IP (never store raw IP)
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
    const crypto = require("crypto");
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

    const { data, error } = await supabase.from("downloads").insert([
      {
        url,
        platform,
        title: title || null,
        action: action || "fetch",
        quality: quality || null,
        ip_hash: ipHash,
      },
    ]);

    if (error) {
      console.error("[LOG ERROR]", error);
      return res.status(500).json({ error: "Failed to log event", details: error.message });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[LOG EXCEPTION]", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CONTACT FORM
// ============================================================
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase.from("contact_messages").insert([
      {
        name,
        email,
        subject: subject || "General Inquiry",
        message,
      },
    ]);

    if (error) {
      console.error("[CONTACT ERROR]", error);
      return res.status(500).json({ error: "Failed to save message", details: error.message });
    }

    res.status(200).json({ success: true, message: "Message saved" });
  } catch (err) {
    console.error("[CONTACT EXCEPTION]", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FETCH MEDIA (Proxy endpoint)
// ============================================================
app.post("/api/fetch-media", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Platform detection
    let platform = null;
    try {
      const host = new URL(url).hostname.replace("www.", "");
      if (host.includes("instagram.com")) platform = "instagram";
      else if (host.includes("tiktok.com")) platform = "tiktok";
      else if (host.includes("youtube.com") || host.includes("youtu.be")) platform = "youtube";
      else if (host.includes("facebook.com") || host.includes("fb.watch")) platform = "facebook";
      else if (host.includes("twitter.com") || host.includes("x.com")) platform = "twitter";
      else if (host.includes("pinterest.com")) platform = "pinterest";
    } catch (e) {
      console.error("[PLATFORM DETECTION ERROR]", e);
    }

    if (!platform) {
      return res.status(400).json({ error: "Unsupported platform" });
    }

    // Mock response for demonstration
    // In production, integrate with yt-dlp or similar media fetcher
    const mockData = {
      success: true,
      url,
      platform,
      title: "Sample Video Title",
      duration: 45,
      uploader: "Sample User",
      view_count: 15000,
      like_count: 2500,
      upload_date: "20250511",
      thumbnail: "https://via.placeholder.com/320x180?text=Video+Thumbnail",
      webpage_url: url,
      ext: "mp4",
      formats: [
        {
          quality: "HD",
          label: "HD (Best)",
          ext: "mp4",
          url: "https://via.placeholder.com/sample-hd.mp4",
          download_url: "https://via.placeholder.com/sample-hd.mp4",
        },
        {
          quality: "SD",
          label: "SD (Standard)",
          ext: "mp4",
          url: "https://via.placeholder.com/sample-sd.mp4",
          download_url: "https://via.placeholder.com/sample-sd.mp4",
        },
      ],
    };

    res.status(200).json(mockData);
  } catch (err) {
    console.error("[FETCH ERROR]", err);
    res.status(500).json({ error: "Failed to fetch media", message: err.message });
  }
});

// ============================================================
// 404 Handler
// ============================================================
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// ============================================================
// Error Handler
// ============================================================
app.use((err, req, res, next) => {
  console.error("[GLOBAL ERROR]", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

module.exports = app;
