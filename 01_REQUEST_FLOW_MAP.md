# Phase 1 - Request Flow Map

## 1. Login Flow
- **Client**: Mobile/Web
- **Endpoint**: `POST /api/v1/auth/login`
- **Sequence**:
  1. Client sends credentials.
  2. Backend validates against `users` table.
  3. Returns JWT (Access + Refresh) and User Data.
  4. Client stores tokens and initializes WebSocket connection.
- **Possible Loop Points**:
  - Auto-login on app start (Mobile) causing repeated tokens if `SecureStore` read fails.
  - `useEffect` triggers if auth state oscillates.

## 2. Profile Loading Flow
- **Endpoint**: `GET /api/v1/auth/profile`
- **Sequence**:
  1. Frontend calls profile API on dashboard load.
  2. Mobile calls on app load or screen focus.
- **Possible Loop Points**:
  - Unmemoized React components triggering re-fetches.
  - Redux/Zustand state updates forcing infinite re-renders calling the API.

## 3. Region/District/School Loading Flow
- **Endpoints**:
  - `GET /api/v1/schools/regencies`
  - `GET /api/v1/schools/districts/:regencyId`
  - `GET /api/v1/schools/by-district/:districtId`
- **Sequence**: Hierarchical fetching.
- **Possible Loop Points**:
  - `useEffect` dependencies on object identities (e.g. `[filters]`) causing continuous fetching.

## 4. Upload Flow
- **Endpoint**: `POST /api/v1/users/upload/csv`
- **Sequence**:
  1. Multipart form data sent.
  2. Backend parses CSV, executes bulk insert.
- **Possible Loop Points**:
  - Client-side retry logic on timeout, leading to duplicate records if backend continues processing the first request.

## 5. WebSocket Flow
- **Endpoint**: `ws://localhost:5000`
- **Sequence**:
  1. Connect with `auth` token.
  2. Authenticate middleware checks token.
- **Possible Loop Points**:
  - `connect_error` triggering infinite reconnect loops without exponential backoff.
  - Expired token causing continuous disconnect/reconnect cycles.

## 6. Token Refresh Flow
- **Endpoint**: `POST /api/v1/auth/refresh-token`
- **Sequence**: Axios interceptor catches 401, calls refresh, retries original request.
- **Possible Loop Points**:
  - Concurrent requests trigger multiple parallel refresh requests.
  - 401 on the refresh endpoint triggers infinite loop of 401s if interceptor is not configured to break out.

## 7. Mobile Startup Flow
- **Sequence**:
  1. Check token -> Fetch Profile -> Init DB -> Sync Offline Scans.
- **Possible Loop Points**:
  - Offline sync loop `processSyncQueue()` retrying endlessly if backend rate-limits (429).

## 8. Dashboard Loading Flow
- **Sequence**:
  1. Fetch statistics -> Fetch charts -> Fetch recent activity.
- **Possible Loop Points**:
  - Polling (e.g., `setInterval`) for live stats without checking previous request completion.
