# Phase 10 - Complication Analysis

## Security Impact
- Loosening the Rate Limiter to fix 429 errors opens the application to brute-force attacks and actual DDoS.

## Database Impact
- If the rate limits are removed, the database will absorb the full brunt of the frontend request loops, potentially causing complete MySQL crashes.

## Mobile Impact
- Modifying the JWT refresh logic or offline sync logic might cause data loss for students in remote areas (offline scanning data failing to sync).

## WebSocket Impact
- Disabling Long Polling fallback means users on strict corporate/school networks blocking WebSockets will not be able to use the real-time chat or sync features at all.
