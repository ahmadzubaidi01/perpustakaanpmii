<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import api, { getImageUrl } from '../../../lib/api';
import { 
  ClipboardList, Search, Clock, Check, X, Trash2, 
  CornerUpLeft, Eye, MessageSquare, AlertCircle, Info,
  Barcode, UserCheck, BookOpen, RefreshCw, Camera
} from '@lucide/vue';
import { Html5Qrcode } from 'html5-qrcode';

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);

const borrowings = ref<any[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const successMsg = ref('');

// Tabs & Filters
const activeTab = ref('all'); // all, pending, borrowed, returned, overdue
const search = ref('');
const page = ref(1);
const totalPages = ref(1);
const limit = ref(15);

// Quick Borrow States
const scanBookCode = ref('');
const scannedBook = ref<any>(null);
const searchBookLoading = ref(false);
const borrowerSearch = ref('');
const matchedBorrowers = ref<any[]>([]);
const selectedBorrower = ref<any>(null);
const searchBorrowerLoading = ref(false);
const borrowDays = ref(14);
const quickBorrowLoading = ref(false);

// Quick Return States
const returnBookCode = ref('');
const quickReturnLoading = ref(false);

// Camera QR Scanner States
const showScannerModal = ref(false);
const scannerType = ref<'borrow' | 'return'>('borrow');
const html5QrCodeInstance = ref<any>(null);
const scannerError = ref('');

const startScanner = async (type: 'borrow' | 'return') => {
  scannerType.value = type;
  showScannerModal.value = true;
  scannerError.value = '';
  
  // Wait for the DOM element to mount
  setTimeout(async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-element");
      html5QrCodeInstance.value = html5QrCode;
      
      const config = { 
        fps: 10, 
        qrbox: { width: 220, height: 220 } 
      };
      
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          await handleScanSuccess(decodedText);
        },
        () => {
          // ignore scan failure frames
        }
      );
    } catch (err: any) {
      console.error(err);
      scannerError.value = 'Gagal mengakses kamera: ' + (err.message || 'Harap izinkan hak akses kamera pada peramban Anda.');
    }
  }, 300);
};

const stopScanner = async () => {
  if (html5QrCodeInstance.value) {
    try {
      await html5QrCodeInstance.value.stop();
    } catch (err) {
      console.error('Failed to stop scanner camera stream', err);
    }
    html5QrCodeInstance.value = null;
  }
  showScannerModal.value = false;
};

const handleScanSuccess = async (decodedText: string) => {
  await stopScanner();
  
  if (scannerType.value === 'borrow') {
    scanBookCode.value = decodedText;
  } else if (scannerType.value === 'return') {
    returnBookCode.value = decodedText;
    // Auto-submit return
    await handleQuickReturn();
  }
};

// Watch book scan code
watch(scanBookCode, async (newVal) => {
  const trimmed = newVal.trim();
  if (trimmed.length < 3) {
    scannedBook.value = null;
    return;
  }
  searchBookLoading.value = true;
  try {
    const res: any = await api.get(`/v1/books?search=${encodeURIComponent(trimmed)}&limit=1`);
    if (res.data.books && res.data.books.length > 0) {
      scannedBook.value = res.data.books[0];
    } else {
      scannedBook.value = null;
    }
  } catch (err) {
    scannedBook.value = null;
  } finally {
    searchBookLoading.value = false;
  }
});

// Watch borrower search input
watch(borrowerSearch, async (newVal) => {
  const trimmed = newVal.trim();
  if (trimmed.length < 2) {
    matchedBorrowers.value = [];
    return;
  }
  // Check if it's already the selected borrower string representation to avoid infinite lookup loop
  if (selectedBorrower.value && `${selectedBorrower.value.full_name} (${selectedBorrower.value.nim || 'No NIM'})` === newVal) {
    return;
  }
  searchBorrowerLoading.value = true;
  try {
    const res: any = await api.get(`/v1/users?search=${encodeURIComponent(trimmed)}&role=borrower&limit=5`);
    matchedBorrowers.value = res.data.users || [];
  } catch (err) {
    matchedBorrowers.value = [];
  } finally {
    searchBorrowerLoading.value = false;
  }
});

const selectBorrower = (user: any) => {
  selectedBorrower.value = user;
  borrowerSearch.value = `${user.full_name} (${user.nim || 'No NIM'})`;
  matchedBorrowers.value = [];
};

