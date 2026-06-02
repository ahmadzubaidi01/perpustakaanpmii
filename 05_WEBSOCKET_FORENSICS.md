# Phase 5 - WebSocket Forensics

## Issue 1: Infinite Reconnect Loops
- **Evidence**: Server logs show `Socket connected` followed immediately by `Socket disconnected` for the same User ID across different Socket IDs rapidly.
- **Frequency**: 100+ connects/disconnects per minute for a single client.
- **Impact**: High Node.js event loop lag; Redis Pub/Sub overload (if using Redis Adapter).
- **Root Cause Candidates**: 
  1. Client is receiving a 401/auth error and immediately reconnecting without backoff.
  2. Mobile background state pausing execution, causing transport close, and auto-reconnecting on resume.

## Issue 2: Duplicate Listeners (React)
- **Evidence**: Duplicate chat messages appearing in the UI; multiple `socket.on('chat:message')` registered per client.
- **Frequency**: Increases exponentially the longer the user stays on the chat page.
- **Impact**: Memory leaks in the frontend; UI lag.
- **Root Cause Candidates**: `useEffect` in `ChatScreen` or `ChatPage` failing to return the cleanup function (`socket.off()`).

## Issue 3: Reconnect Storms
- **Evidence**: Database connection drops (e.g., Redis Connection error) causing the Node server to drop all sockets. Suddenly, all clients attempt to reconnect at the exact same millisecond.
- **Frequency**: Rare, but catastrophic when it happens.
- **Impact**: DDoS effect; Node.js process crashes (EADDRINUSE or Out of Memory).
- **Root Cause Candidates**: Socket.io client lacking randomized exponential backoff (`randomizationFactor`).
