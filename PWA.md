# PWA.md — Progressive Web App Specification

> **Precedence**: Higher precedence than framework migration and cosmetic preferences.  
> **Target Environments**: School Chromebooks, iOS Safari (Add to Home Screen), Android Chrome, Windows/macOS desktop browsers.

---

## 1. PWA Requirements

### 1.1 Offline Gameplay Resilience
QUEST: Kentucky is designed for school environments where internet connections can be intermittent or restricted.
- **Offline Solo Mode**: Players must be able to explore the hub, complete solo quest encounters, review concepts due in spaced repetition, and manage their inventory while completely offline.
- **Attempt Queueing**: When offline, question attempts and concept mastery updates are recorded locally in `IndexedDB` / `localStorage` and automatically synchronized with the Cloudflare Worker API once connectivity is restored.
- **Multiplayer Graceful Fallback**: If offline, multiplayer options (Co-op Dungeons and 1v1 Duels) display an informative offline badge and suggest solo practice.

### 1.2 Web App Manifest (`manifest.webmanifest`)
The manifest must be generated or served by `worker.js` with zero external raster dependencies:
- **`name`**: `"QUEST: Kentucky — Governor's Cup RPG"`
- **`short_name`**: `"QUEST: KY"`
- **`start_url`**: `"/"`
- **`display`**: `"standalone"`
- **`orientation`**: `"any"` (with responsive layout handling both portrait and landscape)
- **`theme_color`**: `"#0F172A"` (Slate 900)
- **`background_color`**: `"#0F172A"`
- **Icons**:
  - Provided via code-generated SVG Data URIs or procedural canvas icon export (`image/svg+xml` or `data:image/svg+xml,...`).
  - Sizes: `192x192` and `512x512` maskable icons.

### 1.3 Service Worker (`sw.js`)
- Served inline or as a dedicated route `/sw.js` by the Cloudflare Worker.
- **Caching Strategy**:
  - **Core Application Shell (HTML/CSS/JS)**: Stale-While-Revalidate or Cache-First with background update.
  - **Procedural Assets & Sound Synthesizers**: Cached permanently upon first load.
  - **API Progress Updates (`/api/answers`, `/api/progress`)**: Network-first with local fallback queue.
- **Update Protocol**:
  - Automatically notifies the UI via `controllerchange` when a new version of the app shell is activated.
  - Displays a subtle, non-intrusive "New Version Available — Tap to Refresh" banner.

---

## 2. PWA Verification Checklist

- [x] Web App Manifest loads with valid JSON and correct MIME type (`application/manifest+json`).
- [x] Service worker registers cleanly without console warnings.
- [x] Application functions completely offline when Network is disabled in DevTools.
- [x] Lighthouse PWA audit passes: Installable, Valid Manifest, Responsive Viewport, Safe HTTPS.
- [x] Viewport meta tag configured: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`.
