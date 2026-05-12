const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const ytdlp = require("yt-dlp-exec");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/pages/:page", (req, res) => {
  const targetFile = path.join(__dirname, "../public/pages", `${req.params.page}.html`);
  if (fs.existsSync(targetFile)) {
    return res.sendFile(targetFile);
  }
  return res.status(404).send("Page not found");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "FetchClip backend running"
  });
});

app.post("/api/log", (req, res) => {
  // Non-critical logging endpoint
  console.log("[FetchClip Log]", req.body);
  res.json({ status: "logged" });
});

app.post("/api/contact", (req, res) => {
  // Contact form endpoint
  console.log("[FetchClip Contact]", req.body);
  res.json({ status: "received" });
});

app.get("/api/download", async (req, res) => {
  const fileUrl = req.query.url;
  const fileName = req.query.name || "fetchclip-download";
  if (!fileUrl) {
    return res.status(400).send("Missing download URL");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    return res.status(400).send("Invalid download URL");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).send("Unsupported download URL protocol");
  }

  try {
    const remote = await fetch(fileUrl, { redirect: "follow" });
    if (!remote.ok) {
      return res.status(remote.status).send(`Remote download failed: ${remote.statusText}`);
    }

    const filenameSafe = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameSafe}"`);
    res.setHeader("Content-Type", remote.headers.get("content-type") || "application/octet-stream");

    const body = remote.body;
    if (!body) {
      return res.status(500).send("Download stream unavailable");
    }

    await pipeline(body, res);
  } catch (err) {
    console.error("/api/download error", err);
    return res.status(500).send("Download proxy failed");
  }
});

const CHROME_LIKE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const MOBILE_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

function isPreviewVideoProxyAllowedHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return (
    h.includes("cdninstagram") ||
    h.includes("fbcdn.net") ||
    h.includes("tiktokcdn.com") ||
    h.includes("tiktokv.com")
  );
}

/** In-browser <video> from IG/TikTok CDNs often fails or is silent without a Meta/TikTok Referer. */
app.get("/api/preview-video", async (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).send("Missing url");
  let u;
  try {
    u = new URL(String(raw));
  } catch {
    return res.status(400).send("Invalid url");
  }
  if (!["http:", "https:"].includes(u.protocol)) return res.status(400).send("Bad protocol");
  if (!isPreviewVideoProxyAllowedHost(u.hostname)) {
    return res.status(403).send("Host not allowed for preview");
  }

  const referer = u.hostname.includes("tiktok")
    ? "https://www.tiktok.com/"
    : "https://www.instagram.com/";

  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 45000);
    const upstream = await fetch(u.href, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": CHROME_LIKE_UA,
        Referer: referer,
        Accept: "*/*",
      },
    });
    clearTimeout(tid);
    if (!upstream.ok) return res.status(502).send("Upstream preview failed");

    const ct = upstream.headers.get("content-type") || "video/mp4";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "private, max-age=300");

    const body = upstream.body;
    if (!body) return res.status(502).send("Empty body");
    await pipeline(body, res);
  } catch (err) {
    console.error("/api/preview-video error", err?.message || err);
    return res.status(502).send("Preview proxy failed");
  }
});

function parseUploadDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/** Lower = shown first when picking one file per height (MP4 before WebM). */
function containerPreference(ext) {
  const order = { mp4: 0, m4v: 1, mov: 2, mkv: 3, webm: 4 };
  const e = String(ext || "").toLowerCase();
  return order[e] !== undefined ? order[e] : 50;
}

/** User-facing type name (avoid unexplained “WEBM”, etc.). */
function containerFriendlyName(ext) {
  const e = String(ext || "").toLowerCase();
  if (["mp4", "m4v", "mov"].includes(e)) return "MP4";
  if (e === "webm") return "HD video";
  if (e === "mkv") return "MKV";
  return (e || "video").toUpperCase();
}

function mapFormatRow(f) {
  const hasAudio = Boolean(f.acodec && f.acodec !== "none");
  const hasVideo = Boolean(f.vcodec && f.vcodec !== "none");
  return {
    quality: String(f.format_id || f.format_note || f.format || "best"),
    hasAudio,
    hasVideo,
    height: f.height || null,
    ext: f.ext,
    url: f.url,
    download_url: f.url,
    filesize: f.filesize || f.filesize_approx || null,
  };
}

