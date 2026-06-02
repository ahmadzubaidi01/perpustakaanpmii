# Panduan Deployment ke cPanel (step-to-cpanel.md)

Dokumen ini menyediakan panduan deployment lengkap dan sistematis untuk mem-build dan men-deploy aplikasi **Perpustakaan Digital** ke shared hosting cPanel dengan spesifikasi memori rendah (Low Memory/Out of Memory).

---

## Bagian 1 — Local Build & Verification (Lokal)

Sebelum di-upload ke cPanel, proses kompilasi/build harus diselesaikan di komputer lokal Anda untuk mencegah crash kehabisan RAM di shared hosting.

### 1. Backend Build
Jalankan langkah berikut di folder `backend`:
1. **Instalasi Dependencies**:
   ```bash
   npm install
   ```
2. **Kompilasi TypeScript**:
   ```bash
   npm run build
   ```
3. **Verifikasi Build Output**:
   * Pastikan folder `dist/` berhasil dibuat dan berisi file Javascript hasil kompilasi (misalnya `dist/index.js`, `dist/socket-server.js`).
4. **Verifikasi Environment**:
   * Pastikan file `.env` di lokal telah dikonfigurasi dengan URL produksi.
5. **Verifikasi Migrasi Database**:
   * Pastikan file migrasi di `migrations/` dan seeder di `seeders/` sinkron dengan struktur database MySQL di server cPanel.

### 2. Frontend Build (Next.js Standalone)
Next.js secara default memakan banyak memori saat running di shared hosting. Kita harus mem-build Next.js dengan output **standalone** untuk mengurangi penggunaan RAM server.
1. **Konfigurasi `next.config.ts`**:
   Pastikan properti `output: 'standalone'` aktif dalam konfigurasi Next.js Anda:
   ```typescript
   // next.config.ts
   const nextConfig = {
     output: 'standalone',
     // ...
   };
   export default nextConfig;
   ```
2. **Jalankan Build**:
   Di folder `frontend`, jalankan:
   ```bash
   npm install
   npm run build
   ```
3. **Verifikasi Standalone Output**:
   * Pastikan folder `.next/standalone` telah berhasil dibuat. Folder ini berisi server Node.js minimal yang siap di-run tanpa memerlukan seluruh dependencies `node_modules` bawaan.
   * Pastikan aset statis berada di `.next/static` dan `public`.

### 3. Mobile Build (Android)
Di folder `mobile`:
1. **Update API & Socket URL**:
   Pastikan URL di `src/constants/theme.ts` mengarah ke domain produksi:
   ```typescript
   export const API_BASE_URL = 'https://api.perpustakaanahmad.my.id';
   export const SOCKET_URL = 'https://socket.perpustakaanahmad.my.id';
   ```
2. **Build APK/AAB**:
   Gunakan EAS Build (jika memakai Expo) atau build lokal:
   ```bash
   eas build -p android --profile production
   ```
3. **Verifikasi Sync & Endpoints**:
   * Pastikan SQLite database lokal terbuat saat aplikasi pertama kali dijalankan.
   * Tes konektivitas API dengan fitur login saat online.

---

## Bagian 2 — Hosting Deployment (Low Memory Handling)

Shared hosting memiliki batas memori RAM yang sangat ketat (biasanya 512MB - 1GB). Menjalankan `npm run build` atau `npm install` (dengan devDependencies) langsung di cPanel dapat mengakibatkan crash **Out Of Memory (OOM)**.

### 1. Backend & Socket Server Deployment
1. **Compress Build Output**:
   Kemas folder `dist/`, file `package.json`, `package-lock.json`, folder `seeders/` dan `migrations/` menjadi file ZIP di komputer lokal Anda (misalnya `dist.zip`).
2. **Upload ke cPanel**:
   Gunakan **File Manager** cPanel untuk meng-upload `dist.zip` ke App Root backend:
   * `/home/username/nodeapps/perpustakaandigital/backend`
3. **Extract File**:
   Extract file `dist.zip` di folder tersebut.
