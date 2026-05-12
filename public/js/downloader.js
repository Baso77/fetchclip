/**
 * FetchClip — Downloader Engine v2.0
 * Supports: Instagram, TikTok, Facebook, Twitter/X, Pinterest
 * YouTube: Coming Soon
 */

// Get the backend URL from environment or use current origin
const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : window.location.origin;

const API_FETCH   = `${BACKEND_URL}/api/fetch-media`;
const API_LOG     = `${BACKEND_URL}/api/log`;
const API_CONTACT = `${BACKEND_URL}/api/contact`;
const SUPA_KEY    = ''; // No longer needed for local backend

window.FETCHCLIP_API_CONTACT = API_CONTACT;
window.FETCHCLIP_SUPA_KEY    = SUPA_KEY;

let currentMediaData = null;

// ── PLATFORM DETECTION ─────────────────────────────────────────
function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (host.includes('instagram.com'))                              return 'instagram';
    if (host.includes('tiktok.com'))                                return 'tiktok';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
    if (host.includes('twitter.com')  || host.includes('x.com'))    return 'twitter';
    if (host.includes('pinterest.com')|| host.includes('pin.it'))   return 'pinterest';
    // YouTube removed — coming soon
    if (host.includes('youtube.com')  || host.includes('youtu.be')) return 'youtube_disabled';
    return null;
  } catch { return null; }
}

function getPlatformLabel(p) {
  const map = {
    instagram: '📸 Instagram',
    tiktok:    '🎵 TikTok',
    facebook:  '📘 Facebook',
    twitter:   '🐦 Twitter/X',
    pinterest: '📌 Pinterest',
  };
  return map[p] || '🌐 Video';
}

function isValidUrl(s) {
  try { new URL(s); return true; } catch { return false; }
}

// ── MAIN HANDLER ───────────────────────────────────────────────
async function handleFetch() {
  const input = document.getElementById('urlInput');
  const url   = input?.value?.trim();

  clearError();
  clearPreview();

  if (!url)          return showError('Please paste a video URL first.'), input?.focus();
  if (!isValidUrl(url)) return showError('That doesn\'t look like a valid URL. Make sure it starts with https://');

  const platform = detectPlatform(url);

  // YouTube disabled message
  if (platform === 'youtube_disabled') {
    showError('⏳ YouTube downloading is coming soon! Stay tuned. For now, try Instagram, TikTok, Facebook, Twitter or Pinterest.');
    return;
  }

  if (!platform) {
    return showError('Unsupported platform. We support Instagram, TikTok, Facebook, Twitter/X and Pinterest.');
  }

  setBtnState(true);
  setLoading(true, `Fetching ${getPlatformLabel(platform)} media…`);

  try {
    const res = await fetch(API_FETCH, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.message || 'Failed to fetch media.');
    }

    currentMediaData = data;
    setLoading(false);
    renderPreview(data, platform);

  } catch (err) {
    setLoading(false);
    showError(err.message || 'Failed to fetch media. Check the URL and try again.');
  } finally {
    setBtnState(false);
  }
}

