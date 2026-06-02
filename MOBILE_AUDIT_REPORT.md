# 📱 Mobile Application Audit Report

**Project:** Perpustakaan Digital (Digital Library)  
**Date:** June 2, 2026  
**Auditor:** Antigravity AI  

---

## 🔍 Executive Summary
This report presents a thorough audit of the React Native (Expo) mobile application. It covers component flows, offline caching mechanism verification, data storage, and includes deep-dive investigations into the two critical bugs blocking library administration: **Category Data Not Loading** and **Statistics Data Not Loading**.

---

## 1. Component Verification

| Component | Status | Traced Flow | Evaluation |
|---|---|---|---|
| **Login** | ✅ Verified | Traces through `LoginScreen.tsx` calling `authAPI.login` to fetch JWT tokens, pre-fetching profile via `authAPI.getProfile`, saving tokens and profile securely using Expo `SecureStore`, and hydrating state in Zustand (`authStore.ts`). | Production-ready. Correctly caches and hydrates the auth token. |
| **Logout** | ✅ Verified | Traces through `logout` in `authStore.ts` which deletes the access token, refresh token, and user profile from `SecureStore` and resets Zustand state. | Secure. Correctly cleans up authorization headers. |
| **Profile** | ✅ Verified | Traces through `ProfileScreen.tsx` displaying cached profile data, generating user membership QR code from `member_qr_uuid`, and supporting offline displays. | Fully functional. |
| **Dashboard** | 🟡 Compromised | Traces through `HomeScreen.tsx` fetching admin statistics based on user role and rendering widgets. | Broken in production/MySQL environments due to backend `ONLY_FULL_GROUP_BY` SQL queries crashing (see Critical Issue 2). |
| **Categories** | 🔴 Broken | Traces through `CategoryManagementScreen.tsx` fetching categories. Falls back to SQLite cached lists when offline or on API failure. | Broken locally and offline due to missing SQLite columns in cache schemas (see Critical Issue 1). |
| **Books** | 🟡 Compromised | Traces through `BooksScreen.tsx` displaying the books database. Relies on SQLite cache `books` table which fails to populate. | Partially broken due to same cache SQLite schema exception (missing `sync_status` column). |
| **QR Scan / Cam** | ✅ Verified | Traces through `ScanScreen.tsx` invoking `expo-camera` to parse barcodes. Dispatches scans to offline logs or process live. | Robust camera scanner. Correctly stores GPS coordinates. |
| **Borrowing** | ✅ Verified | Traces through `BorrowingsScreen.tsx` showing active/historic borrowings. Offline borrowing triggers are correctly queued in `sync_queue`. | Functional. |
| **Returning** | ✅ Verified | Traces through `ScanScreen.tsx` scanning book QR codes, matching active borrowings, and executing return transactions. | Functional. |
| **Inventory** | ✅ Verified | Traces through `ManagementScreen.tsx` routing admin actions (categories, book creation, user management). | Functional. |
| **Notifications** | ✅ Verified | Traces through `NotificationsScreen.tsx` and `notificationStore.ts` storing alerts. Supports Expo notifications. | Functional. |
| **Sync Engine** | 🟡 Compromised | Traces through `syncService.ts` running `processSyncQueue` to flush buffered SQLite actions via `/v1/sync/batch`. | Broken idempotency and concurrency locks on the backend (see Section 7 report). |

---

## 2. Critical Issue 1: Category Data Not Loading

### 2.1 Trace Analysis
* **API Response**: `/v1/categories` responds correctly with active JSON payload containing category records.
* **Mapping / Context**: Inside `CategoryManagementScreen.tsx`, categories list correctly parses API results. However, when the device is offline or when caching metadata in `syncService.ts` runs:
  ```typescript
  // syncService.ts
  const res = await categoriesAPI.list();
  const data = res.data.data || [];
  if (data.length > 0) cacheCategories(data);
  ```
* **Offline Caching**: The application invokes `cacheCategories(data)` in `db.ts` to sync the SQLite local database:
  ```typescript
  // db.ts
  db.runSync(
    `INSERT OR REPLACE INTO categories (category_id, category_name, sync_status, created_at, updated_at)
     VALUES (?, ?, 'synced', ?, ?);`,
    ...
  );
  ```

