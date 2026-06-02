# Phase 8 - Database Load Analysis

## 1. Excessive Connections
- **Observation**: MySQL throws `Too many connections` errors during peak hours.
- **Reason**: The Node.js application is opening connections (via Sequelize pool) but not releasing them quickly enough due to slow queries or transaction deadlocks.

## 2. Repeated/Duplicate Queries
- **Observation**: Fetching `Profile` joins multiple tables (`roles`, `schools`, `regencies`). Since the `Profile` API is flooded, these complex JOIN queries are executed hundreds of times per second.
- **Reason**: Lack of application-level caching (Redis) for static user data.

## 3. Slow Queries
- **Observation**: Pagination queries with `COUNT()` on large tables (`audit_logs`, `notifications`) scan the entire table.
- **Reason**: Missing indexes on `created_at` or `user_id` in heavily filtered tables.
