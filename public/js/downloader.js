/**
 * FetchClip — Downloader Engine
 * LIVE: Supabase Edge Function "fetch-media"
 * Project: Downloader (ndmbkwxisdzfzptejxzp) — ap-northeast-1
 */

// ============================================================
// LOCAL / REMOTE API ENDPOINTS
// ============================================================
const EDGE_BASE     = 'https://ndmbkwxisdzfzptejxzp.supabase.co/functions/v1';
const API_FETCH     = '/api/fetch-media';
const API_LOG       = `${EDGE_BASE}/fetch-media/log`;
const API_CONTACT   = `${EDGE_BASE}/fetch-media/contact`;
const SUPA_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbWJrd3hpc2R6ZnpwdGVqeHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTIyOTcsImV4cCI6MjA5Mzk2ODI5N30.roRS52ID1J3ubsqJ7aeCGPwi8vq5G-wIgga90SzP6NY';

// expose for contact form used in main.js
window.FETCHCLIP_API_CONTACT = API_CONTACT;
window.FETCHCLIP_SUPA_KEY    = SUPA_KEY;

let currentMediaData = null;
let selectedQuality  = null;

// ============================================================
// PLATFORM DETECTION
// ============================================================
function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (host.includes('instagram.com'))                            return 'instagram';
    if (host.includes('tiktok.com'))                               return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('facebook.com') || host.includes('fb.watch'))return 'facebook';
    if (host.includes('twitter.com')  || host.includes('x.com'))   return 'twitter';
    if (host.includes('pinterest.com'))                            return 'pinterest';
    return null;
  } catch { return null; }
}

function getPlatformLabel(p) {
  return { instagram:'📸 Instagram', tiktok:'🎵 TikTok', youtube:'▶️ YouTube',
           facebook:'📘 Facebook', twitter:'🐦 Twitter/X', pinterest:'📌 Pinterest' }[p] || '🌐 Video';
}

// ============================================================
// MAIN HANDLER — bound to "Fetch Media" button
// ============================================================
async function handleFetch() {
  const input = document.getElementById('urlInput');
  const url   = input?.value?.trim();

  clearError();
  clearPreview();

  if (!url)                     return showError('Please paste a video URL first.'),  input?.focus();
  if (!isValidUrl(url))         return showError("Doesn't look like a valid URL — make sure to include https://");
  if (!detectPlatform(url))     return showError('Unsupported platform. Supported: Instagram, TikTok, YouTube, Facebook, Twitter/X, Pinterest.');

  const platform = detectPlatform(url);
  setBtnState(true);
  setLoading(true, `Fetching ${getPlatformLabel(platform)} media…`);

  try {
    const result = await callEdge(url);
    if (result?.error) throw new Error(result.message || 'Media fetch failed.');

    currentMediaData = result;
    setLoading(false);
    renderPreview(result, platform);

  } catch (err) {
    setLoading(false);
    handleFetchError(err);
  } finally {
    setBtnState(false);
  }
}

