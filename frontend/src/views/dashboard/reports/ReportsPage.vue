<script setup lang="ts">
import { ref } from 'vue';
import api from '../../../lib/api';
import { 
  FileText, Download, Clock, AlertCircle, CheckCircle
} from '@lucide/vue';

const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// Helper to convert JSON array to CSV and trigger download
const downloadCSV = (filename: string, headers: string[], rows: any[]) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map((val: any) => {
        const text = val === null || val === undefined ? '' : String(val);
        // Escape quotes
        return `"${text.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportBooksReport = async () => {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    // Fetch all books (high limit)
    const res: any = await api.get('/v1/books?limit=1000');
    const books = res.data.books || [];

    if (books.length === 0) {
      errorMsg.value = 'Tidak ada data buku untuk diekspor';
      return;
    }

    const headers = ['Kode Buku', 'Judul Buku', 'Penulis', 'Penerbit', 'ISBN', 'Tahun', 'Kategori', 'Lokasi Rak', 'Stok Tersedia', 'Stok Dipinjam', 'Total Stok', 'Status'];
    const rows = books.map((b: any) => [
      b.book_code,
      b.book_title,
      b.author_name,
      b.publisher_name,
      b.isbn_code,
      b.publication_year,
      b.category?.category_name || '',
      b.rack_location,
      b.available_stock,
      b.borrowed_stock,
      b.total_stock,
      b.book_status
    ]);

    downloadCSV(`laporan-koleksi-buku-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    successMsg.value = 'Laporan Koleksi Buku berhasil diunduh!';
  } catch (err: any) {
    errorMsg.value = 'Gagal memproses ekspor laporan buku';
  } finally {
    loading.value = false;
  }
};

const exportBorrowingsReport = async () => {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    // Fetch all borrowings (high limit)
    const res: any = await api.get('/v1/borrowings?limit=2000');
    const borrowings = res.data.borrowings || [];

    if (borrowings.length === 0) {
      errorMsg.value = 'Tidak ada data transaksi peminjaman untuk diekspor';
      return;
    }

    const headers = ['Kode Transaksi', 'Peminjam', 'NIM', 'Judul Buku', 'Kode Buku', 'Tgl Pinjam', 'Tgl Jatuh Tempo', 'Tgl Kembali', 'Status Peminjaman', 'Disetujui Oleh', 'Catatan'];
    const rows = borrowings.map((b: any) => [
      b.borrowing_code,
      b.borrower?.full_name || '',
      b.borrower?.nim || '',
      b.book?.book_title || '',
      b.book?.book_code || '',
      b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString('id-ID') : '',
      b.due_date ? new Date(b.due_date).toLocaleDateString('id-ID') : '',
      b.returned_at ? new Date(b.returned_at).toLocaleDateString('id-ID') : '',
      b.borrowing_status,
      b.approved_by?.full_name || '',
      b.notes || ''
    ]);

    downloadCSV(`laporan-transaksi-peminjaman-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    successMsg.value = 'Laporan Transaksi Peminjaman berhasil diunduh!';
  } catch (err: any) {
    errorMsg.value = 'Gagal memproses ekspor laporan peminjaman';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Feedback Alerts -->
    <div v-if="errorMsg" class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2">
      <CheckCircle class="w-5 h-5" /> {{ successMsg }}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Books Report Card -->
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm flex flex-col justify-between h-64">
        <div>
          <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-500 dark:text-blue-400 flex items-center justify-center mb-4">
            <FileText class="w-6 h-6" />
          </div>
          <h4 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Laporan Koleksi Buku</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Mengekspor daftar seluruh koleksi buku perpustakaan beserta kode buku, kategori, nomor rak, ketersediaan stok, dan status.
          </p>
        </div>
        <button 
          @click="exportBooksReport"
          :disabled="loading"
          class="w-full py-2.5 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-blue-500/10 cursor-pointer"
        >
          <Clock v-if="loading" class="w-4 h-4 animate-spin" />
          <Download v-else class="w-4 h-4" /> Ekspor Laporan (.CSV)
        </button>
      </div>

      <!-- Borrowings Report Card -->
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm flex flex-col justify-between h-64">
        <div>
          <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mb-4">
            <FileText class="w-6 h-6" />
          </div>
          <h4 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Laporan Transaksi Peminjaman</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Mengekspor seluruh riwayat transaksi peminjaman buku oleh anggota, termasuk tanggal peminjaman, jatuh tempo, pengembalian, status, dan catatan admin.
          </p>
        </div>
        <button 
          @click="exportBorrowingsReport"
          :disabled="loading"
          class="w-full py-2.5 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-blue-500/10 cursor-pointer"
        >
          <Clock v-if="loading" class="w-4 h-4 animate-spin" />
          <Download v-else class="w-4 h-4" /> Ekspor Laporan (.CSV)
        </button>
      </div>
    </div>
  </div>
</template>
