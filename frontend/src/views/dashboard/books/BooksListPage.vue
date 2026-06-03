<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../../stores/auth';
import api, { getImageUrl } from '../../../lib/api';
import { 
  Plus, Edit2, Trash2, Search, Filter, BookOpen, Clock, 
  ChevronLeft, ChevronRight, X, Eye, Bookmark, MapPin, 
  Calendar, Check, AlertTriangle
} from '@lucide/vue';

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);
const route = useRoute();

const books = ref<any[]>([]);
const categories = ref<any[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const successMsg = ref('');

// Pagination & Filter States
const search = ref('');
const selectedCategory = ref('');
const page = ref(1);
const totalPages = ref(1);
const limit = ref(10);

const fetchBooks = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    let url = `/v1/books?page=${page.value}&limit=${limit.value}`;
    if (search.value) url += `&search=${encodeURIComponent(search.value)}`;
    if (selectedCategory.value) url += `&category_id=${selectedCategory.value}`;
    
    const res: any = await api.get(url);
    books.value = res.data.books || [];
    totalPages.value = res.data.pagination.totalPages || 1;
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat daftar buku';
  } finally {
    loading.value = false;
  }
};

const fetchCategories = async () => {
  try {
    const res: any = await api.get('/v1/categories');
    categories.value = res.data || [];
  } catch (err) {
    console.error('Failed to load categories', err);
  }
};

onMounted(() => {
  if (route.query.search) {
    search.value = String(route.query.search);
  }
  fetchBooks();
  fetchCategories();
});

// Watch route.query.search to update the search ref dynamically (e.g., when clicking "Buku" in sidebar)
watch(() => route.query.search, (newSearch) => {
  const targetVal = newSearch ? String(newSearch) : '';
  if (search.value !== targetVal) {
    search.value = targetVal;
  }
});

watch([search, selectedCategory], () => {
  page.value = 1;
  fetchBooks();
});

const handlePageChange = (p: number) => {
  page.value = p;
  fetchBooks();
};

// Form Modals
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDetailModal = ref(false);
const submitLoading = ref(false);

const detailBook = ref<any>(null);

// Form Fields
const bookForm = ref({
  book_id: null as number | null,
  book_title: '',
  author_name: '',
  publisher_name: '',
  isbn_code: '',
  publication_year: '',
  category_id: '',
  rack_location: '',
  total_stock: '1',
  book_description: '',
  book_status: 'available',
});
const coverFile = ref<File | null>(null);

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    coverFile.value = target.files[0];
  }
};

const openAddModal = () => {
  bookForm.value = {
    book_id: null,
    book_title: '',
    author_name: '',
    publisher_name: '',
    isbn_code: '',
    publication_year: '',
    category_id: categories.value[0]?.category_id || '',
    rack_location: '',
    total_stock: '1',
    book_description: '',
    book_status: 'available',
  };
  coverFile.value = null;
  showAddModal.value = true;
};

const openEditModal = (book: any) => {
  bookForm.value = {
    book_id: book.book_id,
    book_title: book.book_title,
    author_name: book.author_name,
    publisher_name: book.publisher_name || '',
    isbn_code: book.isbn_code || '',
    publication_year: book.publication_year ? String(book.publication_year) : '',
    category_id: book.category_id || '',
    rack_location: book.rack_location || '',
    total_stock: String(book.total_stock),
    book_description: book.book_description || '',
    book_status: book.book_status,
  };
  coverFile.value = null;
  showEditModal.value = true;
};

const openDetailModal = (book: any) => {
  detailBook.value = book;
  showDetailModal.value = true;
};

const submitAddBook = async () => {
  submitLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const formData = new FormData();
    Object.entries(bookForm.value).forEach(([key, val]) => {
      if (val !== null) formData.append(key, String(val));
    });
    if (coverFile.value) {
      formData.append('cover_image', coverFile.value);
    }

    await api.post('/v1/books', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    successMsg.value = 'Buku berhasil ditambahkan!';
    showAddModal.value = false;
    fetchBooks();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menambahkan buku';
  } finally {
    submitLoading.value = false;
  }
};