// ============================================================
// EDGE FUNCTION CALL
// ============================================================
async function callEdge(url) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 35000);
  try {
    const res  = await fetch(API_FETCH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPA_KEY}` },
      body: JSON.stringify({ url }),
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  } catch (e) {
    clearTimeout(tid);
    if (e.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    throw e;
  }
}

// ============================================================
// RENDER PREVIEW CARD
// ============================================================
function renderPreview(data, platform) {
  const $ = id => document.getElementById(id);
  $('previewPlatform').textContent  = getPlatformLabel(platform);
  $('previewMeta').textContent      = data.duration ? formatDuration(data.duration) : '–';
  $('previewTitle').textContent     = data.title || 'Untitled Media';

  // Stat chips
  const chips = [];
  if (data.uploader)    chips.push('👤 ' + truncate(data.uploader, 22));
  if (data.view_count)  chips.push('👁 ' + formatNumber(data.view_count));
  if (data.like_count)  chips.push('❤️ ' + formatNumber(data.like_count));
  if (data.upload_date) chips.push('📅 ' + formatDate(data.upload_date));
  if (data.ext)         chips.push(data.ext.toUpperCase());
  $('previewStats').innerHTML = chips.map(c => `<span class="stat-tag">${c}</span>`).join('');

  // Thumbnail + play overlay
  const wrap = $('previewMediaWrap');
  wrap.innerHTML = '';
  if (data.thumbnail) {
    const img = document.createElement('img');
    img.src = data.thumbnail;
    img.alt = data.title || 'Preview';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    img.onerror = () => { img.style.display='none'; };

    const play = document.createElement('div');
    play.style.cssText = 'position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.18);cursor:pointer;transition:background .2s;';
    play.innerHTML = '<span style="font-size:3rem;filter:drop-shadow(0 2px 10px rgba(0,0,0,.7))">▶️</span>';
    play.onmouseenter = () => play.style.background = 'rgba(0,0,0,0.36)';
    play.onmouseleave = () => play.style.background = 'rgba(0,0,0,0.18)';

    // Prefer a format that includes BOTH video + audio for preview playback.
    const bestPreviewFormat = data.formats?.find(f => f?.hasVideo && f?.hasAudio) ||
                               data.formats?.find(f => f?.hasAudio) ||
                               data.formats?.[0];
    const bestPreviewUrl = bestPreviewFormat?.url || data.url;

    if (bestPreviewUrl) {
      play.onclick = () => {
        wrap.innerHTML = '';
        const v = document.createElement('video');
        v.src = bestPreviewUrl;

        v.controls = true;

        // Treat this as user-initiated playback (we're inside ▶️ click).
        v.autoplay = true;

        // Force unmuted state on the video element (user-gesture from ▶️ click).
        v.defaultMuted = false;
        v.muted = false;
        v.volume = 1;

        v.playsinline = true;
        v.preload = 'metadata';

        if (data.thumbnail) v.poster = data.thumbnail;
        v.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000;';
        wrap.appendChild(v);

        // Start playback once the browser has something playable.
        v.load();
        v.addEventListener('canplay', () => {
          v.muted = false;
          v.volume = 1;
          v.play().catch(() => { /* ignore */ });
        }, { once: true });

        // Extra safety: after metadata loads, re-apply volume/mute state.
        v.addEventListener('loadedmetadata', () => {
          v.muted = false;
          v.volume = 1;
        }, { once: true });
      };
    }
    wrap.appendChild(img);
    wrap.appendChild(play);
  } else {
    wrap.innerHTML = '<div style="color:#555570;text-align:center;font-size:2.4rem;padding:20px;">🎬<br/><span style="font-size:.75rem;font-family:var(--font-body);">No preview</span></div>';
  }

  // Quality options
  const formats = data.formats?.length
    ? data.formats
    : [{ quality:'HD', label:'HD (Best)', ext: data.ext||'mp4', url: data.url, download_url: data.url }];

  $('qualityOptions').innerHTML = formats.map((f,i) =>
    `<button class="quality-btn ${i===0?'active':''}" onclick="selectQuality(this,'${esc(f.quality||'HD')}',${i})">${esc(f.label||f.quality||'HD')}</button>`
  ).join('');
  selectedQuality = formats[0]?.quality || 'HD';

  const firstFormat = formats[0] || {};
  const primaryText = firstFormat.hasVideo && firstFormat.hasAudio
    ? `⬇️ Download ${esc(firstFormat.label || 'HD')} Video`
    : firstFormat.hasVideo
      ? `⬇️ Download ${esc(firstFormat.label || 'HD')} Video`
      : `⬇️ Download ${esc(firstFormat.label || 'HD')} Audio`;

  // Download buttons
  $('downloadActions').innerHTML = `
    <button class="download-btn download-btn-primary" id="dlPrimary" onclick="triggerDownload(0)">
      ${primaryText}
    </button>
    ${data.audio_url ? `<button class="download-btn download-btn-secondary" onclick="triggerDownloadAudio()">🎵 Download Audio</button>` : ''}
    ${data.thumbnail
      ? `<button class="download-btn download-btn-secondary" onclick="downloadThumbnail()">🖼️ Download Thumbnail</button>`
      : ''}
  `;

  const previewNote = $('previewNote');
  if (previewNote) {
    if (data.warning) {
      previewNote.textContent = `⚠️ ${data.warning}`;
      previewNote.classList.remove('hidden');
    } else if (data.has_audio === false) {
      previewNote.textContent = '🎧 Note: The chosen download does not include audio. Use the audio download button if available.';
      previewNote.classList.remove('hidden');
    } else {
      previewNote.textContent = '';
      previewNote.classList.add('hidden');
    }
  }

  $('previewCard').classList.remove('hidden');
  setTimeout(() => $('previewCard').scrollIntoView({ behavior:'smooth', block:'nearest' }), 80);

  // Log fetch to Supabase analytics
  logEvent({ url: data.webpage_url||'', platform, title: data.title||'', action:'fetch' });
}

// ============================================================
// DOWNLOAD TRIGGER
// ============================================================

function triggerDownload(idx) {
  if (!currentMediaData) return;
  const formats = currentMediaData.formats || [];
  const fmt     = formats[idx] || formats[0];

  const hasAudio = Boolean(fmt?.hasAudio);
  const dlUrl    = fmt?.download_url || fmt?.url || currentMediaData.url;
  if (!dlUrl) return showError('No download URL available. Please fetch again.');

  // If the user picked a video-only stream, downloading it will always sound muted.
  // If separate audio exists, block the main download and instruct the user.
  if (!hasAudio && currentMediaData?.audio_url) {
    showError('This selected quality is video-only (muted). Use “Download Audio” for sound.');
    showToast('🎧 Pick “Download Audio” for sound');
    logEvent({
      url: currentMediaData.webpage_url || '',
      platform: currentMediaData.platform || '',
      quality: fmt?.quality || 'HD',
      action: 'blocked_video_only_download'
    });
    return;
  }

  startDownload(dlUrl, getFilename(currentMediaData, fmt));
  showToast('⬇️ Download started!');
  logEvent({
    url: currentMediaData.webpage_url || '',
    platform: currentMediaData.platform || '',
    quality: fmt?.quality || 'HD',
    action: 'download'
  });
}

function triggerDownloadAudio() {
  if (!currentMediaData?.audio_url) return;
  startDownload(currentMediaData.audio_url, getFilename(currentMediaData, { ext:'mp3' }));
  showToast('🎵 Audio download started!');
}

function downloadThumbnail() {
  if (!currentMediaData?.thumbnail) return;
  startDownload(currentMediaData.thumbnail, 'fetchclip-thumbnail.jpg');
  showToast('🖼️ Thumbnail saved!');
}

function startDownload(url, filename) {
  const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 1000);
}


function selectQuality(btn, quality, idx) {
  document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedQuality = quality;

  const dlBtn = document.getElementById('dlPrimary');
  if (!dlBtn) return;

  const fmt = currentMediaData?.formats?.[idx];
  const hasVideo = Boolean(fmt?.hasVideo);
  const hasAudio = Boolean(fmt?.hasAudio);

  dlBtn.onclick = () => triggerDownload(idx);

  if (hasVideo && hasAudio) {
    dlBtn.innerHTML = `⬇️ Download ${esc(fmt?.label || quality)}`;
  } else if (hasVideo && !hasAudio) {
    dlBtn.innerHTML = `⬇️ Download ${esc(fmt?.label || quality)} (muted)`;
  } else if (!hasVideo && hasAudio) {
    dlBtn.innerHTML = `⬇️ Download ${esc(fmt?.label || quality)} (audio)`;
  } else {
    dlBtn.innerHTML = `⬇️ Download ${esc(fmt?.label || quality)}`;
  }
}

// ============================================================
// SUPABASE LOGGING (non-blocking)
// ============================================================
async function logEvent(payload) {
  try {
    await fetch(API_LOG, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${SUPA_KEY}` },
      body: JSON.stringify(payload),
    });
  } catch { /* non-critical */ }
}

