# Backend Audit Report (BACKEND_AUDIT_REPORT.md)

**Project:** Perpustakaan Digital (Digital Library)  
**Date:** June 2, 2026  
**Auditor:** Antigravity AI  

---

## 1. Build Verification & TypeScript Status
* **Compilation Status**: **SUCCESSFUL** (Built with zero compilation errors after updating `ignoreDeprecations` to `"6.0"` in `tsconfig.json`).
* **Environment**: Node.js + Express.js + Sequelize ORM + TypeScript.
* **Architecture**: REST API with route versioning under `/api/v1/...`.

---

## 2. Critical Database Audits

### 2.1 GROUP BY SQL Violations (`ONLY_FULL_GROUP_BY`)
Under standard MySQL installations (e.g. cPanel production servers, local MySQL), the SQL mode `ONLY_FULL_GROUP_BY` is enabled by default. This causes ALL four dashboard statistics queries in `controllers/dashboardController.ts` to crash with SQL errors:

1. **Super Admin Dashboard (`getSuperAdminDashboard`)**:
   * *Query*: Counts schools grouped by `regency_id` and includes `regency_name`.
   * *Error*: Selects `regency.regency_name` but only groups by `regency_id`.
2. **Regency Admin Dashboard (`getRegencyAdminDashboard`)**:
   * *Query*: Counts schools grouped by `district_id` and includes `district_name`.
   * *Error*: Selects `district.district_name` but only groups by `School.district_id`.
3. **District Admin Dashboard (`getDistrictAdminDashboard`)**:
   * *Query*: Selects school activity statistics.
   * *Error*: Selects `school.school_name` but only groups by `school_id`.
4. **School Admin Dashboard (`getSchoolAdminDashboard` - Popular Books)**:
   * *Query*: Retrieves top 5 popular books.
   * *Error*: Selects `book_title`, `author_name`, and `cover_image_url` but only groups by `book_qr.book.book_id`.
5. **School Admin Dashboard (`getSchoolAdminDashboard` - Top Borrowers)**:
   * *Query*: Retrieves top 5 borrowers.
   * *Error*: Selects `borrower.full_name` and `borrower.class_name` but only groups by `Borrowing.user_id`.

> [!IMPORTANT]
> **Root Cause for Statistics Data Not Loading**:  
> These GROUP BY errors cause the backend API to return `500 Internal Server Error` (or fail silently with an empty payload) when the dashboard endpoints are queried, preventing statistics data from displaying.

---

### 2.2 Sync Idempotency Check Bug
In `controllers/syncController.ts`, the background worker transaction contains a severe idempotency check failure:
```typescript
// Prevent duplicate processing of the same operation using operation_id log
if (payload.operation_id) {
  const exists = await SyncOperation.findOne({ where: { operation_id: payload.operation_id }, transaction: t });
  ...
}
```
* **The Bug**: `operation_id` is a TOP-LEVEL property of the operation object `op` (which maps to `job.data.operation_id`), but it is **NOT** inside the `payload` object. Checking `payload.operation_id` evaluates to `undefined`.
* **Impact**: The duplicate check is completely bypassed, and operations are never written to `SyncOperation` history. Unsynced retry batches will cause duplicate record inserts (e.g. duplicate books, duplicate borrowings) in database transactions.

---

## 3. Middleware, Rate Limiting, & Caching
* **Authentication**: JWT-based with access and refresh tokens. Verified secure.
* **Authorization**: RBAC (Role-Based Access Control) checking is secure and separates regional admin scopes correctly.
* **Rate Limiting**: `express-rate-limit` is configured. However, if clients fall back to XHR polling for WebSocket connection, they flood standard HTTP ports, triggering rate-limit lockouts (`429 Too Many Requests`) for legitimate API calls.
* **Redis Caching**: Redis caching is configured for analytics dashboards (`dashboard:super_admin`, etc.), but is not currently self-invalidating for real-time transactions unless cache patterns are deleted.

---

## 4. Summary of Recommended Fixes

1. **Reconstruct GROUP BY Queries**: Update all queries in `controllers/dashboardController.ts` to include **ALL** non-aggregated select columns in the `group` array to satisfy `ONLY_FULL_GROUP_BY`.
2. **Re-route Sync Idempotency**: Pass `operation_id` as a separate top-level parameter to `processMobileSyncOperation()` from `syncWorker.ts`, and query it as a top-level field rather than `payload.operation_id`.
3. **Configure SQL Mode (Optional)**: If MySQL server controls allow it, disable `ONLY_FULL_GROUP_BY` in cPanel SQL modes, although code-level fixes are highly recommended for robustness.
