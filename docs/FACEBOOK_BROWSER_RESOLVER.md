# Facebook Browser Resolver

This project now has a third Facebook ID fallback for vanity URLs such as:

- `https://www.facebook.com/wowsai.wowsai/`
- `https://www.facebook.com/some-public-profile/`

The resolver order is:

1. Parse numeric IDs directly from the URL.
2. Fetch public Facebook HTML and public embed pages.
3. Open the public page in a real browser and extract IDs from `fb://...` metadata.

## Why this exists

Some Facebook public URLs do not expose a numeric ID in the raw URL or in the server-side HTML returned to plain `fetch()`.

For example, the browser-rendered page for `https://www.facebook.com/wowsai.wowsai/` exposes:

```html
<meta property="al:android:url" content="fb://profile/100034276485915">
```

That is the value the browser fallback extracts.

## Environment variables

Add these values to your local `.env` or deployment environment:

```env
FACEBOOK_BROWSER_RESOLVER_ENABLED=true
FACEBOOK_BROWSER_EXECUTABLE_PATH=
FACEBOOK_BROWSER_TIMEOUT_MS=45000
FACEBOOK_BROWSER_HEADLESS=true
```

Meaning:

- `FACEBOOK_BROWSER_RESOLVER_ENABLED`
  - Default: `true`
  - Set to `false` to disable the browser fallback completely.
- `FACEBOOK_BROWSER_EXECUTABLE_PATH`
  - Optional explicit browser path.
  - If empty, the server tries common Edge/Chrome/Chromium paths automatically.
- `FACEBOOK_BROWSER_TIMEOUT_MS`
  - Default: `45000`
  - Page load timeout in milliseconds.
- `FACEBOOK_BROWSER_HEADLESS`
  - Default: `true`
  - Set to `false` only for debugging.

## Supported browser paths

Auto-detection currently checks:

- Windows:
  - `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
  - `C:\Program Files\Microsoft\Edge\Application\msedge.exe`
  - `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Linux:
  - `/usr/bin/microsoft-edge`
  - `/usr/bin/microsoft-edge-stable`
  - `/usr/bin/google-chrome`
  - `/usr/bin/google-chrome-stable`
  - `/usr/bin/chromium`
  - `/usr/bin/chromium-browser`
- macOS:
  - `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`
  - `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

## Docker deployment

`Dockerfile.api` now installs:

- runtime Node dependencies via `npm ci --omit=dev`
- Alpine Chromium via `apk add`

`docker-compose.yml` now passes the browser-resolver environment variables into the API container.

Default container browser path:

```env
FACEBOOK_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

If your base image exposes Chromium at `/usr/bin/chromium`, override the path in your real `.env`.

## Notes

- This fallback is slower than pure URL parsing and plain HTML fetches.
- It only runs after the cheaper fallbacks fail.
- It is intended for public Facebook pages only.
- If no browser binary is available, the browser fallback is skipped automatically.
