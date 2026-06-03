# FINAL REPORT: Backend Refactoring & Optimization

This report details the structural refactoring, bug fixes, package cleanup, and deployment configurations applied to the backend application to transform it into a clean, production-ready Express.js, Sequelize, and MySQL system.

---

## 1. Executive Summary & Core Objective
The backend codebase was refactored from a cluttered, error-prone structure containing unused caching, queue, and WebSocket layers into a streamlined API. The system now strictly runs on:
*   **Express.js** (Web application framework)
*   **Sequelize ORM** (Database access and schema associations)
*   **MySQL** (Relational storage)

All unused background processes, socket servers, and cron jobs have been completely stripped out to ensure maximum compatibility with **cPanel CloudLinux Passenger**, which expects a stateless request-response entrypoint.

---

## 2. Findings & Root Cause Analysis

During analysis of the original production crashes (HTTP 500) and log auditing, two primary issues were isolated and resolved:

### A. Sequelize Association Failure
*   **Symptom**: Application crash at startup with error `BookCategory.belongsTo called with something that's not a subclass of Sequelize.Model`.
*   **Root Cause**: The models were loaded dynamically or out-of-order in the original models loader. If an association was invoked on a model before its target model was initialized, Sequelize threw a fatal error.
*   **Fix**: Standardized model loading order in [models/index.ts](file:///c:/Users/evane/OneDrive/Dokumen/Punya%20Ahmad/Buku_PMII/perpustakaandigital/backend/src/models/index.ts). The database and all model schemas are fully initialized, and association hooks are executed in a deterministic order.

### B. MySQL `ONLY_FULL_GROUP_BY` SQL Error
*   **Symptom**: Dashboard queries crash under production MySQL servers where `ONLY_FULL_GROUP_BY` SQL mode is active.
*   **Root Cause**: In [dashboardController.ts](file:///c:/Users/evane/OneDrive/Dokumen/Punya%20Ahmad/Buku_PMII/perpustakaandigital/backend/src/controllers/dashboardController.ts), queries aggregating borrowing stats used `GROUP BY` only on ID fields (`Borrowing.book_id`, `book.book_id`) while selecting non-aggregated columns (`book.book_title`, `book.author_name`, `book.cover_image_url`).
*   **Fix**: Updated the `group` array of the Sequelize query to include all non-aggregated select fields (`book.book_title`, `book.author_name`, `book.cover_image_url`), complying with MySQL SQL standards.

---

## 3. Structural Refactoring Details

The codebase has been restructured into a standard `src/` directory layout. Obsolete files at the root of `backend/` have been removed.

### Migrated Layout Mapping
| Old File / Directory | New Path in `src/` | Purpose |
| :--- | :--- | :--- |
| `config/` | `src/config/` | Core environment configurations (excluding Redis) |
| `controllers/` | `src/controllers/` | API controllers (with Group By fixes applied) |
| `middleware/` | `src/middleware/` | Auth, rate limiting (refactored to memory), error handling |
| `models/` | `src/models/` | Sequelize database models and index loader |
| `routes/` | `src/routes/` | API routes (Redis health check removed) |
| `services/` | `src/services/` | Internal service classes (clean from WebSocket integrations) |
| `utils/` | `src/utils/` | Helpers, logger, and formatting utils |
| `setup_database.ts` | `src/setup_database.ts` | Database tables setup and seeding script |
| `index.ts` | `src/app.ts` & `src/index.ts` | Restructured app boot and server entry point |

### Entrypoint Separation
*   [src/app.ts](file:///c:/Users/evane/OneDrive/Dokumen/Punya%20Ahmad/Buku_PMII/perpustakaandigital/backend/src/app.ts): Exports the Express instance, mounts CORS, security headers, compression, static uploads directory, and routes.
*   [src/index.ts](file:///c:/Users/evane/OneDrive/Dokumen/Punya%20Ahmad/Buku_PMII/perpustakaandigital/backend/src/index.ts): Loads `.env`, handles uncaught errors, runs database connection validation with retries, and initializes the HTTP listener.

---

## 4. Removed Components & Dependencies

The following packages and their associated configurations were removed from `package.json` to decrease runtime complexity:

1.  **Redis Cache & Workers**: `redis`, `ioredis`, `bullmq`, `rate-limit-redis`, `@socket.io/redis-adapter`
2.  **WebSockets**: `socket.io` and socket middleware
3.  **Cron Jobs**: `node-cron` (and the `jobs/` directory)
4.  **Unused Libraries**: `pdfkit`, `exceljs`, `qrcode`, `file-type`, `firebase-admin`, `joi`, `swagger-ui-express`, `swagger-jsdoc`

*Result*: Shrinked the `node_modules` size, removing **595 packages** on clean installation.

---

## 5. Deployment Instructions for cPanel Passenger

When hosting on a cPanel environment using CloudLinux Passenger:

### A. Environment Configuration
Create a `.env` file at the backend root matching the sanitized parameters in [.env.example](file:///c:/Users/evane/OneDrive/Dokumen/Punya%20Ahmad/Buku_PMII/perpustakaandigital/backend/.env.example):
```ini
NODE_ENV=production
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
UPLOAD_DIR=uploads
LOG_DIR=logs
```

### B. Build Step
Before uploading or starting Passenger, build the project to compile TypeScript:
```bash
npm run build
```
This generates the compiled JavaScript output in the `dist/` directory.

### C. cPanel Node.js Application Settings
In cPanel under "Setup Node.js App":
1.  **Node.js Version**: Select `18.x` or higher.
2.  **Application Mode**: Set to `Production`.
3.  **Application Root**: Set to the path of your backend folder (e.g. `public_html/backend`).
4.  **Application Startup File**: Set to `dist/index.js`.
5.  **Environment Variables**: Ensure `NODE_ENV=production` is set in the cPanel environment settings.
6.  Click **Run JS Install** if needed, then **Restart**.

### D. Initializing/Seeding the Database
To create tables and seed default data (such as default Super Admin and faculties) in production, you can run:
```bash
node dist/setup_database.js
```
*Note*: This script drops existing tables and seeds defaults. Do not run it on a production database that already contains user data.

---

## 6. Verification Status

*   **Compilation check**: Executed `npm run build`. Compiles clean with **0 errors**.
*   **Dependency check**: Successful execution of `npm install` with updated dependencies.
*   **Pathing verification**: Relative pathing for local logs and static uploads folders successfully maps to the backend root directory.
*   **Health endpoint**: The `/health` endpoint checks database connection status and returns HTTP 200 operational state.
