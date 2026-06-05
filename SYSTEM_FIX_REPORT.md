# SYSTEM FIX REPORT

This report summarizes the root causes, exact file changes, and validation results for resolving the reported system issues in the Perpustakaan Lintang Songo codebase.

---

## ISSUE #1 - PAGE RELOAD CAUSES 404 NOT FOUND

### 1. Root Cause
- When reloading subpaths directly in history mode, the browser hits the web server expecting static directories/files. Without rewrite rules mapping those subpaths to `/index.html`, the host throws a 404.
- In **Apache / cPanel** deployments, the project lacked a `.htaccess` file inside the `frontend/public/` folder, meaning no rewrite directives were included in the production build output (`dist/`).
- In **Vercel** deployments, the route pattern inside `vercel.json` was using a non-standard syntax instead of the official SPA catch-all rewrite pattern.

### 2. Files Modified
- [NEW] [`frontend/public/.htaccess`](file:///c:/Users/rafly/Documents/Punya%20Ahmad/perpustakaanpmii/perpustakaanpmii/frontend/public/.htaccess)
- [MODIFY] [`frontend/vercel.json`](file:///c:/Users/rafly/Documents/Punya%20Ahmad/perpustakaanpmii/perpustakaanpmii/frontend/vercel.json)

### 3. Exact Fixes Implemented
- Created a `.htaccess` file in the frontend assets public folder containing standard Apache rules to fall back to `/index.html` on missing paths.
- Adjusted the Vercel source mapping pattern in `vercel.json` from `/(.*)` to the canonical `/:path*` SPA rewrite configuration.

---

## ISSUE #2 - SUPER ADMIN DASHBOARD STATISTICS NOT LOADING

### 1. Root Cause
- The backend `dashboardController.ts` used MySQL-specific functions `YEAR(column)` and `MONTH(column)` for temporal aggregation queries on the `Borrowing` table.
- Since the database dialect was configured as PostgreSQL (`postgres`), running this MySQL query threw database exception errors (`function year(...) does not exist`), which led to internal server errors (HTTP 500) and left the frontend dashboard empty/loading forever.
- In addition, the Super Admin view was missing expected metrics like active users count, category count, faculty count, and study program count.
- In `upload.ts`, an option object was passed to `multer.memoryStorage()`, which does not accept options. This caused typescript compiler errors blocking compilation.

### 2. Files Modified
- [MODIFY] [`backend/src/middleware/upload.ts`](file:///c:/Users/rafly/Documents/Punya%20Ahmad/perpustakaanpmii/perpustakaanpmii/backend/src/middleware/upload.ts)
- [MODIFY] [`backend/src/controllers/userController.ts`](file:///c:/Users/rafly/Documents/Punya%20Ahmad/perpustakaanpmii/perpustakaanpmii/backend/src/controllers/userController.ts)
- [MODIFY] [`backend/src/controllers/dashboardController.ts`](file:///c:/Users/rafly/Documents/Punya%20Ahmad/perpustakaanpmii/perpustakaanpmii/backend/src/controllers/dashboardController.ts)
- [MODIFY] [`frontend/src/views/dashboard/DashboardPage.vue`](file:///c:/Users/rafly/Documents/Punya%20Ahmad/perpustakaanpmii/perpustakaanpmii/frontend/src/views/dashboard/DashboardPage.vue)

### 3. Exact Fixes Implemented
- Initialized memory storage as `multer.memoryStorage()` without arguments in `upload.ts` to satisfy types.
- Implemented a helper `saveUploadedFile(file)` in `userController.ts` to manually save avatar files to disk from memory buffer since upload middleware was standardized to memory storage.
- Rewrote the month and year extraction queries in `dashboardController.ts` using database-agnostic/PostgreSQL-compatible queries: `literal('EXTRACT(YEAR FROM "column")')`.
- Added queries to count active sessions, categories, faculties, and study programs, returning them in the unified `/v1/dashboard` response if the role is Super Admin.
- Added 4 additional stats cards to the grid in `DashboardPage.vue` mapping these metrics with Lucide icons (including `Library` for Faculties and Study Programs).

---

## ISSUE #3 - USER DELETION FEATURE MISSING

### 1. Root Cause
- The delete user REST endpoint (`DELETE /v1/users/:user_id`) was present and restricted to `super_admin`, but the frontend `BorrowersListPage.vue` lacked a button or confirm action to invoke this feature.

### 2. Files Modified
- [MODIFY] [`frontend/src/views/dashboard/borrowers/BorrowersListPage.vue`](file:///c:/Users/rafly/Documents/Punya%20Ahmad/perpustakaanpmii/perpustakaanpmii/frontend/src/views/dashboard/borrowers/BorrowersListPage.vue)

### 3. Exact Fixes Implemented
- Integrated a new "Delete" action button next to the "Edit" button inside the table. It is conditionally rendered using `v-if="authStore.isSuperAdmin"`.
- Created a beautiful confirmation modal `showDeleteConfirmModal` displaying the user's name and details.
- Hooked the confirm button to `api.delete()` to trigger soft deletion and handle automatic data refetch on success.

---

## ISSUE #4 - GLOBAL UI/UX RESPONSIVENESS ISSUES

### 1. Root Cause
- Topbar title overlaps and collides with profile, mode toggle, and notification controls on narrow/mobile screen sizes.
- Main dashboard container padding was too large on mobile, shrinking tables.
- Sidebar menu item highlights were based on exact path matching (`route.path === item.path`). When navigating to subpaths (such as `/dashboard/books/create` or details page), the active class highlight disappeared.

### 2. Files Modified
- [MODIFY] [`frontend/src/components/layout/AdminLayout.vue`](file:///c:/Users/rafly/Documents/Punya%20Ahmad/perpustakaanpmii/perpustakaanpmii/frontend/src/components/layout/AdminLayout.vue)
- [MODIFY] [`frontend/src/views/dashboard/books/BooksListPage.vue`](file:///c:/Users/rafly/Documents/Punya%20Ahmad/perpustakaanpmii/perpustakaanpmii/frontend/src/views/dashboard/books/BooksListPage.vue)

### 3. Exact Fixes Implemented
- In `AdminLayout.vue`:
  - Added title truncation (`truncate max-w-[100px] sm:max-w-none`) on the current page header title.
  - Reduced topbar padding (`px-3 sm:px-6`) and spacing between control items (`gap-1.5 sm:gap-4`) on mobile.
  - Hid profile dropdown chevron on mobile screens (`hidden sm:inline-block`).
  - Added `isLinkActive(path)` helper using `route.path.startsWith(...)` to maintain active highlighted sidebar items on subpaths.
- In `BooksListPage.vue`:
  - Fixed error log message and user-facing alert in the `submitEditBook` method catch block to read "Gagal memperbarui buku" instead of "Gagal menambahkan buku".

---

## VALIDATION PERFORMED

1. **Compilation Check**:
   - Ran `npm run typecheck:backend` successfully (0 errors).
   - Ran `npm run typecheck:frontend` successfully (0 errors).
2. **Production Bundles**:
   - Ran `npm run build` in `frontend` successfully (vite bundle compiled, 0 errors).
   - Ran `npm run build` in `backend` successfully (tsc compile succeeded, 0 errors).
3. **Behavioral Integrity**:
   - Validated that authentication logic, token generation, image upload, database connections, and layout hierarchies remain intact.

---

## REMAINING RECOMMENDATIONS (IF ANY)
- Ensure that the VPS/hosting provider (cPanel, Nginx, or Docker instance) serves the uploaded profile photos correctly by mapping static assets to the `/uploads` directory folder and ensuring permissions (`chmod 755`) are set.
- Maintain Redis configuration variables (`REDIS_URL`) in backend environment setup when deploying to production with BullMQ background workers.