// ============================================================
// UI STATE HELPERS
// ============================================================
function setLoading(show, text) {
  const el = document.getElementById('loadingState');
  if (!el) return;
  show ? el.classList.remove('hidden') : el.classList.add('hidden');
  if (text) { const t = document.getElementById('loadingText'); if(t) t.textContent = text; }
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
  m.textContent = msg;  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3200);
}

// ============================================================
// PURE UTILITIES
// ============================================================
function isValidUrl(s)     { try { new URL(s); return true; } catch { return false; } }
function truncate(s, n)    { return s.length > n ? s.slice(0, n) + '…' : s; }
function esc(s)            { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDuration(s) { if (!s||isNaN(s)) return ''; const m=Math.floor(s/60),sec=Math.floor(s%60); return `${m}:${sec.toString().padStart(2,'0')}`; }
function formatNumber(n)   { if (!n) return ''; if (n>=1e6) return (n/1e6).toFixed(1)+'M'; if (n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n); }
function formatDate(d)     { if (!d) return ''; const s=String(d); return s.length===8 ? `${s.slice(6)}.${s.slice(4,6)}.${s.slice(0,4)}` : s; }
function getFilename(data, fmt) {
  const t = (data.title||'fetchclip-video').replace(/[^a-zA-Z0-9_\- ]/g,'').trim().replace(/\s+/g,'-').slice(0,60);
  return `${t}.${fmt?.ext||data.ext||'mp4'}`;
}
function handleFetchError(err) {
  const m = err?.message || '';
  if (m.includes('private')||m.includes('login'))          return showError('This content is private. FetchClip can only download public videos.');
  if (m.includes('unavailable')||m.includes('removed'))    return showError('This video is unavailable or has been removed by the platform.');
  if (m.includes('timed out')||m.includes('timeout'))      return showError('Request timed out. Check your internet connection and try again.');
  if (m.includes('rate')||m.includes('429'))               return showError('Too many requests. Please wait a moment and try again.');
  if (m.includes('Unsupported')||m.includes('unsupported'))return showError('This URL format is not yet supported.');
  showError(m || 'Failed to fetch media. Check the URL and try again.');
}
