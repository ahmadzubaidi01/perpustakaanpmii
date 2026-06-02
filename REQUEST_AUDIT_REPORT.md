# Request Flooding Audit Report (REQUEST_AUDIT_REPORT.md)

**Project:** Perpustakaan Digital (Digital Library)  
**Date:** June 2, 2026  
**Auditor:** Antigravity AI  

---

## 1. Context of Request Flooding (429 Lockouts)
Previously, users experienced systemic `429 Too Many Requests` lockouts and database connection pool exhaustion. A forensics analysis identified three primary drivers of request flooding:

1. **React State & Render Loops**: Frontend pages (such as User Lists and Forms) utilized recursive or dependent `useEffect` arrays, triggering hundreds of duplicate API fetches in a loop on initial load.
2. **Mobile Sync Bursting**: The mobile app synced its offline database by iterating through queue items and firing sequential HTTP requests in rapid succession, immediately exhausting the Express rate limiter.
3. **WebSocket XHR Polling Fallbacks**: When client firewalls/proxies blocked WebSockets (`wss://`), Socket.IO fell back to HTTP long-polling (`?EIO=4&transport=polling`). These rapid HTTP requests hit the main API server and consumed the global IP rate limit quota, locking users out of standard API calls.

---

## 2. Current State of Mitigations

### 2.1 Web Frontend: React Query Migration
* **Status**: **RESOLVED**  
* **Details**: The frontend successfully uses `@tanstack/react-query` to cache server responses. Stale/re-render fetches are mitigated via `staleTime: 5m`, `refetchOnWindowFocus: false`, and `refetchOnMount: false`. No render-loop floods are currently present.

### 2.2 Mobile Client: Batch Synchronization
* **Status**: **RESOLVED**  
* **Details**: Sequential sync queries were replaced by enqueuing offline mutations into a single HTTP POST request to `/v1/sync/batch`. The backend queues this payload into a Redis-backed BullMQ line for processing in the background. This completely prevents HTTP request floods during mobile synchronization.

### 2.3 Rate Limiter Bypass
* **Status**: **PARTIALLY RESOLVED (Band-Aid Fix)**  
* **Details**: In `backend/routes/index.ts` at line 28, the global rate limiter `generalLimiter` is commented out:
  ```typescript
  // router.use(generalLimiter); // Commented out to prevent HTTP 429 lockouts during mobile background sync
  ```
* **Security Risk**: Bypassing the global rate limiter prevents legitimate 429 lockouts during heavy load, but it leaves the Express server vulnerable to Denial of Service (DoS) attacks and endpoint abuse.

---

## 3. Forensics of Remaining Risks

### 3.1 Concurrent Token Refresh Throttling
* **Vulnerability**: If multiple concurrent API requests in flight receive a `401 Unauthorized` status simultaneously when the access token expires, they are correctly queued while `/v1/auth/refresh` runs. However, if the refresh token itself is expired, it triggers a logout. 
* If the user's client-side navigation contains unauthenticated fetch loops (e.g. rendering a page that requires a user profile before validating authentication state), it will continually spawn new requests. Since the token is deleted, it will immediately reject. But if it attempts to hit authentication routes, it will quickly exhaust the `authLimiter` (max 10 requests / 15m), blocking the user's IP address.

---

## 4. Key Recommendations

1. **Re-enable Rate Limiting with Exclusions**: Re-enable `generalLimiter` in `backend/routes/index.ts` but exclude static files, WebSocket paths (`/socket.io`), and sync batches (`/v1/sync/batch`) using custom rate limit bypass rules.
2. **Optimize Socket Server Routing**: Ensure that WebSocket connections always target the dedicated socket subdomain (`socket.perpustakaanahmad.my.id`) and port 5001. Standalone Node.js server Phusion Passenger should handle HTTP long-polling fallbacks separately from port 5000.
3. **Route Guarding**: Enforce strict client-side route guarding in Next.js and React Native. If the auth state is logged out, block all background API fetching immediately to prevent unauthenticated loop requests.