const clearQuickBorrowForm = () => {
  scanBookCode.value = '';
  scannedBook.value = null;
  borrowerSearch.value = '';
  selectedBorrower.value = null;
  matchedBorrowers.value = [];
  borrowDays.value = 14;
};

const handleQuickBorrow = async () => {
  if (!scanBookCode.value.trim()) {
    errorMsg.value = 'Kode buku / ISBN wajib diisi';
    return;
  }
  if (!selectedBorrower.value) {
    errorMsg.value = 'Peminjam wajib dipilih dari hasil pencarian';
    return;
  }
  
  quickBorrowLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  
  try {
    const res: any = await api.post('/v1/borrowings', {
      book_code: scanBookCode.value.trim(),
      user_id: selectedBorrower.value.user_id,
      borrow_days: borrowDays.value
    });
    successMsg.value = `Peminjaman berhasil diproses! Buku: "${res.data?.book?.book_title || scanBookCode.value}", Peminjam: "${selectedBorrower.value.full_name}"`;
    clearQuickBorrowForm();
    fetchBorrowings();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal memproses peminjaman cepat';
  } finally {
    quickBorrowLoading.value = false;
  }
};

const handleQuickReturn = async () => {
  if (!returnBookCode.value.trim()) {
    errorMsg.value = 'Kode buku / ISBN wajib diisi';
    return;
  }

  quickReturnLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const res: any = await api.post('/v1/borrowings/return-scan', {
      book_code: returnBookCode.value.trim()
    });
    successMsg.value = res.message || 'Pengembalian buku berhasil diproses secara otomatis!';
    returnBookCode.value = '';
    fetchBorrowings();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal memproses pengembalian otomatis';
  } finally {
    quickReturnLoading.value = false;
  }
};

const fetchBorrowings = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    let url = `/v1/borrowings?page=${page.value}&limit=${limit.value}`;
    if (activeTab.value !== 'all') {
      url += `&status=${activeTab.value}`;
    }
    if (search.value) {
      url += `&search=${encodeURIComponent(search.value)}`;
    }

    const res: any = await api.get(url);
    borrowings.value = res.data.borrowings || [];
    totalPages.value = res.data.pagination.totalPages || 1;
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat data peminjaman';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchBorrowings();
});

watch([activeTab, search], () => {
  page.value = 1;
  fetchBorrowings();
});

// Admin borrowing operations
const handleApprove = async (borrowingId: number) => {
  if (!confirm('Setujui permintaan peminjaman buku ini?')) return;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.patch(`/v1/borrowings/${borrowingId}/approve`);
    successMsg.value = 'Permintaan peminjaman berhasil disetujui!';
    fetchBorrowings();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menyetujui peminjaman';
  }
};

const handleReject = async (borrowingId: number) => {
  if (!confirm('Tolak permintaan peminjaman ini?')) return;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.patch(`/v1/borrowings/${borrowingId}/reject`);
    successMsg.value = 'Permintaan peminjaman ditolak!';
    fetchBorrowings();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menolak peminjaman';
  }
};

// Process Return Dialog
const showReturnModal = ref(false);
const returnNotes = ref('');
const activeReturnId = ref<number | null>(null);

const openReturnModal = (borrowingId: number) => {
  activeReturnId.value = borrowingId;
  returnNotes.value = '';
  showReturnModal.value = true;
};

const submitReturn = async () => {
  if (!activeReturnId.value) return;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.patch(`/v1/borrowings/${activeReturnId.value}/return`, {
      notes: returnNotes.value
    });
    successMsg.value = 'Buku berhasil dikembalikan!';
    showReturnModal.value = false;
    fetchBorrowings();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal memproses pengembalian';
  }
};

