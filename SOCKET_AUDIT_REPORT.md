# Socket Audit Report (SOCKET_AUDIT_REPORT.md)

**Project:** Perpustakaan Digital (Digital Library)  
**Date:** June 2, 2026  
**Auditor:** Antigravity AI  

---

## 1. Socket Architecture & decoupled Server
* **Server File**: `backend/socket-server.ts` running on port `5001`.
* **Adapter**: `@socket.io/redis-adapter` utilizing two Redis clients (`pubClient` and `subClient`) for pub/sub event syncing.
* **Handshake Auth**: Verified secure using JWT token verification. On validation error, passes error to middleware.

---

## 2. Event Analysis & Major Gaps

### 2.1 Missing Chat Event Listeners (CRITICAL BUG)
While the client applications (web and mobile) emit multiple real-time chat event flows, the decoupled `socket-server.ts` completely **omits** handling them. The original handlers in the monolithic `socketService.ts` were not ported:

* **`chat:join`**: The decoupled server does not listen for room joining. Users are never joined to `conversation:${conversationId}` rooms.
* **`chat:leave`**: Users never leave conversation rooms.
* **`chat:typing`**: Real-time typing indicators are ignored. Typing statuses are never broadcasted to conversation rooms.
* **`chat:read`**: Read receipts are ignored and never synced to the other user in real-time.

> [!WARNING]
> **Impact**:  
> Real-time typing indicators and read receipts do not work when using the standalone `socket-server.ts` microservice. While chat messages themselves are successfully forwarded using individual `user:${userId}` rooms, any features depending on joining specific conversation rooms are completely broken.

---

### 2.2 Lack of Connection Storm Warnings
The monolithic `socketService.ts` contains reconnect loop tracking (`reconnectTracker`) that warns when a user's connection loops too quickly (e.g. 5+ connections in 5 seconds), helping detect client-side reconnect storms. The standalone `socket-server.ts` has **no** reconnect loop detection, leaving the microservice vulnerable to connection storm crashes when user network states toggle frequently.

---

## 3. Summary of Event Matrix

| Event Name | Trigger Source | Direction | Decoupled Server Handling | Status |
|---|---|---|---|---|
| `connection` | Client | Inbound | Authenticates via JWT | Verified. |
| `user:online` | Server | Outbound (Broadcast) | Sends list of online user IDs | Verified. |
| `chat:join` | Client | Inbound | **None (Ignored)** | 🔴 Broken |
| `chat:leave` | Client | Inbound | **None (Ignored)** | 🔴 Broken |
| `chat:typing` | Client | Inbound | **None (Ignored)** | 🔴 Broken |
| `chat:read` | Client | Inbound | **None (Ignored)** | 🔴 Broken |
| `chat:message` | Server (Redis) | Outbound (Private) | Emits to `user:${recipientId}` | Verified. |
| `notification:new` | Server (Redis) | Outbound (Private) | Emits to `user:${userId}` | Verified. |

---

## 4. Key Recommendations

1. **Port Missing Listeners**: Update `socket-server.ts` to implement `chat:join`, `chat:leave`, `chat:typing`, and `chat:read` listeners, replicating the logic in the monolithic `socketService.ts`.
2. **Add Reconnect Tracker**: Port the reconnect rate limiting tracker to prevent server thread starvation under erratic mobile network reconnect loops.
3. **CORS Restrictions**: Change `origin: '*'` in `socket-server.ts` to read the allowed CORS origins from environment variables (`CORS_ORIGINS`) to prevent unauthorized cross-origin connections in production.
