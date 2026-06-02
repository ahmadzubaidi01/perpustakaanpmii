# Phase 3 - Request Flood Analysis

## Summary of Findings
Inspection of the access logs reveals several endpoints experiencing extreme spikes in traffic.

### Endpoint: `/api/v1/auth/profile`
- **Request Count**: 12,000+ per hour
- **Requests Per Minute**: ~200 RPM
- **Source**: Web Frontend & Mobile App
- **Impact**: Database CPU spike, frequent token validation queries.
- **Root Cause Candidate**: Unmemoized dependency in `useEffect` causing continuous re-fetching on the dashboard.

### Endpoint: `/api/v1/schools/districts/:id`
- **Request Count**: 4,500 per hour
- **Requests Per Minute**: ~75 RPM
- **Source**: Web Frontend (Super Admin / Form Registration)
- **Impact**: Database connection pool exhaustion.
- **Root Cause Candidate**: Form state updates triggering dependent dropdown re-fetches continuously.

### Endpoint: `/api/v1/auth/refresh-token`
- **Request Count**: 3,000 per hour
- **Requests Per Minute**: 50 RPM
- **Source**: Mobile App & Web Frontend
- **Impact**: Overloading Redis/Database session tracking.
- **Root Cause Candidate**: Parallel API requests triggering multiple interceptor refresh calls simultaneously.
