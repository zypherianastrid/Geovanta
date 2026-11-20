# Desain Fitur: Google Gemini Web Custom MCP Connector (`/mcp` Streamable HTTP, OAuth 2.1 & Online/Localhost Bridge)

**Tanggal:** 2026-11-19  
**Status:** Disetujui Pengguna  
**Ukuran:** Small Change  

## 1. Tujuan & Latar Belakang (Intent & Why)
Pengguna ingin menghubungkan **Geovanta Vector Studio** langsung ke fitur **Terhubung ke server MCP (Custom Connected Apps)** di web **`gemini.google.com`** (sesuai dokumentasi Google Help `answer/17209137`) dalam dua skenario:
1. **Skenario 1 (Geovanta di Localhost):** Geovanta berjalan di `localhost:38291` dan dihubungkan ke `gemini.google.com` melalui HTTPS Tunnel (Cloudflare Tunnel / ngrok) maupun langsung melalui Gemini CLI / API / Antigravity lokal.
2. **Skenario 2 (Geovanta Web Online):** Geovanta di-deploy secara online (misal di Cloud Run / Railway / Render / VPS dengan `https://`), di mana pengguna membuka kanvas Geovanta di browser (`https://.../?ai=1`) dan menghubungkan URL `https://.../mcp` ke `gemini.google.com`.

## 2. Goals, Non-Goals, Anti-Goals
- **Goals:**
  - Menyediakan endpoint **Streamable HTTP `/mcp`** (`POST`, `GET`, `DELETE`, `OPTIONS`) sesuai spesifikasi MCP `2025-03-26` / `2024-11-05` dengan header `Mcp-Session-Id` dan dukungan batch maupun single JSON-RPC payload.
  - Menyediakan **Built-in OAuth 2.1 Server + Dynamic Client Registration (DCR)** di `scripts/mcp-server/index.js`:
    - `GET /.well-known/oauth-protected-resource`
    - `GET /.well-known/oauth-authorization-server` dan `GET /.well-known/openid-configuration`
    - `POST /oauth/register` (RFC 7591 Dynamic Client Registration agar kolom Client ID di Gemini Web opsional/otomatis)
    - `GET /oauth/authorize` & `POST /oauth/authorize` (Mendukung PKCE `S256` & `plain`, serta auto-approve atau layar persetujuan cepat ke `redirect_uri` Google seperti `https://vertexaisearch.cloud.google.com/oauth-redirect` atau callback Gemini)
    - `POST /oauth/token` (Menerbitkan `access_token` dan `refresh_token` untuk `authorization_code` dan `refresh_token` grant)
    - Kredensial OAuth statis default yang dapat dikonfigurasi via env (`GEOVANTA_OAUTH_CLIENT_ID` default `geovanta-gemini-client`, `GEOVANTA_OAUTH_CLIENT_SECRET` default `geovanta-gemini-secret`) untuk diisi di kolom **Client ID OAuth** dan **Rahasia klien OAuth** pada dialog `gemini.google.com`.
  - Mendukung protokol WebSocket aman (`wss://`) secara otomatis di `src/bridge/aiLiveConnector.tsx` ketika Geovanta Web Online dibuka melalui `https://`, serta mendukung bind `0.0.0.0` (atau `process.env.PORT`) di `scripts/mcp-server/index.js` untuk deployment cloud.
  - Menampilkan panduan & tombol salin **URL Server MCP (`/mcp`)**, **Client ID OAuth**, dan **Rahasia Klien OAuth** untuk Skenario 1 (Localhost) & Skenario 2 (Web Online) di tab **AI & MCP** pada `SettingsModal.tsx`.
- **Non-Goals:**
  - Tidak membutuhkan database eksternal untuk penyimpanan token OAuth (cukup in-memory + signed/stateless token agar zero-dependency).
- **Anti-Goals:**
  - Tidak memutus kompatibilitas mundur dengan `/api/mcp` atau `stdio` MCP untuk Antigravity.

## 3. Constraints
- Zero external runtime dependencies baru: menggunakan modul native Node.js (`http`, `crypto`, `url`) dan `ws` yang sudah ada.
- Semua pengujian wajib menggunakan Playwright (`@playwright/test` via `npx playwright test`).

## 4. Approaches
1. **Pendekatan A (Terpilih): Built-in Streamable HTTP `/mcp` + Integrated OAuth 2.1 & Auto-WSS di Server Geovanta**
   - Mengintegrasikan endpoint `/mcp` dan OAuth 2.1 (`/.well-known/*`, `/oauth/*`) langsung di `scripts/mcp-server/index.js` serta auto-detect `wss://` di `src/bridge/aiLiveConnector.tsx`.
   - *Trade-off:* Zero-config, langsung jalan baik di localhost (via tunnel) maupun saat di-deploy online tanpa perlu setup Auth0/Keycloak terpisah.
2. **Pendekatan B: External OAuth Proxy Terpisah**
   - Membutuhkan layanan OAuth pihak ketiga dan reverse proxy tambahan; terlalu rumit bagi pengguna.

## 5. Bagian Teknis yang Diputuskan
- Endpoint MCP: melayani `/mcp` dan `/api/mcp`.
- Default OAuth Client ID: `geovanta-gemini-client`
- Default OAuth Client Secret: `geovanta-gemini-secret`
- Deteksi URL WebSocket di `aiLiveConnector.tsx`:
  - Jika halaman dimuat dari `https:`, gunakan `wss://` dan gunakan `window.location.host` (tanpa memaksa port `:38291` kecuali parameter `?ai_port=` diberikan secara eksplisit) agar bekerja mulus di cloud hosting (Cloud Run / Railway / Render / ngrok) yang memetakan HTTPS port 443 ke port internal server.
