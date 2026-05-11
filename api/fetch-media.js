export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Platform detection
    let platform = null;
    try {
      const host = new URL(url).hostname.replace('www.', '');
      if (host.includes('instagram.com')) platform = 'instagram';
      else if (host.includes('tiktok.com')) platform = 'tiktok';
      else if (host.includes('youtube.com') || host.includes('youtu.be')) platform = 'youtube';
      else if (host.includes('facebook.com') || host.includes('fb.watch')) platform = 'facebook';
      else if (host.includes('twitter.com') || host.includes('x.com')) platform = 'twitter';
      else if (host.includes('pinterest.com')) platform = 'pinterest';
    } catch (e) {
      console.error('[PLATFORM DETECTION ERROR]', e);
    }

    if (!platform) {
      return res.status(400).json({ error: 'Unsupported platform' });
    }

    // Mock response - Replace with real media fetcher (yt-dlp, instagrapi, etc.)
    const mockData = {
      success: true,
      url,
      platform,
      title: 'Sample Video Title',
      duration: 45,
      uploader: 'Sample Creator',
      view_count: 15000,
      like_count: 2500,
      upload_date: '20250511',
      thumbnail: 'https://via.placeholder.com/320x180?text=Video+Thumbnail',
      webpage_url: url,
      ext: 'mp4',
      formats: [
        {
          quality: 'HD',
          label: 'HD (Best Quality)',
          ext: 'mp4',
          url: 'https://via.placeholder.com/sample-hd.mp4',
          download_url: 'https://via.placeholder.com/sample-hd.mp4',
        },
        {
          quality: 'SD',
          label: 'SD (Standard Quality)',
          ext: 'mp4',
          url: 'https://via.placeholder.com/sample-sd.mp4',
          download_url: 'https://via.placeholder.com/sample-sd.mp4',
        },
      ],
      audio_url: 'https://via.placeholder.com/sample-audio.mp3',
    };

    res.status(200).json(mockData);
  } catch (err) {
    console.error('[FETCH ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch media', message: err.message });
  }
}
