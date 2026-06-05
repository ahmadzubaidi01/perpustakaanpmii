<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import api, { getImageUrl } from '../../lib/api';
import { 
  BookOpen, Users, ClipboardList, AlertCircle, Clock, 
  Search, ArrowRight, UserCheck, Calendar, Info, Bookmark, MapPin, X, Activity,
  Library
} from '@lucide/vue';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
const router = useRouter();
const catalogSearch = ref('');

const getRoleLabel = (role?: string) => {
  if (!role) return '';
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'komisariat_admin') return 'Admin Pustaka Jalanan';
  if (role === 'borrower') return 'Anggota';
  return role.replace('_', ' ');
};

// Dashboard Real-time Catalog Autocomplete/Preview Search
const searchResultBooks = ref<any[]>([]);
const searchLoading = ref(false);
const showDetailModal = ref(false);
const detailBook = ref<any>(null);

watch(catalogSearch, async (newVal) => {
  const trimmed = newVal.trim();
  if (trimmed.length < 2) {
    searchResultBooks.value = [];
    return;
  }
  searchLoading.value = true;
  try {
    const res: any = await api.get(`/v1/books?search=${encodeURIComponent(trimmed)}&limit=3`);
    searchResultBooks.value = res.data.books || [];
  } catch (err) {
    console.error(err);
    searchResultBooks.value = [];
  } finally {
    searchLoading.value = false;
  }
});

const openDetailModal = (book: any) => {
  detailBook.value = book;
  showDetailModal.value = true;
  searchResultBooks.value = []; // clear dropdown
};

const goToCatalog = () => {
  if (catalogSearch.value.trim()) {
    router.push({
      path: '/dashboard/books',
      query: { search: catalogSearch.value.trim() }
    });
  } else {
    router.push('/dashboard/books');
  }
};

const stats = ref<{
  active_borrowings?: number;
  total_borrowed?: number;
  overdue_borrowings?: number;
  total_books?: number;
  total_borrowers?: number;
  pending_requests?: any;
  popular_books?: any[];
  recent_borrowings?: any[];
  monthly_borrowings?: any[];
  monthly_returns?: any[];
  recent_audit_logs?: any[];
  active_users?: number;
  total_categories?: number;
  total_faculties?: number;
  total_study_programs?: number;
} | null>(null);
const loading = ref(true);

