# FetchClip API Reference

## Base URL
- **Production:** `https://fetchclip.app/api`
- **Development:** `http://localhost:3000/api`

---

## Endpoints

### 1. Health Check
Check if API is running.

**Request:**
```bash
GET /api/health
```

**Response (200):**
```json
{
  "status": "ok",
  "message": "FetchClip API running",
  "timestamp": "2025-05-11T10:00:00.000Z"
}
```

---

### 2. Fetch Media
Fetch video information from supported platforms.

**Request:**
```bash
POST /api/fetch-media
Content-Type: application/json

{
  "url": "https://instagram.com/p/ABC123def/"
}
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Valid video URL from supported platform |

**Supported Platforms:**
- Instagram (Reels, Stories, Posts, IGTV)
- TikTok (Videos)
- YouTube (Videos, Shorts)
- Facebook (Videos)
- Twitter/X (Videos)
- Pinterest (Videos)

**Response (200):**
```json
{
  "success": true,
  "url": "https://instagram.com/p/ABC123def/",
  "platform": "instagram",
  "title": "Amazing Video Title",
  "duration": 45,
  "uploader": "creator_name",
  "view_count": 15000,
  "like_count": 2500,
  "upload_date": "20250511",
  "thumbnail": "https://...",
  "webpage_url": "https://instagram.com/p/ABC123def/",
  "ext": "mp4",
  "formats": [
    {
      "quality": "HD",
      "label": "HD (Best Quality)",
      "ext": "mp4",
      "url": "https://...",
      "download_url": "https://..."
    },
    {
      "quality": "SD",
      "label": "SD (Standard Quality)",
      "ext": "mp4",
      "url": "https://...",
      "download_url": "https://..."
    }
  ],
  "audio_url": "https://..."
}
```

**Response (400 - Bad Request):**
```json
{
  "error": "URL is required"
}
```

**Response (400 - Invalid URL):**
```json
{
  "error": "Invalid URL format"
}
```

**Response (400 - Unsupported Platform):**
```json
{
  "error": "Unsupported platform"
}
```

**Response (500 - Server Error):**
```json
{
  "error": "Failed to fetch media",
  "message": "Error details..."
}
```

---

### 3. Log Event
Log analytics events (fetch, download, quality selection).

**Request:**
```bash
POST /api/log
Content-Type: application/json

{
  "url": "https://instagram.com/p/ABC123def/",
  "platform": "instagram",
  "title": "Video Title",
  "action": "download",
  "quality": "HD"
}
```

**Body Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Video URL |
| `platform` | string | Yes | Platform name |
| `title` | string | No | Video title |
| `action` | string | No | `fetch` or `download` |
| `quality` | string | No | Quality selected (e.g., "HD", "SD") |

**Response (200):**
```json
{
  "success": true
}
```

**Response (400 - Missing Fields):**
```json
{
  "error": "Missing url or platform"
}
```

**Response (500 - Database Error):**
```json
{
  "error": "Failed to log event"
}
```

---

### 4. Contact Form
Submit contact message.

**Request:**
```bash
POST /api/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Bug Report",
  "message": "I found an issue with TikTok downloads..."
}
```

**Body Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Sender's name |
| `email` | string | Yes | Valid email address |
| `subject` | string | No | Message subject |
| `message` | string | Yes | Message content |

**Response (200):**
```json
{
  "success": true,
  "message": "Message saved successfully"
}
```

**Response (400 - Missing Fields):**
```json
{
  "error": "Missing required fields"
}
```

**Response (400 - Invalid Email):**
```json
{
  "error": "Invalid email format"
}
```

**Response (500 - Database Error):**
```json
{
  "error": "Failed to save message"
}
```

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 200 | Success | Request completed |
| 400 | Bad Request | Check request body parameters |
| 405 | Method Not Allowed | Use correct HTTP method (GET/POST) |
| 500 | Server Error | Check Vercel logs |
| CORS Error | Cross-Origin Request Blocked | Verify CORS headers are set |

---

## CORS Headers

All endpoints include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,OPTIONS,PATCH,DELETE,POST,PUT
Access-Control-Allow-Headers: X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization
```

---

## Rate Limiting

Currently no rate limiting. Future versions may implement:
- 100 requests per minute per IP
- 10 downloads per hour per IP

---

## Authentication

Public API - no authentication required. Sensitive operations (service-to-service) should use environment variables.

---

## Database Tables

### `downloads`
Analytics table for logging fetch/download events.

```sql
CREATE TABLE downloads (
  id bigserial PRIMARY KEY,
  url text,
  platform text,
  title text,
  action text DEFAULT 'fetch',  -- 'fetch' | 'download'
  quality text,
  ip_hash text,                 -- Hashed IP (privacy)
  created_at timestamptz DEFAULT now()
);
```

### `contact_messages`
Contact form submissions.

```sql
CREATE TABLE contact_messages (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### `media_cache`
Optional cache for repeated requests.

```sql
CREATE TABLE media_cache (
  id bigserial PRIMARY KEY,
  url_hash text UNIQUE NOT NULL,
  url text NOT NULL,
  platform text,
  title text,
  thumbnail text,
  duration integer,
  metadata jsonb,
  expires_at timestamptz DEFAULT (now() + interval '2 hours'),
  created_at timestamptz DEFAULT now()
);
```

---

## Example Requests

### cURL
```bash
# Fetch media
curl -X POST https://fetchclip.app/api/fetch-media \
  -H "Content-Type: application/json" \
  -d '{"url":"https://instagram.com/p/ABC123def/"}'

# Log event
curl -X POST https://fetchclip.app/api/log \
  -H "Content-Type: application/json" \
  -d '{"url":"https://instagram.com/p/ABC123def/","platform":"instagram","action":"download"}'

# Contact form
curl -X POST https://fetchclip.app/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","message":"Great tool!"}'
```

### JavaScript (Fetch API)
```javascript
// Fetch media
const response = await fetch('/api/fetch-media', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://instagram.com/p/ABC123def/' })
});
const data = await response.json();
console.log(data);

// Log event
await fetch('/api/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://instagram.com/p/ABC123def/',
    platform: 'instagram',
    action: 'download'
  })
});
```

### Python
```python
import requests

# Fetch media
url = 'https://fetchclip.app/api/fetch-media'
payload = {'url': 'https://instagram.com/p/ABC123def/'}
response = requests.post(url, json=payload)
print(response.json())

# Contact form
url = 'https://fetchclip.app/api/contact'
payload = {
    'name': 'John Doe',
    'email': 'john@example.com',
    'message': 'Great tool!'
}
response = requests.post(url, json=payload)
print(response.json())
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-05-11 | Fixed CORS errors, migrated to Vercel API routes |
| 1.0.0 | 2025-01-01 | Initial release with Supabase Edge Functions |

---

## Support

For API issues:
1. Check **Vercel Logs** in dashboard
2. Verify **environment variables** are set
3. Review this documentation
4. Check **Supabase Status** page

---

**Last Updated:** 2025-05-11
**Maintained by:** FetchClip Team