const submitEditBook = async () => {
  submitLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const formData = new FormData();
    Object.entries(bookForm.value).forEach(([key, val]) => {
      if (val !== null) formData.append(key, String(val));
    });
    if (coverFile.value) {
      formData.append('cover_image', coverFile.value);
    }

    await api.put(`/v1/books/${bookForm.value.book_id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    successMsg.value = 'Buku berhasil diperbarui!';
    showEditModal.value = false;
    fetchBooks();
  } catch (err: any) {
  console.error('ADD BOOK ERROR:', err);

  errorMsg.value =
    err?.message ||
    err?.error?.message ||
    err?.data?.message ||
    'Gagal menambahkan buku';
} finally {
    submitLoading.value = false;
  }
};

const deleteBook = async (bookId: number) => {
  if (!confirm('Apakah Anda yakin ingin menghapus buku ini?')) return;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.delete(`/v1/books/${bookId}`);
    successMsg.value = 'Buku berhasil dihapus!';
    fetchBooks();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menghapus buku';
  }
};

// Borrower Request Borrowing
const requestBorrow = async (bookId: number) => {
  if (!confirm('Ajukan peminjaman untuk buku ini?')) return;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.post('/v1/borrowings', { book_id: bookId });
    successMsg.value = 'Permintaan peminjaman berhasil diajukan! Menunggu persetujuan admin.';
    fetchBooks();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal mengajukan peminjaman';
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header Page Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <p class="text-xs text-slate-500 dark:text-slate-400">Total koleksi buku perpustakaan</p>
      </div>
      <button 
        v-if="isAdmin" 
        @click="openAddModal" 
        class="px-4 py-2.5 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-brand-blue-500/10 cursor-pointer"
      >
        <Plus class="w-4 h-4" /> Tambah Buku Baru
      </button>
    </div>

    <!-- Feedback Alerts -->
    <div v-if="errorMsg" class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
      {{ successMsg }}
    </div>

    <!-- Filters & Search -->
    <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
      <div class="flex-grow relative">
        <input 
          v-model="search" 
          type="text" 
          placeholder="Cari judul buku, penulis, isbn, atau kode..." 
          class="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
        />
        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
          <Search class="w-5 h-5" />
        </span>
      </div>

      <div class="w-full md:w-64">
        <select 
          v-model="selectedCategory"
          class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
        >
          <option value="">Semua Kategori</option>
          <option v-for="c in categories" :key="c.category_id" :value="c.category_id">{{ c.category_name }}</option>
        </select>
      </div>
    </div>

    <!-- Books Grid/List -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[300px]">
      <Clock class="w-8 h-8 animate-spin text-brand-blue-500 mb-2" />
      <span class="text-sm text-slate-500 dark:text-slate-400 font-semibold">Memuat daftar buku...</span>
    </div>

    <div v-else-if="books.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl">
      <BookOpen class="w-16 h-16 stroke-[1.2] mb-3" />
      <span class="text-sm font-semibold">Tidak ada buku yang ditemukan</span>
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div 
          v-for="b in books" 
          :key="b.book_id"
          class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-300 group"
        >
          <!-- Cover container -->
          <div class="relative pt-[140%] bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <img 
              v-if="b.cover_image_url" 
              :src="getImageUrl(b.cover_image_url)" 
              alt="Cover" 
              class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 p-4">
              <BookOpen class="w-10 h-10 stroke-[1.5]" />
              <span class="text-[10px] font-bold text-center uppercase tracking-wider">No Cover image</span>
            </div>

            <!-- Status badges -->
            <span 
              :class="[
                b.book_status === 'available' ? 'bg-emerald-500 text-white' : '',
                b.book_status === 'borrowed' ? 'bg-amber-500 text-white' : '',
                b.book_status === 'damaged' ? 'bg-rose-500 text-white' : '',
                b.book_status === 'lost' ? 'bg-slate-600 text-white' : '',
                'absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow'
              ]"
            >
              {{ b.book_status }}
            </span>
          </div>

          <!-- Description info -->
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div class="space-y-1">
              <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                {{ b.category?.category_name || 'Uncategorized' }}
              </span>
              <h4 class="font-extrabold text-sm text-slate-800 dark:text-slate-100 line-clamp-2 min-h-[40px] group-hover:text-brand-blue-500 transition-colors" :title="b.book_title">
                {{ b.book_title }}
              </h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ b.author_name }}</p>
            </div>

            <div class="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 space-y-3">
              <div class="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>Stok: {{ b.available_stock }} / {{ b.total_stock }}</span>
                <span class="text-slate-400 font-mono">{{ b.book_code }}</span>
              </div>

              <!-- Action buttons -->
              <div class="flex gap-2 w-full">
                <button 
                  @click="openDetailModal(b)" 
                  :class="[authStore.isBorrower ? 'w-full' : 'flex-1', 'py-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors border border-slate-200 dark:border-dark-border cursor-pointer']"
                >
                  <Eye class="w-3.5 h-3.5" /> Detail
                </button>

                <!-- Admin Action Menu -->
                <div v-if="isAdmin" class="flex gap-1.5 flex-1">
                  <button @click="openEditModal(b)" class="flex-1 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 transition-colors cursor-pointer flex items-center justify-center">
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>
                  <button @click="deleteBook(b.book_id)" class="flex-1 p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30 transition-colors cursor-pointer flex items-center justify-center">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Footer -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-4">
        <button 
          @click="handlePageChange(page - 1)" 
          :disabled="page === 1"
          class="p-2 rounded-lg border border-slate-200 dark:border-dark-border disabled:opacity-50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Halaman {{ page }} dari {{ totalPages }}</span>
        <button 
          @click="handlePageChange(page + 1)" 
          :disabled="page === totalPages"
          class="p-2 rounded-lg border border-slate-200 dark:border-dark-border disabled:opacity-50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- MODAL: DETIL BUKU -->
    <div v-if="showDetailModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
        <button @click="showDetailModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <div class="w-full md:w-2/5 bg-slate-50 dark:bg-slate-800 p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-dark-border">
          <div class="w-44 h-60 bg-white dark:bg-dark-card rounded-lg overflow-hidden shadow-lg border border-slate-200 dark:border-dark-border relative">
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

    <!-- MODAL: TAMBAH BUKU -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
        <button @click="showAddModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Tambah Buku Baru</h3>

        <form @submit.prevent="submitAddBook" class="space-y-4 overflow-y-auto pr-1 flex-1">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Judul Buku</label>
            <input v-model="bookForm.book_title" type="text" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Penulis</label>
              <input v-model="bookForm.author_name" type="text" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Penerbit</label>
              <input v-model="bookForm.publisher_name" type="text" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">ISBN Code (Opsional)</label>
              <input v-model="bookForm.isbn_code" type="text" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Tahun Terbit</label>
              <input v-model="bookForm.publication_year" type="number" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Kategori</label>
              <select v-model="bookForm.category_id" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm">
                <option v-for="c in categories" :key="c.category_id" :value="c.category_id">{{ c.category_name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Lokasi Rak</label>
              <input v-model="bookForm.rack_location" type="text" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Total Stok</label>
              <input v-model="bookForm.total_stock" type="number" min="1" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Cover Image</label>
              <input type="file" @change="handleFileChange" accept="image/*" class="w-full text-xs" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Deskripsi Buku</label>
            <textarea v-model="bookForm.book_description" rows="3" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm"></textarea>
          </div>

          <button 
            type="submit" 
            :disabled="submitLoading"
            class="w-full py-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock v-if="submitLoading" class="w-5 h-5 animate-spin" />
            <span v-else>Simpan Buku</span>
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL: EDIT BUKU -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
        <button @click="showEditModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Edit Detail Buku</h3>

        <form @submit.prevent="submitEditBook" class="space-y-4 overflow-y-auto pr-1 flex-1">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Judul Buku</label>
            <input v-model="bookForm.book_title" type="text" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Penulis</label>
              <input v-model="bookForm.author_name" type="text" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Penerbit</label>
              <input v-model="bookForm.publisher_name" type="text" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">ISBN Code (Opsional)</label>
              <input v-model="bookForm.isbn_code" type="text" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Tahun Terbit</label>
              <input v-model="bookForm.publication_year" type="number" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Kategori</label>
              <select v-model="bookForm.category_id" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm">
                <option v-for="c in categories" :key="c.category_id" :value="c.category_id">{{ c.category_name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Lokasi Rak</label>
              <input v-model="bookForm.rack_location" type="text" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Total Stok</label>
              <input v-model="bookForm.total_stock" type="number" min="1" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Status Buku</label>
              <select v-model="bookForm.book_status" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm">
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
                <option value="damaged">Damaged</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Cover Image</label>
              <input type="file" @change="handleFileChange" accept="image/*" class="w-full text-xs" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Deskripsi Buku</label>
            <textarea v-model="bookForm.book_description" rows="3" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm"></textarea>
          </div>

          <button 
            type="submit" 
            :disabled="submitLoading"
            class="w-full py-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock v-if="submitLoading" class="w-5 h-5 animate-spin" />
            <span v-else>Update Buku</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