/** One row per height; prefer MP4-style over WebM when both exist. */
function dedupeByHeightPreferContainer(formats) {
  const best = new Map();
  for (const f of formats) {
    const h = f.height || 0;
    const prev = best.get(h);
    if (!prev) {
      best.set(h, f);
      continue;
    }
    let winner = prev;
    const pc = containerPreference(f.ext);
    const pp = containerPreference(prev.ext);
    if (pc < pp) winner = f;
    else if (pc === pp && (f.filesize || 0) > (prev.filesize || 0)) winner = f;
    best.set(h, winner);
  }
  return Array.from(best.values());
}

function labelCombinedRow(f) {
  const res = f.height ? `${f.height}p` : "Best match";
  return `${res} · ${containerFriendlyName(f.ext)} — video with sound`;
}

function labelSilentRow(f) {
  const res = f.height ? `${f.height}p` : "HD";
  return `${res} · ${containerFriendlyName(f.ext)} — picture without sound (use “Sound only” below if you need audio)`;
}

/** Single “no sound” option: medium-ish tier, plain language. */
function pickOneMediumSilent(videoOnly, combinedRows) {
  if (!videoOnly.length) return null;
  const combinedUrls = new Set(combinedRows.map((r) => r.download_url));
  const pool = videoOnly.filter((f) => !combinedUrls.has(f.download_url));
  if (!pool.length) return null;
  const target = 720;
  const inBand = pool.filter((f) => {
    const h = f.height || 0;
    return h >= 480 && h <= 900;
  });
  const pickFrom = inBand.length ? inBand : pool;
  return pickFrom.reduce((best, f) => {
    if (!best) return f;
    const d = Math.abs((f.height || 0) - target);
    const db = Math.abs((best.height || 0) - target);
    if (d !== db) return d < db ? f : best;
    return containerPreference(f.ext) < containerPreference(best.ext) ? f : best;
  }, null);
}

/** Up to four spaced “video + sound” tiers (e.g. toward 4K / 1080 / 720 / 360 when YouTube exposes them). */
function pickFourVideoWithSoundRows(dedupedCombined) {
  const sorted = [...dedupedCombined].sort(
    (a, b) =>
      (b.height || 0) - (a.height || 0) || (b.filesize || 0) - (a.filesize || 0)
  );
  const byHeight = new Map();
  for (const f of sorted) {
    const h = f.height || 0;
    if (!byHeight.has(h)) byHeight.set(h, f);
  }
  const heights = [...byHeight.keys()].filter((h) => h > 0).sort((a, b) => b - a);
  if (!heights.length) return sorted.slice(0, 4);

  if (heights.length <= 4) {
    return heights.map((h) => byHeight.get(h)).filter(Boolean);
  }

  const n = heights.length;
  const idxs = [0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1];
  const chosenHeights = [...new Set(idxs.map((i) => heights[i]))];
  return chosenHeights.map((h) => byHeight.get(h)).filter(Boolean);
}

function buildYoutubeBundleRows(mapped) {
  const audioOnly = mapped.filter((f) => f.hasAudio && !f.hasVideo);
  const bestM4a = audioOnly
    .filter((f) => ["m4a", "aac", "mp4"].includes(String(f.ext || "").toLowerCase()))
    .sort((a, b) => (b.filesize || 0) - (a.filesize || 0))[0];
  const bestAny = audioOnly.sort((a, b) => (b.filesize || 0) - (a.filesize || 0))[0];
  const aud = bestM4a || bestAny;
  if (!aud?.download_url) return [];

  const videoOnlyList = dedupeByHeightPreferContainer(
    mapped.filter((f) => f.hasVideo && !f.hasAudio)
  );
  videoOnlyList.sort(
    (a, b) =>
      (b.height || 0) - (a.height || 0) || (b.filesize || 0) - (a.filesize || 0)
  );
  if (!videoOnlyList.length) return [];

  const picks = pickFourVideoWithSoundRows(videoOnlyList);
  return picks.map((v) => ({
    ...v,
    hasAudio: true,
    hasVideo: true,
    bundle_audio_url: aud.download_url,
    bundle_audio_ext: aud.ext,
    is_youtube_bundle: true,
    label: `${v.height || "?"}p · MP4 — video with sound (2 quick downloads from YouTube)`,
  }));
}