4. **Instalasi Dependencies (Production-Only)**:
   Buka **Terminal** cPanel atau SSH, lalu jalankan:
   ```bash
   cd /home/username/nodeapps/perpustakaandigital/backend
   npm install --production
   ```
   *Catatan: `--production` hanya menginstal dependencies runtime, menghemat memori RAM dan ruang disk.*
5. **Konfigurasi Environment**:
   Salin dan isi `.env` di cPanel:
   ```bash
   cp .env.example .env
   ```
   Pastikan `REDIS_ENABLED=true` dan `REDIS_URL` terisi dengan URL Redis produksi (Upstash/Redis Labs).
6. **Migrasi Database**:
   Jalankan migrasi dari terminal cPanel:
   ```bash
   npx sequelize-cli db:migrate
   ```

### 2. Duplikasi Folder untuk WebSocket Microservice
Karena cPanel Phusion Passenger mengikat satu App Root ke satu aplikasi NodeJS:
1. Buat folder baru di File Manager cPanel:
   * `/home/username/nodeapps/perpustakaandigital/backend_socket`
2. Salin seluruh isi folder `/backend` ke dalam folder `/backend_socket`.
3. Buka menu **Setup Node.js App** di cPanel:
   * **Aplikasi 1 (API Utama)**:
     * App Root: `nodeapps/perpustakaandigital/backend`
     * App URL: `api.perpustakaanahmad.my.id`
     * Application Startup File: `dist/index.js`
   * **Aplikasi 2 (Socket Server)**:
     * App Root: `nodeapps/perpustakaandigital/backend_socket`
     * App URL: `socket.perpustakaanahmad.my.id`
     * Application Startup File: `dist/socket-server.js`

### 3. Frontend Deployment (Next.js Standalone)
1. Upload folder Next.js standalone hasil build lokal ke folder frontend cPanel:
   * App Root: `/home/username/nodeapps/perpustakaandigital/frontend`
2. Struktur folder di cPanel setelah upload harus seperti ini:
   ```
   frontend/
   ├── .next/
   │   ├── standalone/   <-- Copy isi folder ini ke root frontend
   │   └── static/       <-- Copy ke frontend/.next/static
   ├── public/           <-- Copy ke frontend/public
   └── server.js         <-- Terbuat otomatis oleh Next.js standalone
   ```
3. Di **Setup Node.js App** cPanel:
   * App Root: `nodeapps/perpustakaandigital/frontend`
   * App URL: `perpustakaanahmad.my.id`
   * Application Startup File: `server.js`

---

## Bagian 3 — Runtime Verification

Gunakan perintah berikut di Terminal cPanel atau SSH untuk memverifikasi seluruh layanan berjalan normal:

### 1. Verifikasi Port & Proses
Untuk memeriksa apakah Node.js API dan Socket Server berjalan dan mendengarkan port yang benar:
```bash
# Periksa port yang aktif (API port 5000 / Socket port 5001)
netstat -tulnp | grep node

# Periksa status proses PM2 (jika tersedia di hosting)
pm2 status
```

### 2. Verifikasi Database (MySQL)
Hubungkan ke MySQL lokal dari terminal untuk memastikan konektivitas:
```bash
mysql -u nama_user_db -p -e "USE nama_db; SHOW TABLES;"
```

### 3. Verifikasi Redis (Upstash)
Gunakan curl untuk melakukan ping ke redis via endpoint REST (jika menggunakan Upstash) atau periksa koneksi dengan script NodeJS sederhana:
```bash
node -e "const Redis = require('ioredis'); new Redis('REDIS_URL_ANDA').ping().then(console.log).catch(console.error);"
```

### 4. Verifikasi Health check Endpoint (API Utama)
Pastikan API merespons dengan HTTP 200 OK:
```bash
curl -i https://api.perpustakaanahmad.my.id/health
```

### 5. Verifikasi Connection Upgrade (WebSocket)
Pastikan server socket merespons permohonan upgrade protokol WebSocket:
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Host: socket.perpustakaanahmad.my.id" https://socket.perpustakaanahmad.my.id/socket.io/?EIO=4&transport=websocket
```
*Respons yang benar harus mengembalikan HTTP 101 Switching Protocols.*