const fetchDashboardData = async () => {
  loading.value = true;
  try {
    const res: any = await api.get('/v1/dashboard');
    stats.value = res.data;
  } catch (err) {
    console.error('Failed to load dashboard statistics', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchDashboardData();
});

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const formatMonth = (m: number) => {
  return monthNames[m - 1] || String(m);
};

const maxMonthlyCount = computed(() => {
  if (!stats.value || !stats.value.monthly_borrowings) return 1;
  const counts = [
    ...stats.value.monthly_borrowings.map((b: any) => parseInt(b.count, 10)),
    ...(stats.value.monthly_returns || []).map((r: any) => parseInt(r.count, 10)),
    1 // fallback
  ];
  return Math.max(...counts);
});
</script>

<template>
  <div v-if="loading" class="flex flex-col items-center justify-center min-h-[400px]">
    <Clock class="w-10 h-10 animate-spin text-brand-blue-500 mb-2" />
    <span class="text-sm text-slate-500 dark:text-slate-400 font-semibold">Memuat dashboard...</span>
  </div>

  <div v-else class="space-y-6">
    <!-- WELCOME BANNER -->
    <div class="bg-gradient-to-r from-brand-blue-900 to-brand-blue-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      <!-- Background Graphic decoration -->
      <div class="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-1/4 translate-x-1/4">
        <BookOpen class="w-80 h-80" />
      </div>
      
      <div class="relative z-10 space-y-2">
        <span class="px-3 py-1 rounded-full bg-brand-gold-500/20 text-brand-gold-100 text-xs font-bold uppercase tracking-wider">
          {{ getRoleLabel(user?.user_role) }}
        </span>
        <h3 class="text-2xl font-black">Selamat Datang, {{ user?.full_name }}!</h3>
        <p class="text-brand-blue-100 text-sm max-w-xl">
          Di Sistem Informasi Peminjaman Pustaka Jalanan. Selamat membaca, belajar, dan berdiskusi!
        </p>
      </div>
    </div>

    <!-- MEMBER / BORROWER VIEW -->
    <div v-if="authStore.isBorrower" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 flex items-center justify-center">
            <ClipboardList class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Peminjaman Aktif</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.active_borrowings || 0 }}</p>
          </div>
        </div>

        <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
            <BookOpen class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Buku Dibaca</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.total_borrowed || 0 }}</p>
          </div>
        </div>

        <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 flex items-center justify-center">
            <AlertCircle class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Terlambat Dikembalikan</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.overdue_borrowings || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- RECENT BORROWINGS -->
        <div class="lg:col-span-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h4 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <ClipboardList class="w-5 h-5 text-brand-blue-500" /> Riwayat Peminjaman Terakhir
          </h4>

          <div v-if="!stats?.recent_borrowings || stats.recent_borrowings.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-400">
            <ClipboardList class="w-12 h-12 stroke-[1.5] mb-2" />
            <span class="text-sm">Belum ada riwayat peminjaman</span>
          </div>

          <div v-else class="space-y-4">
            <div 
              v-for="b in stats.recent_borrowings" 
              :key="b.borrowing_id"
              class="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div class="w-10 h-14 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex-shrink-0">
                <img v-if="b.book?.cover_image_url" :src="getImageUrl(b.book.cover_image_url)" alt="Cover" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">NO COVER</div>
              </div>
              <div class="flex-grow min-w-0">
                <h5 class="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{{ b.book?.book_title }}</h5>
                <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ b.book?.author_name }}</p>
                <div class="flex items-center gap-3 mt-1.5">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar class="w-3.5 h-3.5" /> {{ new Date(b.created_at).toLocaleDateString('id-ID') }}
                  </span>
                </div>
              </div>
              <div>
                <span 
                  :class="[
                    b.borrowing_status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' : '',
                    b.borrowing_status === 'borrowed' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' : '',
                    b.borrowing_status === 'returned' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : '',
                    b.borrowing_status === 'overdue' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' : '',
                    'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider'
                  ]"
                >
                  {{ b.borrowing_status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- QUICK CATALOG NAV -->
        <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <form @submit.prevent="goToCatalog" class="flex flex-col h-full justify-between">
            <div>
              <h4 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                <BookOpen class="w-5 h-5 text-brand-gold-500" /> Katalog Perpustakaan
              </h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-5">
                Cari dan telusuri berbagai koleksi buku yang tersedia di perpustakaan kami.
              </p>
              <div class="relative mb-5">
                <input 
                  v-model="catalogSearch"
                  type="text" 
                  placeholder="Judul, penulis, ISBN..." 
                  class="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
                />
                <span class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                  <Clock v-if="searchLoading" class="w-4 h-4 animate-spin text-brand-blue-500" />
                  <Search v-else class="w-4 h-4" />
                </span>

                <!-- Real-time Preview Dropdown -->
                <div v-if="catalogSearch.trim().length >= 2" class="absolute right-0 top-full mt-2 w-[92vw] sm:w-[480px] lg:w-[540px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-3 px-4 z-50 transition-all duration-300">
                  <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                    <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen class="w-3.5 h-3.5 text-brand-blue-500" /> Pratinjau Hasil Pencarian
                    </span>
                    <button 
                      type="button" 
                      @click="catalogSearch = ''" 
                      class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </div>

                  <div v-if="searchLoading" class="flex flex-col items-center justify-center py-8 text-slate-400">
                    <Clock class="w-6 h-6 animate-spin text-brand-blue-500 mb-1.5" />
                    <span class="text-xs">Mencari buku...</span>
                  </div>

                  <div v-else-if="searchResultBooks.length === 0" class="flex flex-col items-center justify-center py-8 text-slate-400">
                    <AlertCircle class="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1.5" />
                    <span class="text-xs">Buku tidak ditemukan</span>
                  </div>

                  <div v-else class="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    <div 
                      v-for="b in searchResultBooks" 
                      :key="b.book_id"
                      @click="openDetailModal(b)"
                      class="group p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex gap-4 transition-all duration-200 cursor-pointer text-left"
                    >
                      <!-- Cover Image -->
                      <div class="w-16 h-24 sm:w-20 sm:h-28 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm group-hover:shadow transition-shadow">
                        <img v-if="b.cover_image_url" :src="getImageUrl(b.cover_image_url)" alt="Cover" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div v-else class="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-1 p-2">
                          <BookOpen class="w-5 h-5" />
                          <span class="text-[8px] font-bold text-center leading-tight">NO COVER</span>
                        </div>
                      </div>

                      <!-- Book Info & Explanation -->
                      <div class="flex-grow min-w-0 flex flex-col justify-between">
                        <div>
                          <!-- Category Tag -->
                          <span class="text-[9px] font-extrabold uppercase tracking-wider bg-brand-blue-50 dark:bg-brand-blue-950/30 text-brand-blue-600 dark:text-brand-blue-400 px-2 py-0.5 rounded-full inline-block">
                            {{ b.category?.category_name || 'Uncategorized' }}
                          </span>
                          
                          <!-- Title -->
                          <h4 class="font-extrabold text-sm text-slate-800 dark:text-slate-100 mt-1 group-hover:text-brand-blue-500 transition-colors line-clamp-1" :title="b.book_title">
                            {{ b.book_title }}
                          </h4>
                          
                          <!-- Author -->
                          <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                            Karya: {{ b.author_name }}
                          </p>

                          <!-- Explanation / Description -->
                          <p class="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mt-2 italic bg-slate-50/50 dark:bg-slate-800/20 p-2 rounded-lg border border-slate-100/80 dark:border-slate-800/40">
                            {{ b.book_description || 'Tidak ada deskripsi untuk buku ini.' }}
                          </p>
                        </div>

                        <!-- Shelf Location / Stock Status -->
                        <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/50 dark:border-slate-800/20 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          <span>Rak: <span class="text-slate-700 dark:text-slate-300">{{ b.rack_location || '-' }}</span></span>
                          <span :class="b.available_stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'">
                            {{ b.available_stock > 0 ? `Tersedia (${b.available_stock})` : 'Habis Dipinjam' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              class="w-full py-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-center text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-blue-500/10 cursor-pointer"
            >
              Buka Katalog Buku <ArrowRight class="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- ADMIN / SUPER ADMIN VIEW -->
    <div v-else class="space-y-6">
      <!-- STATS GRID -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-500 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <BookOpen class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Buku</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.total_books || 0 }}</p>
          </div>
        </div>

        <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Users class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Anggota</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.total_borrowers || 0 }}</p>
          </div>
        </div>

        <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <ClipboardList class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Peminjaman</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.active_borrowings || 0 }}</p>
          </div>
        </div>

        <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <AlertCircle class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Keterlambatan</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.overdue_borrowings || 0 }}</p>
          </div>
        </div>

        <!-- Super Admin specific cards -->
        <div v-if="authStore.isSuperAdmin" class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-650 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
            <UserCheck class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">User Aktif</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.active_users || 0 }}</p>
          </div>
        </div>

        <div v-if="authStore.isSuperAdmin" class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Bookmark class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Kategori</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.total_categories || 0 }}</p>
          </div>
        </div>

        <div v-if="authStore.isSuperAdmin" class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-500 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <Library class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Fakultas</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.total_faculties || 0 }}</p>
          </div>
        </div>

        <div v-if="authStore.isSuperAdmin" class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div class="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-950/20 text-pink-500 dark:text-pink-400 flex items-center justify-center flex-shrink-0">
            <Library class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Prodi</h4>
            <p class="text-2xl font-black text-slate-800 dark:text-slate-100">{{ stats?.total_study_programs || 0 }}</p>
          </div>
        </div>
      </div>

      <!-- PENDING REQUESTS ALERTS -->
      <div v-if="stats?.pending_requests > 0" class="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex items-center justify-between">
        <div class="flex items-center gap-3 text-amber-800 dark:text-amber-400">
          <Info class="w-5 h-5 flex-shrink-0" />
          <span class="text-sm font-semibold">Ada {{ stats?.pending_requests }} permintaan peminjaman baru yang memerlukan persetujuan.</span>
        </div>
        <router-link to="/dashboard/borrowings?status=pending" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow transition-colors">
          Tinjau Permintaan
        </router-link>
      </div>

      <!-- ANALYTICS SECTION -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- CSS BAR CHART -->
        <div class="lg:col-span-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h4 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Activity class="w-5 h-5 text-brand-blue-500" /> Statistik Transaksi (6 Bulan Terakhir)
          </h4>

          <div v-if="!stats?.monthly_borrowings || stats.monthly_borrowings.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400">
            <Activity class="w-12 h-12 stroke-[1.5] mb-2" />
            <span class="text-sm">Belum ada statistik bulanan</span>
          </div>

          <div v-else class="space-y-6">
            <!-- Chart columns -->
            <div class="h-64 flex items-end justify-between gap-4 px-4 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div 
                v-for="b in stats.monthly_borrowings" 
                :key="`${b.year}-${b.month}`"
                class="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative"
              >
                <!-- Tooltip -->
                <div class="absolute -top-12 scale-0 group-hover:scale-100 transition-transform duration-200 bg-slate-900 text-white text-[10px] font-bold rounded-lg px-2 py-1 shadow-lg z-20 flex flex-col items-center leading-normal">
                  <span>Pinjam: {{ b.count }}</span>
                </div>

                <!-- Double Bars (borrow vs return) -->
                <div class="flex items-end gap-1.5 w-full justify-center h-full">
                  <div 
                    :style="{ height: `${(parseInt(b.count, 10) / maxMonthlyCount) * 90}%` }"
                    class="w-4 sm:w-6 bg-brand-blue-500 hover:bg-brand-blue-600 rounded-t-md transition-all duration-500"
                  ></div>
                </div>
                
                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  {{ formatMonth(b.month) }} '{{ String(b.year).slice(-2) }}
                </span>
              </div>
            </div>
            
            <div class="flex justify-center gap-6 text-xs font-semibold text-slate-500">
              <div class="flex items-center gap-2">
                <span class="w-3.5 h-3.5 rounded bg-brand-blue-500"></span> Jumlah Peminjaman
              </div>
            </div>
          </div>
        </div>

        <!-- POPULAR BOOKS -->
        <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h4 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
            <BookOpen class="w-5 h-5 text-brand-gold-500" /> Buku Terpopuler
          </h4>

          <div v-if="!stats?.popular_books || stats.popular_books.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-400">
            <BookOpen class="w-12 h-12 stroke-[1.5] mb-2" />
            <span class="text-sm">Belum ada data buku populer</span>
          </div>

          <div v-else class="space-y-4">
            <div 
              v-for="(pb, index) in stats.popular_books" 
              :key="pb.book_id"
              class="flex items-center gap-3.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <!-- Rank badge -->
              <span 
                :class="[
                  index === 0 ? 'bg-amber-500 text-white' : '',
                  index === 1 ? 'bg-slate-400 text-white' : '',
                  index === 2 ? 'bg-amber-600 text-white' : '',
                  index > 2 ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : '',
                  'w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0'
                ]"
              >
                {{ index + 1 }}
              </span>

              <!-- Cover Image -->
              <div class="w-9 h-12 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex-shrink-0">
                <img v-if="pb.book?.cover_image_url" :src="getImageUrl(pb.book.cover_image_url)" alt="Cover" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-400">NO COV</div>
              </div>

              <div class="flex-grow min-w-0">
                <h5 class="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{{ pb.book?.book_title }}</h5>
                <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">{{ pb.book?.author_name }}</p>
              </div>

              <span class="text-[10px] font-black text-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-950/20 px-2 py-1 rounded-lg">
                {{ pb.borrow_count }}x
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- SUPER ADMIN RECENT AUDIT LOGS -->
      <div v-if="authStore.isSuperAdmin && (stats?.recent_audit_logs?.length || 0) > 0" class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
        <h4 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Activity class="w-5 h-5 text-rose-500" /> Log Aktivitas Sistem Terakhir (Super Admin)
        </h4>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th class="py-3 px-4">Pengguna</th>
                <th class="py-3 px-4">Aktivitas</th>
                <th class="py-3 px-4">Tabel</th>
                <th class="py-3 px-4">IP Address</th>
                <th class="py-3 px-4">Waktu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="log in stats?.recent_audit_logs" :key="log.log_id" class="text-slate-700 dark:text-slate-200">
                <td class="py-3 px-4 font-semibold">{{ log.performed_by?.full_name || 'System / Guest' }}</td>
                <td class="py-3 px-4">
                  <span 
                    :class="[
                      log.action_type === 'CREATE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : '',
                      log.action_type === 'UPDATE' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' : '',
                      log.action_type === 'DELETE' || log.action_type === 'SOFT_DELETE' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' : '',
                      log.action_type === 'LOGIN' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400' : '',
                      'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider'
                    ]"
                  >
                    {{ log.action_type }}
                  </span>
                </td>
                <td class="py-3 px-4 text-xs font-mono">{{ log.table_name }}</td>
                <td class="py-3 px-4 text-xs text-slate-500">{{ log.ip_address || '-' }}</td>
                <td class="py-3 px-4 text-xs text-slate-500">{{ new Date(log.created_at).toLocaleString('id-ID') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL: DETIL BUKU (DASHBOARD PREVIEW) -->
  <div v-if="showDetailModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
      <button @click="showDetailModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
        <X class="w-5 h-5" />
      </button>

      <div class="w-full md:w-2/5 bg-slate-50 dark:bg-slate-800 p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-dark-border">
        <div class="w-44 h-60 bg-white dark:bg-dark-card rounded-lg overflow-hidden shadow-lg border border-slate-200 dark:border-dark-border relative animate-fade-in">
          <img v-if="detailBook?.cover_image_url" :src="getImageUrl(detailBook.cover_image_url)" alt="Cover" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
            <BookOpen class="w-8 h-8" />
            <span class="text-[9px] font-bold tracking-wider">NO COVER</span>
          </div>
        </div>
      </div>

      <div class="p-6 flex-grow flex flex-col justify-between max-h-[500px] overflow-y-auto">
        <div class="space-y-4">
          <div>
            <span class="text-[10px] text-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-950/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {{ detailBook?.category?.category_name || 'Uncategorized' }}
            </span>
            <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mt-2">{{ detailBook?.book_title }}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{{ detailBook?.author_name }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4 text-xs">
            <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Bookmark class="w-4 h-4 text-slate-400" />
              <span>Penerbit: <strong class="text-slate-800 dark:text-slate-100">{{ detailBook?.publisher_name || '-' }}</strong></span>
            </div>
            <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Calendar class="w-4 h-4 text-slate-400" />
              <span>Tahun: <strong class="text-slate-800 dark:text-slate-100">{{ detailBook?.publication_year || '-' }}</strong></span>
            </div>
            <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <MapPin class="w-4 h-4 text-slate-400" />
              <span>Rak: <strong class="text-slate-800 dark:text-slate-100">{{ detailBook?.rack_location || '-' }}</strong></span>
            </div>
            <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Info class="w-4 h-4 text-slate-400" />
              <span>ISBN: <strong class="text-slate-800 dark:text-slate-100">{{ detailBook?.isbn_code || '-' }}</strong></span>
            </div>
          </div>

          <div>
            <h5 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Deskripsi Buku</h5>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              {{ detailBook?.book_description || 'Tidak ada deskripsi untuk buku ini.' }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
          <span class="text-xs text-slate-500 font-semibold">Tersedia: <strong>{{ detailBook?.available_stock }} / {{ detailBook?.total_stock }} eksemplar</strong></span>
        </div>
      </div>
    </div>
  </div>
</template>