### 2.2 Exact Root Cause
> [!CAUTION]
> **CRITICAL SCHEMA MISMATCH**  
> The SQLite database initialization in `db.ts` (line 233) creates the `categories` table as follows:
> ```sql
> CREATE TABLE IF NOT EXISTS categories (
>   category_id INTEGER PRIMARY KEY,
>   category_name TEXT NOT NULL,
>   pending_sync INTEGER DEFAULT 0,
>   local_created INTEGER DEFAULT 0,
>   created_at TEXT,
>   updated_at TEXT
> );
> ```
> **The `sync_status` column is entirely missing** from the table definition. Consequently:
> 1. Running `INSERT INTO categories (... sync_status ...)` throws an SQLite exception: `no such column: sync_status`.
> 2. The exception is caught by `handleDatabaseError` and swallowed, failing the entire caching operation.
> 3. Since the database cache is empty and queries for categories fail, the UI rendering falls back to empty arrays, causing **Category Data Not Loading** in the mobile interface.
> 
> *Note: This same issue affects the `books`, `students`, and `book_qrs` tables where `sync_status` is queried or updated but never defined in the schema.*

---

## 3. Critical Issue 2: Statistics Data Not Loading

### 3.1 Trace Analysis
* **Endpoint**: Mobile dispatches GET requests to role-specific endpoints:
  * `/v1/dashboard/super-admin`
  * `/v1/dashboard/regency-admin`
  * `/v1/dashboard/district-admin`
  * `/v1/dashboard/school-admin`
* **Query & Aggregation (Backend)**: In `backend/controllers/dashboardController.ts`, Sequelize aggregates data grouped by IDs. Examples:
  * Regency Admin groups by `School.district_id` but selects `district.district_name`.
  * School Admin groups by `book_qr.book.book_id` but selects `book_title`, `author_name`, and `cover_image_url` for popular books.
* **API Response**: The backend returns `500 Internal Server Error` due to database crashes.
* **Mobile Parsing / UI Rendering**: Because the API returns a error code, `fetchAdminStats` in `HomeScreen.tsx` catches the error, sets `adminStats` to `null`, and disables the stats dashboard grid, rendering empty or 0 widgets.

### 3.2 Exact Root Cause
> [!IMPORTANT]
> **MYSQL ONLY_FULL_GROUP_BY COMPLIANCE FAILURE**  
> Under default MySQL setups (common on local and production cPanel hostings), `ONLY_FULL_GROUP_BY` is active. SQL queries that select non-aggregated columns which are not listed in the `GROUP BY` clause fail automatically. 
> 
> The dashboard controller queries fail to group by all non-aggregated select fields (e.g. grouping only by `user_id` but selecting `full_name` and `class_name` in top borrowers). This crashes the SQL engine, returning 500 errors to the mobile client and keeping statistics empty.

---

## 4. Key Recommendations

1. **Healing SQLite Schemas (Mobile)**:
   * Modify [db.ts](file:///c:/Users/evane/OneDrive/Dokumen/Punya%20Ahmad/perpustakaandigital_backup/perpustakaandigital/mobile/src/services/db.ts) schema initialization to define `sync_status TEXT DEFAULT 'synced'` on `books`, `students`, `categories`, and `book_qrs` tables.
   * Add incremental schema migration loops (`addColumnIfNeeded`) to auto-migrate existing databases.
   * Bump `CURRENT_SCHEMA_VERSION` in `db.ts` to `5`.
2. **Re-aligning Backend GROUP BY arrays**:
   * Modify [dashboardController.ts](file:///c:/Users/evane/OneDrive/Dokumen/Punya%20Ahmad/perpustakaandigital_backup/perpustakaandigital/backend/controllers/dashboardController.ts) queries to include **all** selected non-aggregated attributes in their respective `group` arrays.
3. **Decoupling Configurations (Mobile)**:
   * Replace hardcoded production subdomains in [theme.ts](file:///c:/Users/evane/OneDrive/Dokumen/Punya%20Ahmad/perpustakaandigital_backup/perpustakaandigital/mobile/src/constants/theme.ts) with dynamic configurations supported by Expo config variables.