function buildPublicFormats(info) {
  const raw = Array.isArray(info.formats) ? info.formats : [];
  const mapped = raw
    .filter((f) => f.url && f.ext && (f.vcodec !== "none" || f.acodec !== "none"))
    .map(mapFormatRow);

  const combined = mapped.filter((f) => f.hasVideo && f.hasAudio);
  const videoOnly = mapped.filter((f) => f.hasVideo && !f.hasAudio);

  const isYoutube = String(info.extractor_key || "")
    .toLowerCase()
    .includes("youtube");

  let rows = [];

  if (isYoutube) {
    const bundles = buildYoutubeBundleRows(mapped);
    if (bundles.length) {
      rows = bundles.slice(0, 4);
      const bundleHeights = new Set(rows.map((r) => r.height || 0));
      const silentPool = videoOnly.filter((v) => !bundleHeights.has(v.height || 0));
      const silent = pickOneMediumSilent(silentPool, rows);
      if (silent) {
        rows.push({ ...silent, label: labelSilentRow(silent) });
      }
      return rows;
    }
  }

  if (combined.length) {
    const deduped = dedupeByHeightPreferContainer(combined);
    deduped.sort(
      (a, b) =>
        (b.height || 0) - (a.height || 0) || (b.filesize || 0) - (a.filesize || 0)
    );
    const withSound = pickFourVideoWithSoundRows(deduped);
    rows = withSound.map((r) => ({ ...r, label: labelCombinedRow(r) }));

    const silent = pickOneMediumSilent(videoOnly, rows);
    if (silent) {
      rows.push({ ...silent, label: labelSilentRow(silent) });
    }
  } else {
    const allVideo = dedupeByHeightPreferContainer(mapped.filter((f) => f.hasVideo));
    allVideo.sort((a, b) => (b.height || 0) - (a.height || 0));
    rows = allVideo.slice(0, 10).map((r) => ({
      ...r,
      label: r.hasAudio
        ? `${r.height ? `${r.height}p` : "Best"} · ${containerFriendlyName(r.ext)} — video with sound`
        : `${r.height ? `${r.height}p` : "HD"} · ${containerFriendlyName(r.ext)} — picture without sound`,
    }));
  }

  return rows;
}

function audioFormatRank(ext) {
  const e = String(ext || "").toLowerCase();
  const order = { m4a: 0, aac: 1, mp3: 2, opus: 3, ogg: 4, webm: 5 };
  return order[e] !== undefined ? order[e] : 50;
}

function bestAudioFormat(fullMapped) {
  const audio = fullMapped.filter((f) => f.hasAudio && !f.hasVideo);
  if (!audio.length) return null;
  return audio.sort((a, b) => {
    const ra = audioFormatRank(a.ext);
    const rb = audioFormatRank(b.ext);
    if (ra !== rb) return ra - rb;
    return (b.filesize || 0) - (a.filesize || 0);
  })[0];
}

function audioButtonLabel(audioRow) {
  if (!audioRow) return null;
  const e = String(audioRow.ext || "").toLowerCase();
  if (e === "m4a" || e === "aac") return "🎵 Download sound only (M4A / AAC)";
  if (e === "mp3") return "🎵 Download sound only (MP3)";
  if (e === "webm" || e === "opus")
    return "🎵 Download sound only (M4A-style — best quality from YouTube)";
  return "🎵 Download sound only (M4A or MP3-style)";
}

function containerHintFromFormats(formats, fallbackExt) {
  const first = formats.find((f) => f.hasVideo && f.hasAudio) || formats[0];
  const name = first ? containerFriendlyName(first.ext) : containerFriendlyName(fallbackExt);
  return `Save format: ${name}`;
}

function ytDlpErrorText(error) {
  if (!error) return "";
  if (typeof error.stderr === "string" && error.stderr.trim()) return error.stderr;
  if (typeof error.stdout === "string" && error.stdout.includes("ERROR")) return error.stdout;
  return String(error.message || error);
}

