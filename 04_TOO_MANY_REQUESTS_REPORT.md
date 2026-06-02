# Phase 4 - Too Many Requests Analysis

## 429 Error Occurrences

### Incident 1: Mobile Background Sync
- **Triggering Endpoint**: `POST /api/v1/qr/scan`
- **Triggered By**: Mobile App (Background Sync Queue)
- **Platform**: Android/iOS
- **Request Frequency**: 50+ requests per second upon network restoration.
- **Trigger Condition**: `syncService.ts` iterating through the queue without delays, hitting the `qrScanLimiter` (10 requests per minute).

### Incident 2: Chat WebSocket Fallback
- **Triggering Endpoint**: `/socket.io/?EIO=4&transport=polling`
- **Triggered By**: Web Frontend
- **Platform**: Desktop Browsers
- **Request Frequency**: Continuous XHR polling (3-4 req/sec).
- **Trigger Condition**: WebSocket transport fails or is blocked by local proxy, falling back to HTTP Long Polling, triggering the `generalLimiter` globally.

### Incident 3: Profile API Loop
- **Triggering Endpoint**: `GET /api/v1/auth/profile`
- **Triggered By**: Web Frontend
- **Platform**: Desktop Browsers
- **Request Frequency**: 10+ requests per second.
- **Trigger Condition**: Infinite rendering loop on the Dashboard, hitting the `generalLimiter` (100 requests per 15 minutes).
