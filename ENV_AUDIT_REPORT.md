# Environment Audit Report (ENV_AUDIT_REPORT.md)

**Project:** Perpustakaan Digital (Digital Library)  
**Date:** June 2, 2026  
**Auditor:** Antigravity AI  

---

## Executive Summary
This environment audit covers the local development configuration files and production templates (`.env` and `.env.example`) across the Backend API, Next.js Frontend, and React Native Mobile applications. 

A severe security concern was identified in the backend: the production template `.env.example` contains hardcoded credentials including database passwords, Upstash Redis keys, Google Maps API keys, and Firebase Private Keys. Additionally, the mobile app lacks a `.env` configuration file, relying instead on hardcoded URLs in `constants/theme.ts`.

---

## 1. Domain Mapping Summary

| Subdomain | Environment | Port (Local) | Endpoint (Prod) |
|---|---|---|---|
| **Frontend Web** | `frontend/.env` | `3000` | `https://perpustakaanahmad.my.id` |
| **Backend API** | `backend/.env` | `5000` | `https://api.perpustakaanahmad.my.id` |
| **Socket Server** | `backend/socket-server.ts` | `5001` | `https://socket.perpustakaanahmad.my.id` |
| **Mobile App** | Hardcoded | N/A | Connected to API & Socket subdomains |

---

## 2. Component Audits

### 2.1 Backend (`backend/.env` & `backend/.env.example`)
* **Local config (`backend/.env`)**: Properly configured for local development but references production Redis Cloud instance.
* **Template config (`backend/.env.example`)**: Contains severe security vulnerabilities. It has actual production values:
  * Database Password: `Akussayas1@`
  * Redis URL: `rediss://default:gQAAAAAAAT50...io:6379` (contains credentials)
  * Google Maps Key: `AIzaSyDCCtpyewBsgYjT082NnyRSwBfY6cfwoDc`
  * Firebase Private Key: Full service account certificate key is exposed.
* **Missing/Incorrect Variables**:
  * `JWT_SECRET` is used as a fallback in `socket-server.ts` but is not documented in `.env.example`. Only `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are documented.

### 2.2 Frontend (`frontend/.env` & `frontend/.env.example`)
* **Local config (`frontend/.env`)**:
  * `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
  * `NEXT_PUBLIC_SOCKET_URL=http://localhost:5001`
* **Template config (`frontend/.env.example`)**:
  * Configured with production defaults (`https://api.perpustakaanahmad.my.id`, `https://socket.perpustakaanahmad.my.id`).
* **Evaluation**: Config is correct and complete. No security concerns.

### 2.3 Mobile App (`mobile/`)
* **Missing Variables**: The mobile application does **NOT** contain a `.env` or `.env.example` file.
* **Findings**: API endpoints are hardcoded in `mobile/src/constants/theme.ts`:
  * `API_BASE_URL` = `'https://api.perpustakaanahmad.my.id'`
  * `SOCKET_URL` = `'https://socket.perpustakaanahmad.my.id'`
* **Risk**: Modifying server URLs requires recompiling the React Native package. It is impossible to toggle between local test server and production server without code modifications.

---

## 3. Detailed Variable Verification Matrix

| Variable Name | Backend (`.env`) | Frontend (`.env`) | Mobile (`constants/theme.ts`) | Type | Status / Notes |
|---|---|---|---|---|---|
| `PORT` / `SOCKET_PORT` | `5000` / `5001` | N/A | N/A | Ports | Verified. Port 5001 is standalone socket server. |
| `DB_HOST`/`DB_NAME` | `localhost` / `perpustakaan_digital` | N/A | N/A | MySQL | Verified. |
| `REDIS_URL` | Upstash URL | N/A | N/A | Redis | Verified. Required for BullMQ and socket adapter. |
| `JWT_ACCESS_SECRET` | 256-bit Hash | N/A | N/A | Security | Verified. |
| `FIREBASE_PROJECT_ID` | `perpustakaan-fb9b1` | N/A | N/A | Push Notif | Verified. Required for FCM. |
| `API_BASE_URL` | N/A | `NEXT_PUBLIC_API_URL` | `API_BASE_URL` | Integration | Web uses `/api` subpath; mobile maps `/api` dynamically. |

---

## 4. Key Recommendations & Action Items

> [!CAUTION]
> **CRITICAL SECURITY RISK**  
> Do not commit `backend/.env.example` in its current state to any public repository. Replace all production passwords, Redis tokens, Google Maps keys, and Firebase Private keys with placeholders (e.g. `your_db_password`, `<redis_connection_url>`, `-----BEGIN PRIVATE KEY-----\nPLACEHOLDER\n-----END PRIVATE KEY-----`).

1. **Clean Example Files**: Sanitize `backend/.env.example` immediately.
2. **Implement Mobile Dotenv**: Use `react-native-dotenv` or Expo configurations (`app.config.js` with `process.env`) to decouple the API base URL from the source code, allowing environments to be swapped dynamically during builds.
3. **Consolidate JWT secrets**: Clean up fallback logic in `socket-server.ts` to strictly require `JWT_ACCESS_SECRET`.
