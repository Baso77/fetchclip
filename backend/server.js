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

function parseUploadDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function buildFormats(info) {
  const formats = Array.isArray(info.formats) ? info.formats : [];
  return formats
    .filter((f) => f.url && f.ext && (f.vcodec !== "none" || f.acodec !== "none"))
    .map((f) => {
      const hasAudio = Boolean(f.acodec && f.acodec !== "none");
      const hasVideo = Boolean(f.vcodec && f.vcodec !== "none");
      let label = f.format_note ? `${f.format_note} · ${f.ext}` : f.format || `${f.ext}`;
      if (!hasAudio) label += " (video only)";
      if (!hasVideo) label += " (audio only)";
      return {
        quality: f.format_id || f.format_note || f.format || "HD",
        label,
        ext: hasVideo ? f.ext : (f.ext === "m4a" ? "mp3" : f.ext),
        url: f.url,
        download_url: f.url,
        acodec: f.acodec,
        vcodec: f.vcodec,
        hasAudio,
        hasVideo,
        filesize: f.filesize || f.filesize_approx || null,
      };
    })
    .sort((a, b) => {
      const aScore = (a.hasAudio && a.hasVideo) ? 3 : (a.hasVideo || a.hasAudio ? 2 : 1);
      const bScore = (b.hasAudio && b.hasVideo) ? 3 : (b.hasVideo || b.hasAudio ? 2 : 1);
      if (aScore !== bScore) return bScore - aScore;
      return (b.filesize || 0) - (a.filesize || 0);
    });
}

app.get(["/contact", "/contact.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "../public/pages/contact.html"));
});

app.post("/api/fetch-media", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      skipDownload: true,
      preferFreeFormats: true,
      noCheckCertificate: true,
      noColor: true,
      referer: url,
      quiet: true,
    });

    const formats = buildFormats(info);
    const bestCombinedVideo = formats.find((f) => f.hasAudio && f.hasVideo) || null;
    const bestVideo = bestCombinedVideo || formats.find((f) => f.hasVideo) || formats[0] || null;
    const audioOnly = formats.find((f) => f.hasAudio && !f.hasVideo) || null;
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
      audio_url: audioOnly?.download_url || null,
      warning: separateAudioAvailable
        ? 'This source provides separate audio and video streams. Download the audio file with the button below for sound.'
        : null,
    });
  } catch (error) {
    console.error("/api/fetch-media error", error?.message || error);
    return res.status(500).json({ error: `Media extraction failed: ${error?.message || "Unknown error"}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FetchClip backend listening on http://localhost:${PORT}`);
});