/** Cleaner URL + stable path for yt-dlp (tracking params often confuse APIs). */
function normalizeInstagramUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return raw;
  let u;
  try {
    u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return raw;
  }
  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  if (host !== "instagram.com") return raw;

  const path = u.pathname.replace(/\/+$/, "") || "/";
  const share = path.match(/^\/share\/(reels?|p|tv)\/([^/?#]+)/i);
  if (share) {
    const k = share[1].toLowerCase();
    const kind = k.startsWith("reel") ? "reel" : k === "tv" ? "tv" : "p";
    return `https://www.instagram.com/${kind}/${share[2]}/`;
  }
  const m = path.match(/^\/(reel|reels|p|tv)\/([^/?#]+)/i);
  if (m) {
    const kind = m[1].toLowerCase() === "reels" ? "reel" : m[1].toLowerCase();
    return `https://www.instagram.com/${kind}/${m[2]}/`;
  }
  if (/^\/stories\//i.test(path)) {
    return `https://www.instagram.com${path}`;
  }
  const m2 = path.match(/^\/[^/]+\/(reel|reels)\/([^/?#]+)/i);
  if (m2) {
    return `https://www.instagram.com/reel/${m2[2]}/`;
  }
  return `https://www.instagram.com${path}`;
}

function cookiesFileFromEnv() {
  const p = process.env.FETCHCLIP_COOKIES_FILE || process.env.YTDLP_COOKIES_FILE;
  if (!p) return null;
  try {
    if (fs.existsSync(p)) return p;
  } catch (_) {}
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureHttpUrl(u) {
  const t = String(u || "").trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function isYoutubeUrl(input) {
  const raw = String(input || "").trim();
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const h = u.hostname.replace(/^www\./i, "").toLowerCase();
    return h === "youtu.be" || h.endsWith("youtube.com");
  } catch {
    return false;
  }
}

function commonYtDlpBase(cookiePath, referer, extra = {}) {
  const o = {
    dumpSingleJson: true,
    noWarnings: true,
    noPlaylist: true,
    skipDownload: true,
    preferFreeFormats: false,
    noCheckCertificate: true,
    noColor: true,
    referer,
    quiet: true,
    retries: 6,
    fragmentRetries: 6,
    extractorRetries: 4,
    legacyServerConnect: true,
    ...extra,
  };
  if (cookiePath) o.cookies = cookiePath;
  return o;
}

/** Merge format lists from several YouTube player clients so more “video+audio” heights appear. */
async function fetchYoutubeWithMergedFormats(trimmed, cookiePath) {
  const baseReferer = ensureHttpUrl(trimmed);
  const strategies = [
    {},
    { extractorArgs: "youtube:player_client=android" },
    { extractorArgs: "youtube:player_client=web" },
  ];

  let meta = null;
  const mergedByUrl = new Map();
  let lastErr;

  for (const s of strategies) {
    try {
      const info = await ytdlp(
        trimmed,
        commonYtDlpBase(cookiePath, baseReferer, s)
      );
      if (!meta) meta = { ...info };
      for (const f of info.formats || []) {
        if (!f.url) continue;
        const prev = mergedByUrl.get(f.url);
        const fs = f.filesize || f.filesize_approx || 0;
        const ps = prev ? prev.filesize || prev.filesize_approx || 0 : -1;
        if (!prev || fs > ps) mergedByUrl.set(f.url, f);
      }
    } catch (e) {
      lastErr = e;
    }
  }

  if (!meta) throw lastErr;
  meta.formats = Array.from(mergedByUrl.values());
  return meta;
}

/** Instagram: datacenter + Meta quirks — normalize URL, cookies, retries, mobile UA. YouTube: merged clients. */
async function fetchMediaWithYtDlp(originalUrl) {
  const trimmed = ensureHttpUrl(String(originalUrl || "").trim());
  const cookiePath = cookiesFileFromEnv();

  if (isYoutubeUrl(trimmed)) {
    return await fetchYoutubeWithMergedFormats(trimmed, cookiePath);
  }

  const isIg = /instagram\.com/i.test(trimmed);
  const tryUrls = isIg
    ? Array.from(new Set([normalizeInstagramUrl(trimmed), trimmed]))
    : [trimmed];

  const variants = [
    { userAgent: null },
    { userAgent: MOBILE_SAFARI_UA },
  ];

  let lastErr;

  for (const targetUrl of tryUrls) {
    const isTargetIg = /instagram\.com/i.test(targetUrl);
    for (const variant of variants) {
      const base = commonYtDlpBase(
        cookiePath,
        isTargetIg ? "https://www.instagram.com/" : targetUrl,
        variant.userAgent ? { userAgent: variant.userAgent } : {}
      );

      const innerAttempts = isTargetIg ? 2 : 1;
      for (let a = 0; a < innerAttempts; a++) {
        try {
          return await ytdlp(targetUrl, base);
        } catch (e) {
          lastErr = e;
          if (a + 1 < innerAttempts) await sleep(1600);
        }
      }
    }
  }
  throw lastErr;
}

function humanizeYtDlpError(raw, urlStr) {
  const m = String(raw || "").toLowerCase();
  let host = "";
  try {
    host = new URL(urlStr).hostname.toLowerCase();
  } catch (_) {}

  if (host.includes("instagram")) {
    if (
      m.includes("login required") ||
      m.includes("rate-limit") ||
      m.includes("rate limit") ||
      m.includes("requested content is not available")
    ) {
      return "Instagram is limiting automated access right now. Please wait a minute and tap Fetch again — this often resolves on a retry.";
    }
    if (
      m.includes("private") ||
      m.includes("sign in") ||
      m.includes("log in") ||
      m.includes("only available for registered") ||
      m.includes("follow this account")
    ) {
      return "Instagram closed this clip to automated downloads from our side (sign-in or follow wall). Trying again later often works.";
    }
    if (m.includes("401") || m.includes("403") || m.includes("blocked")) {
      return "Instagram briefly refused the connection. Please try again in a minute — heavy traffic on their side causes this.";
    }
    if (m.includes("story") && (m.includes("unavailable") || m.includes("expired"))) {
      return "Stories disappear quickly on Instagram. Try a Reel or a regular video post instead.";
    }
    if (m.includes("no video in this post")) {
      return "That Instagram page is a photo carousel or has no video file attached.";
    }
    if (m.includes("no video formats") || m.includes("unable to download")) {
      return "Instagram did not send a video file in this response. Please try Fetch again in a little while.";
    }
    return "Instagram did not complete the request this time. Please try again shortly — their servers often throttle or pause automated downloads.";
  }

  if (host.includes("tiktok")) {
    if (m.includes("private")) return "This TikTok is private. Only public videos can be saved.";
    return "TikTok did not allow a download for this link. Check the clip is still public.";
  }

  if (host.includes("youtube") || host.includes("youtu.be")) {
    if (m.includes("private video")) return "This YouTube video is private.";
    if (m.includes("members only")) return "This YouTube video is for channel members only.";
    return "YouTube did not return this video. Open the link in a browser to confirm it still plays.";
  }

  if (host.includes("facebook") || host.includes("fb.watch")) {
    return "Facebook did not return this video. Public posts work best; try copying the link again.";
  }

  if (m.includes("404") || m.includes("not found")) {
    return "That page was not found. The clip may have been deleted.";
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return "The request timed out. Check your connection and try again.";
  }
  return "We could not load this clip right now. Please try again in a moment.";
}

app.get(["/contact", "/contact.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "../public/pages/contact.html"));
});

app.post("/api/fetch-media", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ message: "Paste a video link first." });
  }

  try {
    const info = await fetchMediaWithYtDlp(url);

    const rawFormats = Array.isArray(info.formats) ? info.formats : [];
    const fullMapped = rawFormats
      .filter((f) => f.url && f.ext && (f.vcodec !== "none" || f.acodec !== "none"))
      .map(mapFormatRow);
    const audioOnly = bestAudioFormat(fullMapped);

    let formats = buildPublicFormats(info);

    if (!formats.length && info.url) {
      formats = [
        {
          quality: "default",
          label: "Best available — video with sound",
          ext: info.ext || "mp4",
          hasVideo: true,
          hasAudio: true,
          height: info.height || null,
          url: info.url,
          download_url: info.url,
          filesize: null,
        },
      ];
    }

    if (!formats.length) {
      const message = /instagram\.com/i.test(url)
        ? "Instagram returned details but no downloadable video stream this time. Please try Fetch again in a minute."
        : "No downloadable stream was found for this link yet. Please try again shortly.";
      return res.status(422).json({ message });
    }

    const bestCombinedVideo = formats.find((f) => f.hasAudio && f.hasVideo) || null;
    const bestVideo =
      bestCombinedVideo || formats.find((f) => f.hasVideo) || formats[0] || null;
    const isVideoOnly = Boolean(bestVideo && bestVideo.hasVideo && !bestVideo.hasAudio);
    const separateAudioAvailable = Boolean(isVideoOnly && audioOnly);

    return res.json({
      title: info.title || "Untitled Media",
      thumbnail: info.thumbnail || null,
      duration: info.duration || null,
      ext: info.ext || (bestVideo && bestVideo.ext) || "mp4",
      uploader: info.uploader || info.uploader_id || null,
      view_count: info.view_count || null,
      like_count: info.like_count || null,
      upload_date: parseUploadDate(info.upload_date) || null,
      webpage_url: info.webpage_url || info.original_url || url,
      url: bestVideo?.download_url || info.url || null,
      has_audio: Boolean(bestVideo?.hasAudio),
      has_video: Boolean(bestVideo?.hasVideo),
      formats,
      container_hint: containerHintFromFormats(formats, info.ext),
      audio_url: audioOnly?.download_url || null,
      audio_ext: audioOnly?.ext || null,
      audio_button_label: audioButtonLabel(audioOnly),
      warning: separateAudioAvailable
        ? "One of the choices is picture-only (no sound in that file). Use “Download sound only” if you need the audio."
        : null,
    });
  } catch (error) {
    const raw = ytDlpErrorText(error);
    console.error("/api/fetch-media error", raw);
    const message = humanizeYtDlpError(raw, url);
    return res.status(422).json({ message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FetchClip backend listening on http://localhost:${PORT}`);
});

module.exports = app;