// ── RENDER PREVIEW ─────────────────────────────────────────────
function renderPreview(data, platform) {
  const $ = id => document.getElementById(id);

  $('previewPlatform').textContent = getPlatformLabel(platform);
  $('previewTitle').textContent    = data.title || 'Media Ready to Download';

  // ── THUMBNAIL / PREVIEW ──
  const wrap = $('previewMediaWrap');
  wrap.innerHTML = '';

  const thumbUrl = data.thumbnail || null;

  if (thumbUrl) {
    const img = document.createElement('img');
    img.src = thumbUrl;
    img.alt = data.title || 'Preview';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:10px;';
    img.onerror = () => {
      wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#555570;font-size:3rem;">🎬</div>';
    };
    wrap.appendChild(img);
  } else if (data.url) {
    // No thumbnail — show video player directly
    const v = document.createElement('video');
    v.src = data.url;
    v.controls = true;
    v.playsInline = true;
    v.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:10px;background:#000;';
    wrap.appendChild(v);
  } else {
    wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#555570;font-size:3rem;">🎬</div>';
  }

  // ── PICKER (carousel / slideshow) ──
  if (data.is_picker && data.formats?.length > 1) {
    $('previewMeta').textContent = `${data.formats.length} files`;
    renderPickerFormats(data);
  } else {
    $('previewMeta').textContent = data.ext ? data.ext.toUpperCase() : '';
    renderSingleFormats(data);
  }

  $('previewCard').classList.remove('hidden');
  setTimeout(() => $('previewCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);

  logEvent({ url: data.webpage_url || '', platform, title: data.title || '', action: 'fetch' });
}

// ── SINGLE FILE FORMATS ────────────────────────────────────────
function renderSingleFormats(data) {
  const $ = id => document.getElementById(id);

  // Quality buttons — always show Best quality
  const formats = data.formats?.length
    ? data.formats
    : [{ quality: 'Best', label: 'Best Quality', url: data.url, download_url: data.url, ext: data.ext || 'mp4' }];

  $('qualityOptions').innerHTML = formats.map((f, i) =>
    `<button class="quality-btn ${i === 0 ? 'active' : ''}" onclick="selectQuality(this, ${i})">
      ${esc(f.label || f.quality || 'Best')}
    </button>`
  ).join('');

  // Download actions
  let actions = '';

  // Main video download
  if (data.url || data.download_url) {
    actions += `
      <button class="download-btn download-btn-primary" id="dlPrimary" onclick="triggerDownload(0)">
        ⬇️ Download Video
      </button>`;
  }

  // Audio only button (separate)
  if (data.audio_url) {
    actions += `
      <button class="download-btn download-btn-secondary" onclick="triggerDownloadAudio()">
        🎵 Download Audio Only (MP3)
      </button>`;
  }

  // Thumbnail download
  if (data.thumbnail) {
    actions += `
      <button class="download-btn download-btn-secondary" onclick="downloadThumbnail()">
        🖼️ Download Thumbnail
      </button>`;
  }

  // WhatsApp share
  if (data.whatsapp_share) {
    actions += `
      <a href="${data.whatsapp_share}" target="_blank" rel="noopener"
         class="download-btn download-btn-secondary" style="text-decoration:none;">
        💬 Share via WhatsApp
      </a>`;
  }

  $('downloadActions').innerHTML = actions;
}

// ── PICKER FORMATS (Instagram carousel etc) ────────────────────
function renderPickerFormats(data) {
  const $ = id => document.getElementById(id);

  $('qualityOptions').innerHTML = data.formats.map((f, i) =>
    `<button class="quality-btn ${i === 0 ? 'active' : ''}" onclick="selectPickerItem(this, ${i})">
      ${esc(f.label || `File ${i + 1}`)}
    </button>`
  ).join('');

  let actions = `
    <button class="download-btn download-btn-primary" id="dlPrimary" onclick="triggerDownload(0)">
      ⬇️ Download File 1
    </button>
    <button class="download-btn download-btn-secondary" onclick="downloadAllPicker()">
      ⬇️ Download All Files (${data.formats.length})
    </button>`;

  if (data.thumbnail) {
    actions += `
      <button class="download-btn download-btn-secondary" onclick="downloadThumbnail()">
        🖼️ Download Thumbnail
      </button>`;
  }

  if (data.whatsapp_share) {
    actions += `
      <a href="${data.whatsapp_share}" target="_blank" rel="noopener"
         class="download-btn download-btn-secondary" style="text-decoration:none;">
        💬 Share via WhatsApp
      </a>`;
  }

  $('downloadActions').innerHTML = actions;
}

// ── DOWNLOAD TRIGGERS ──────────────────────────────────────────
function triggerDownload(idx) {
  if (!currentMediaData) return;

  const formats = currentMediaData.formats || [];
  const fmt     = formats[idx] || formats[0];
  const dlUrl   = fmt?.download_url || fmt?.url || currentMediaData.download_url || currentMediaData.url;

  if (!dlUrl) return showError('No download URL available. Please fetch again.');

  const ext      = fmt?.ext || currentMediaData.ext || 'mp4';
  const title    = (currentMediaData.title || 'fetchclip-video').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  const filename = `${title}.${ext}`;

  startDownload(dlUrl, filename);
  showToast('⬇️ Download started!');
  logEvent({ url: currentMediaData.webpage_url || '', platform: currentMediaData.platform || '', action: 'download' });
}

function triggerDownloadAudio() {
  if (!currentMediaData?.audio_url) return showError('No audio available for this media.');
  const title    = (currentMediaData.title || 'fetchclip-audio').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  startDownload(currentMediaData.audio_url, `${title}.mp3`);
  showToast('🎵 Audio download started!');
}

function downloadThumbnail() {
  if (!currentMediaData?.thumbnail) return showError('No thumbnail available.');
  const title = (currentMediaData.title || 'fetchclip-thumb').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  startDownload(currentMediaData.thumbnail, `${title}-thumbnail.jpg`);
  showToast('🖼️ Thumbnail saved!');
}

function downloadAllPicker() {
  if (!currentMediaData?.formats?.length) return;
  currentMediaData.formats.forEach((fmt, i) => {
    setTimeout(() => {
      const dlUrl = fmt.download_url || fmt.url;
      if (dlUrl) {
        const filename = `fetchclip-file-${i + 1}.${fmt.ext || 'mp4'}`;
        startDownload(dlUrl, filename);
      }
    }, i * 800);
  });
  showToast(`⬇️ Downloading all ${currentMediaData.formats.length} files!`);
}

function selectQuality(btn, idx) {
  document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const dlBtn = document.getElementById('dlPrimary');
  if (dlBtn) {
    dlBtn.onclick = () => triggerDownload(idx);
    const fmt = currentMediaData?.formats?.[idx];
    dlBtn.innerHTML = `⬇️ Download ${esc(fmt?.label || fmt?.quality || 'Video')}`;
  }
}

function selectPickerItem(btn, idx) {
  document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const fmt   = currentMediaData?.formats?.[idx];
  const dlBtn = document.getElementById('dlPrimary');
  if (dlBtn) {
    dlBtn.onclick = () => triggerDownload(idx);
    dlBtn.innerHTML = `⬇️ Download ${esc(fmt?.label || `File ${idx + 1}`)}`;
  }

  // Update preview thumbnail if picker item has thumb
  if (fmt?.thumb) {
    const wrap = document.getElementById('previewMediaWrap');
    const img  = wrap?.querySelector('img');
    if (img) img.src = fmt.thumb;
  }
}

function startDownload(url, filename) {
  const a = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.target   = '_blank';
  a.rel      = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 1000);
}

// ── LOGGING ────────────────────────────────────────────────────
async function logEvent(payload) {
  try {
    await fetch(API_LOG, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch { /* non-critical */ }
}

// ── UI STATE ───────────────────────────────────────────────────
function setLoading(show, text) {
  const el = document.getElementById('loadingState');
  if (!el) return;
  show ? el.classList.remove('hidden') : el.classList.add('hidden');
  if (text) {
    const t = document.getElementById('loadingText');
    if (t) t.textContent = text;
  }
}

function setBtnState(disabled) {
  const btn = document.getElementById('fetchBtn');
  if (!btn) return;
  btn.disabled = disabled;
  document.getElementById('fetchBtnText')?.classList.toggle('hidden', disabled);
  document.getElementById('fetchBtnSpinner')?.classList.toggle('hidden', !disabled);
}

function showError(msg) {
  const b = document.getElementById('errorBanner');
  const m = document.getElementById('errorMsg');
  if (b && m) { m.textContent = msg; b.classList.remove('hidden'); }
}

function clearError()   { document.getElementById('errorBanner')?.classList.add('hidden'); }
function dismissError() { clearError(); }

function clearPreview() {
  document.getElementById('previewCard')?.classList.add('hidden');
  currentMediaData = null;
}

function showToast(msg) {
  const t = document.getElementById('recentToast');
  const m = document.getElementById('toastMsg');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3500);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
