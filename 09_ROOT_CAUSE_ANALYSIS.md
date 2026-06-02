# Phase 9 - Root Cause Analysis

## Issue: 429 Too Many Requests

### Analysis A: Frontend Request Loop (Confidence: 95%)
- **Evidence**: Logs show repeated calls to `/api/v1/auth/profile` and hierarchical endpoints from the same IP/Token.
- **Cause**: React `useEffect` dependency arrays missing proper primitive checks or infinite state update loops.

### Analysis B: Mobile Sync Engine Burst (Confidence: 85%)
- **Evidence**: Mobile app goes online and dumps 100+ queued items to the server simultaneously, triggering `express-rate-limit`.
- **Cause**: `syncService.ts` processing the queue via `Promise.all()` or rapid `for` loops without respecting backend rate limit headers (`Retry-After`).

### Analysis C: WebSocket Polling Fallback (Confidence: 90%)
- **Evidence**: `?EIO=4&transport=polling` entries filling the access logs.
- **Cause**: Client proxy blocking WSS, falling back to rapid XHR requests which are caught by the global API rate limiter.

## Actual Root Causes:
1. **API Rate Limiter Configuration**: The `generalLimiter` applies globally to the IP, meaning XHR polling from Socket.io consumes the entire rate limit quota for standard API calls, leading to 429 lockouts.
2. **React State Loops**: Unstable dependencies in `useEffect` are causing continuous background fetching.