const handleDelete = async (borrowingId: number) => {
  if (!confirm('Hapus rekaman data peminjaman ini?')) return;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.delete(`/v1/borrowings/${borrowingId}`);
    successMsg.value = 'Data peminjaman berhasil dihapus!';
    fetchBorrowings();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menghapus data';
  }
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
    case 'borrowed': return 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
    case 'returned': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
    case 'overdue': return 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450 border-rose-100 dark:border-rose-900/30';
    default: return 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400';
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Feedback Alerts -->
    <div v-if="errorMsg" class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
      {{ successMsg }}
    </div>

    <!-- QUICK TRANSACTION PANELS (ADMIN ONLY) -->
    <div v-if="isAdmin" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Quick Borrow Panel -->
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm space-y-4">
        <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div class="p-2 rounded-xl bg-brand-blue-50 dark:bg-brand-blue-950/20 text-brand-blue-500 dark:text-brand-blue-400">
            <UserCheck class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-sm font-extrabold text-slate-800 dark:text-white">Alur Peminjaman (Pilih Anggota > Waktu > Scan QR)</h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Ikuti urutan langkah di bawah ini untuk menyetujui peminjaman baru</p>
          </div>
        </div>

        <div class="space-y-4">
          <!-- 1. User Lookup Input -->
          <div class="space-y-1.5 relative">
            <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Langkah 1: Cari & Pilih Peminjam</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search class="w-4 h-4" />
              </span>
              <input 
                v-model="borrowerSearch"
                type="text" 
                placeholder="Ketik nama atau NIM anggota..." 
                class="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
              />
              <span class="absolute inset-y-0 right-0 pr-3 flex items-center">
                <Clock v-if="searchBorrowerLoading" class="w-4 h-4 animate-spin text-slate-400" />
                <span v-else-if="selectedBorrower" class="text-emerald-500"><Check class="w-4 h-4" /></span>
              </span>
            </div>

            <!-- Dropdown Results -->
            <div v-if="matchedBorrowers.length > 0" class="absolute left-0 right-0 mt-1 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl shadow-xl py-1.5 z-50 max-h-48 overflow-y-auto">
              <button 
                v-for="u in matchedBorrowers" 
                :key="u.user_id"
                type="button"
                @click="selectBorrower(u)"
                class="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex flex-col transition-colors cursor-pointer text-xs"
              >
                <span class="font-bold text-slate-800 dark:text-white">{{ u.full_name }}</span>
                <span class="text-[10px] text-slate-500 font-mono">{{ u.nim || 'NIM tidak diisi' }} · {{ u.email_address }}</span>
              </button>
            </div>
          </div>

          <!-- 2. Borrow Days Duration Input -->
          <div class="space-y-1.5">
            <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Langkah 2: Tentukan Durasi Peminjaman (Hari)</label>
            <input 
              v-model.number="borrowDays"
              type="number" 
              min="1"
              max="90"
              required
              :disabled="!selectedBorrower"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue-500 disabled:opacity-50"
            />
          </div>

          <!-- 3. Book Scan Input / Scanner Button -->
          <div class="space-y-1.5">
            <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Langkah 3: Scan QR / Kode Buku</label>
            <div class="flex gap-2">
              <div class="relative flex-grow">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Barcode class="w-4 h-4" />
                </span>
                <input 
                  v-model="scanBookCode"
                  type="text" 
                  placeholder="Scan QR / ketik ISBN / kode..." 
                  :disabled="!selectedBorrower"
                  class="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue-500 disabled:opacity-50"
                />
                <span class="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <Clock v-if="searchBookLoading" class="w-4 h-4 animate-spin text-slate-400" />
                  <span v-else-if="scannedBook" class="text-emerald-500" title="Buku ditemukan"><Check class="w-4 h-4" /></span>
                </span>
              </div>
              <button 
                type="button" 
                @click="startScanner('borrow')"
                :disabled="!selectedBorrower"
                class="px-3.5 py-2 bg-brand-blue-50 hover:bg-brand-blue-100 dark:bg-brand-blue-950/20 dark:hover:bg-brand-blue-950/40 text-brand-blue-500 dark:text-brand-blue-400 border border-brand-blue-100 dark:border-brand-blue-900/30 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Camera class="w-4 h-4" /> Scan Kamera
              </button>
            </div>
            <!-- Match Preview -->
            <div v-if="scannedBook" class="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-2.5 mt-2">
              <div class="w-7 h-10 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                <img v-if="scannedBook.cover_image_url" :src="getImageUrl(scannedBook.cover_image_url)" alt="Cover" class="w-full h-full object-cover" />
                <BookOpen v-else class="w-4 h-4 text-slate-400" />
              </div>
              <div class="min-w-0">
                <h5 class="font-bold text-xs text-slate-800 dark:text-white truncate">{{ scannedBook.book_title }}</h5>
                <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">{{ scannedBook.author_name }} · Stok: {{ scannedBook.available_stock }}</p>
              </div>
            </div>
            <p v-else-if="scanBookCode.trim().length >= 3 && !searchBookLoading" class="text-[10px] text-amber-500 font-semibold mt-1">Buku tidak ditemukan. Pastikan barcode/kode sesuai.</p>
          </div>

          <!-- 4. Submit & Approve button -->
          <button 
            type="button"
            @click="handleQuickBorrow"
            :disabled="quickBorrowLoading || !selectedBorrower || !scannedBook"
            class="w-full py-2.5 mt-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Clock v-if="quickBorrowLoading" class="w-4 h-4 animate-spin" />
            <Check class="w-4 h-4" />
            Langkah 4: Setujui Peminjaman
          </button>
        </div>
      </div>

      <!-- Quick Return Panel -->
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
        <div class="space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 dark:text-emerald-400">
              <RefreshCw class="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 class="text-sm font-extrabold text-slate-800 dark:text-white">Pengembalian Buku (Kamera Scan QR)</h4>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Scan QR Code/Barcode buku yang dikembalikan menggunakan kamera untuk pemrosesan instan</p>
            </div>
          </div>

          <form @submit.prevent="handleQuickReturn" class="space-y-4">
            <div class="space-y-1.5">
              <label class="block text-[11px] font-bold text-slate-650 dark:text-slate-300 uppercase tracking-wider">Scan Barcode / Kode Buku</label>
              <div class="flex gap-2">
                <div class="relative flex-grow">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Barcode class="w-4 h-4" />
                  </span>
                  <input 
                    v-model="returnBookCode"
                    type="text" 
                    placeholder="Scan QR / ketik kode..." 
                    class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
                  />
                </div>
                <button 
                  type="button" 
                  @click="startScanner('return')"
                  class="px-3.5 py-2 bg-brand-blue-50 hover:bg-brand-blue-100 dark:bg-brand-blue-950/20 dark:hover:bg-brand-blue-950/40 text-brand-blue-500 dark:text-brand-blue-400 border border-brand-blue-100 dark:border-brand-blue-900/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera class="w-4 h-4" /> Scan Kamera
                </button>
              </div>
            </div>

            <button 
              type="submit"
              :disabled="quickReturnLoading || !returnBookCode.trim()"
              class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Clock v-if="quickReturnLoading" class="w-4 h-4 animate-spin" />
              <RefreshCw v-else class="w-4 h-4" />
              Proses Pengembalian Otomatis
            </button>
          </form>
        </div>

        <!-- Help Info -->
        <div class="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 leading-normal flex items-start gap-2">
          <Info class="w-3.5 h-3.5 text-brand-blue-500 flex-shrink-0 mt-0.5" />
          <span>Scanner Anda mengirim data berupa teks diikuti karakter Enter. Letakkan kursor di input teks di atas dan lakukan scan untuk eksekusi cepat.</span>
        </div>
      </div>
    </div>

    <!-- Status Tabs -->
    <div class="border-b border-slate-200 dark:border-dark-border flex gap-4 overflow-x-auto pb-px">
      <button 
        v-for="tab in ['all', 'pending', 'borrowed', 'returned', 'overdue']" 
        :key="tab"
        @click="activeTab = tab"
        :class="[
          activeTab === tab 
            ? 'border-brand-blue-500 text-brand-blue-500 font-bold' 
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
          'py-3 border-b-2 px-1 text-sm uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer'
        ]"
      >
        {{ tab === 'all' ? 'Semua' : tab }}
      </button>
    </div>

    <!-- Filter & Search (For Admins) -->
    <div v-if="isAdmin" class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-4 shadow-sm">
      <div class="relative">
        <input 
          v-model="search" 
          type="text" 
          placeholder="Cari nama peminjam atau NIM..." 
          class="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
        />
        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
          <Search class="w-5 h-5" />
        </span>
      </div>
    </div>

    <!-- Data Table -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[300px]">
      <Clock class="w-8 h-8 animate-spin text-brand-blue-500 mb-2" />
      <span class="text-sm text-slate-500 dark:text-slate-400 font-semibold">Memuat data peminjaman...</span>
    </div>

    <div v-else-if="borrowings.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl">
      <ClipboardList class="w-16 h-16 stroke-[1.2] mb-3" />
      <span class="text-sm font-semibold">Tidak ada transaksi peminjaman</span>
    </div>

    <div v-else class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900">
              <th class="py-3.5 px-6">Peminjam</th>
              <th class="py-3.5 px-6">Buku</th>
              <th class="py-3.5 px-6">Tanggal Pinjam</th>
              <th class="py-3.5 px-6">Tenggat</th>
              <th class="py-3.5 px-6">Kembali</th>
              <th class="py-3.5 px-6">Status</th>
              <th class="py-3.5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="b in borrowings" :key="b.borrowing_id" class="text-slate-700 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
              <td class="py-4 px-6">
                <div class="font-bold text-slate-800 dark:text-white">{{ b.borrower?.full_name }}</div>
                <div class="text-xs text-slate-500 font-mono mt-0.5">{{ b.borrower?.nim }}</div>
              </td>
              <td class="py-4 px-6 max-w-xs">
                <div class="font-semibold truncate" :title="b.book?.book_title">{{ b.book?.book_title }}</div>
                <div class="text-xs text-slate-500 font-mono mt-0.5">{{ b.book?.book_code }}</div>
              </td>
              <td class="py-4 px-6 text-xs font-medium">
                {{ b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString('id-ID') : '-' }}
              </td>
              <td class="py-4 px-6 text-xs font-medium">
                {{ b.due_date ? new Date(b.due_date).toLocaleDateString('id-ID') : '-' }}
              </td>
              <td class="py-4 px-6 text-xs font-medium">
                {{ b.returned_at ? new Date(b.returned_at).toLocaleDateString('id-ID') : '-' }}
              </td>
              <td class="py-4 px-6">
                <span :class="[getStatusBadgeClass(b.borrowing_status), 'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border']">
                  {{ b.borrowing_status }}
                </span>
              </td>
              <td class="py-4 px-6 text-right">
                <!-- Action for Borrower -->
                <span v-if="!isAdmin" class="text-xs text-slate-500 italic">No admin access</span>

                <!-- Action for Admin -->
                <div v-else class="flex justify-end gap-2">
                  <!-- Pending actions -->
                  <template v-if="b.borrowing_status === 'pending'">
                    <button 
                      @click="handleApprove(b.borrowing_id)" 
                      title="Setujui Peminjaman"
                      class="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 transition-colors cursor-pointer"
                    >
                      <Check class="w-4 h-4" />
                    </button>
                    <button 
                      @click="handleReject(b.borrowing_id)" 
                      title="Tolak Peminjaman"
                      class="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 transition-colors cursor-pointer"
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </template>

                  <!-- Active actions -->
                  <template v-if="b.borrowing_status === 'borrowed' || b.borrowing_status === 'overdue'">
                    <button 
                      @click="openReturnModal(b.borrowing_id)" 
                      title="Proses Pengembalian"
                      class="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 transition-colors cursor-pointer"
                    >
                      <CornerUpLeft class="w-4 h-4" />
                    </button>
                  </template>

                  <!-- History actions -->
                  <button 
                    v-if="b.borrowing_status === 'returned'"
                    @click="handleDelete(b.borrowing_id)" 
                    title="Hapus Rekaman"
                    class="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-dark-border transition-colors cursor-pointer"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL: RETURN NOTES -->
    <div v-if="showReturnModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
        <button @click="showReturnModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Proses Pengembalian Buku</h3>

        <form @submit.prevent="submitReturn" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Catatan Pengembalian (Opsional)</label>
            <textarea 
              v-model="returnNotes" 
              rows="3" 
              placeholder="Catatan kondisi buku saat dikembalikan..."
              class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
            ></textarea>
          </div>

          <button 
            type="submit" 
            class="w-full py-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-sm tracking-wide transition-colors cursor-pointer"
          >
            Konfirmasi Pengembalian
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL: CAMERA SCANNER (QR / BARCODE) -->
    <div v-if="showScannerModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative flex flex-col animate-fade-in">
        <!-- Close Scanner Button -->
        <button @click="stopScanner" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-base font-extrabold text-slate-800 dark:text-white mb-1">
          Pemindaian Kamera (Scan QR / Barcode)
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Arahkan QR Code atau Barcode Buku ke dalam kotak kamera di bawah
        </p>

        <!-- Camera scanning display area -->
        <div class="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-200 dark:border-dark-border">
          <div id="qr-reader-element" class="w-full h-full"></div>
          
          <!-- Guide overlay -->
          <div class="absolute inset-0 pointer-events-none flex items-center justify-center border-4 border-dashed border-brand-blue-500/60 rounded-xl m-4 animate-pulse">
            <span class="text-[10px] text-white bg-slate-900/70 px-2 py-1 rounded font-bold uppercase tracking-wider">Kotak Pindai</span>
          </div>
        </div>

        <!-- Scanner Error message -->
        <div v-if="scannerError" class="mt-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-500 text-xs font-semibold">
          {{ scannerError }}
        </div>

        <button 
          type="button" 
          @click="stopScanner" 
          class="w-full mt-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
        >
          Batal & Tutup Kamera
        </button>
      </div>
    </div>
  </div>
</template>
