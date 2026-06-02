# Panduan Deployment Lengkap ke cPanel

Berikut adalah panduan lengkap dan sistematis untuk men-deploy aplikasi **Perpustakaan Digital** dengan arsitektur terbaru (API Terpisah + WebSocket Microservice + BullMQ), disesuaikan dengan alur kerja Anda: **Frontend di-build lokal, Backend di-build di cPanel.**

---

## TAHAP 1: Konfigurasi & Build Frontend (Lokal)

Karena Anda melakukan proses *build* Next.js di komputer lokal, pastikan seluruh referensi URL sudah menunjuk ke *production* (cPanel) sebelum perintah build dijalankan.

### 1. Update `.env` Frontend
Di komputer lokal Anda, *copy* template file environment menjadi file asli, lalu pastikan URL-nya sudah presisi:
```bash
cp .env.example .env
```
Buka file `frontend/.env` dan pastikan isinya seperti ini:
```env
NEXT_PUBLIC_API_URL=https://api.perpustakaanahmad.my.id
NEXT_PUBLIC_SOCKET_URL=https://socket.perpustakaanahmad.my.id
```

### 2. Jalankan Build Lokal
Buka terminal di folder `frontend`, lalu jalankan:
```bash
npm install
npm run build
```

### 3. Upload Hasil Build ke cPanel
Setelah proses build selesai 100%, Anda **hanya perlu** meng-upload folder & file berikut dari komputer lokal ke cPanel, tepatnya di dalam direktori `nodeapps/perpustakaandigital/frontend`:
- Folder `.next`
- Folder `public`
- File `package.json`
- *(Lalu jalankan `npm install --production` di terminal cPanel khusus untuk frontend, dan start aplikasinya via Setup Node.js App)*.

---

## TAHAP 2: Konfigurasi & Build Mobile App (Lokal)

Aplikasi mobile perlu dikompilasi (di-build) ulang agar menggunakan URL server cPanel Anda, bukan localhost.

### 1. Update Konfigurasi Tema/URL
Buka file `mobile/src/constants/theme.ts` di komputer lokal, pastikan URL mengarah ke domain asli Anda:
```typescript
export const API_BASE_URL = 'https://api.perpustakaanahmad.my.id';
export const SOCKET_URL = 'https://socket.perpustakaanahmad.my.id';
```
*(Catatan: Logika di `mobile/src/services/socket.ts` sudah di-setting otomatis agar membaca `SOCKET_URL` saat di-build).*

### 2. Build APK/AAB
Lakukan *build* menggunakan EAS atau perintah lokal (contoh: `eas build -p android --profile production`). Setelah selesai, bagikan file APK tersebut ke pengguna.

---

## TAHAP 3: Persiapan & Build Backend (di cPanel)

Pastikan Anda meng-upload seluruh *source code* backend (kecuali `node_modules` dan `dist`) dari komputer lokal ke cPanel, ke dalam direktori `nodeapps/perpustakaandigital/backend`.

### 1. Konfigurasi Redis (Upstash) & Database
Microservice Socket dan BullMQ (Background Job) membutuhkan Redis. Salin file template *environment* di cPanel untuk diaktifkan:
- Buka fitur **Terminal** cPanel atau SSH.
- Copy file environment:
  ```bash
  cd /home/ujpeo5ni/nodeapps/perpustakaandigital/backend
  cp .env.example .env
  ```
- Buka file `.env` tersebut dan pastikan konfigurasi Redis Cloud Anda sudah aktif:
```env
REDIS_ENABLED=true
REDIS_URL=rediss://default:PASSWORD_ANDA@natural-mosquito-81524.upstash.io:6379
```

### 2. Build Backend via Terminal cPanel
Buka fitur **Terminal** bawaan cPanel. Untuk mem-build backend, masuk ke direktori aplikasi Anda dan kompilasi:
```bash
cd /home/ujpeo5ni/nodeapps/perpustakaandigital/backend
npm install
npm run build
```
Jika sukses, folder `dist` akan otomatis terbentuk di dalam direktori tersebut.

---

## TAHAP 4: Menghidupkan Layanan di cPanel (Phusion Passenger)

Karena aplikasi Backend terbelah dua (Express API dan Socket Microservice), kita akan menggunakan Setup Node.js App untuk masing-masing fungsi berdasarkan struktur direktori Anda.

### 1. Hidupkan Aplikasi 1 (Express API Utama)
1. Buka menu **Setup Node.js App** di cPanel.
2. Klik **Create Application**.
3. **App Root**: Isi dengan `nodeapps/perpustakaandigital/backend`.
4. **App URL**: Pilih domain `api.perpustakaanahmad.my.id`.
5. **Application startup file**: Isi dengan `dist/index.js`.
6. Simpan & klik **Start**.

### 2. Hidupkan Aplikasi 2 (WebSocket Microservice)
Karena cPanel menolak dua aplikasi menggunakan satu root folder, Anda sudah membuat folder duplikatnya.
1. Di **File Manager** cPanel, pastikan direktori `nodeapps/perpustakaandigital/backend_socket` sudah berisi *copy* identik dari hasil build di direktori `backend` Anda.
2. Buka menu **Setup Node.js App**.
3. Klik **Create Application**.
4. **App Root**: Isi dengan folder salinan Anda, yaitu `nodeapps/perpustakaandigital/backend_socket`.
5. **App URL**: Pilih subdomain khusus socket yaitu `socket.perpustakaanahmad.my.id`.
6. **Application startup file**: Isi dengan `dist/socket-server.js`.
7. Simpan & klik **Start**.

*(Catatan: Anda tidak perlu khawatir tentang port 5001. Passenger cPanel otomatis menerjemahkan trafik HTTPS standar ke script `dist/socket-server.js` Anda).*

### 3. Opsional: Menghidupkan Sync Worker (BullMQ)
Proses sinkronisasi data offline (BullMQ Worker) harus berjalan di belakang layar. Jika ingin menjalankannya:
- Buka Terminal cPanel.
- Masuk ke virtual environment Node.js Anda (jika ada), atau jalankan langsung:
  ```bash
  node /home/ujpeo5ni/nodeapps/perpustakaandigital/backend/dist/workers/syncWorker.js
  ```
- *Catatan: Untuk membuatnya berjalan permanen 24 jam di shared hosting, Anda mungkin perlu berkonsultasi dengan penyedia hosting Anda mengenai instalasi PM2 atau setup Cron Job yang me-restart worker jika mati.*
