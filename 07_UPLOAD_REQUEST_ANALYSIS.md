# Phase 7 - Upload Request Analysis

## Upload Retries & Failures
- **Issue**: Uploading a large Excel/CSV file (e.g., Student Data) takes 30+ seconds to process.
- **Observation**: The browser/Axios timeout is set to 10 seconds.
- **Impact**: 
  1. Axios times out and throws an error.
  2. The user sees "Failed" and clicks "Upload" again.
  3. The Backend is *still* processing the first request, locking the database tables.
  4. The second upload request causes lock wait timeouts or duplicate key errors in the database.
- **Loops**: The frontend might have automatic retry libraries (like `axios-retry`) which automatically retry POST requests if they time out.
