<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '../../../lib/api';
import { 
  Plus, Edit2, Trash2, Clock, X, Check, Library, Tag
} from '@lucide/vue';

const categories = ref<any[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const successMsg = ref('');

const fetchCategories = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const res: any = await api.get('/v1/categories');
    categories.value = res.data || [];
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat data kategori';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchCategories();
});

// Add Modal
const showAddModal = ref(false);
const categoryName = ref('');
const submitLoading = ref(false);

const openAddModal = () => {
  categoryName.value = '';
  showAddModal.value = true;
};

const handleCreate = async () => {
  if (!categoryName.value.trim()) return;
  submitLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.post('/v1/categories', { category_name: categoryName.value });
    successMsg.value = 'Kategori berhasil ditambahkan!';
    showAddModal.value = false;
    fetchCategories();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menambahkan kategori';
  } finally {
    submitLoading.value = false;
  }
};

// Edit Modal
const showEditModal = ref(false);
const editCategoryName = ref('');
const activeCategoryId = ref<number | null>(null);

const openEditModal = (c: any) => {
  activeCategoryId.value = c.category_id;
  editCategoryName.value = c.category_name;
  showEditModal.value = true;
};

const handleUpdate = async () => {
  if (!activeCategoryId.value || !editCategoryName.value.trim()) return;
  submitLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.put(`/v1/categories/${activeCategoryId.value}`, { category_name: editCategoryName.value });
    successMsg.value = 'Kategori berhasil diperbarui!';
    showEditModal.value = false;
    fetchCategories();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal memperbarui kategori';
  } finally {
    submitLoading.value = false;
  }
};

// Delete Category
const handleDelete = async (categoryId: number) => {
  if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.delete(`/v1/categories/${categoryId}`);
    successMsg.value = 'Kategori berhasil dihapus!';
    fetchCategories();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menghapus kategori';
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header Page Actions -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-xs text-slate-500 dark:text-slate-400">Kelola kategori buku perpustakaan</p>
      </div>
      <button 
        @click="openAddModal" 
        class="px-4 py-2.5 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-brand-blue-500/10 cursor-pointer"
      >
        <Plus class="w-4 h-4" /> Tambah Kategori
      </button>
    </div>

    <!-- Feedback Alerts -->
    <div v-if="errorMsg" class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
      {{ successMsg }}
    </div>

    <!-- Categories List -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[300px]">
      <Clock class="w-8 h-8 animate-spin text-brand-blue-500 mb-2" />
      <span class="text-sm text-slate-500 dark:text-slate-400 font-semibold">Memuat data kategori...</span>
    </div>

    <div v-else-if="categories.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl">
      <Tag class="w-16 h-16 stroke-[1.2] mb-3" />
      <span class="text-sm font-semibold">Tidak ada kategori yang ditemukan</span>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div 
        v-for="c in categories" 
        :key="c.category_id"
        class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-brand-blue-50 dark:bg-brand-blue-950/20 text-brand-blue-500 dark:text-brand-blue-400 flex items-center justify-center flex-shrink-0">
            <Tag class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h4 class="font-bold text-slate-800 dark:text-slate-100 truncate" :title="c.category_name">{{ c.category_name }}</h4>
            <span class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{{ c.category_slug }}</span>
          </div>
        </div>

        <div class="flex gap-1.5 flex-shrink-0">
          <button @click="openEditModal(c)" class="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-border transition-colors cursor-pointer">
            <Edit2 class="w-3.5 h-3.5" />
          </button>
          <button @click="handleDelete(c.category_id)" class="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30 transition-colors cursor-pointer">
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD CATEGORY -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
        <button @click="showAddModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Tambah Kategori Baru</h3>

        <form @submit.prevent="handleCreate" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nama Kategori</label>
            <input 
              v-model="categoryName" 
              type="text" 
              placeholder="e.g. Ke-PMII-an"
              required
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white"
            />
          </div>

          <button 
            type="submit" 
            :disabled="submitLoading || !categoryName.trim()"
            class="w-full py-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 disabled:opacity-50 text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock v-if="submitLoading" class="w-5 h-5 animate-spin" />
            <span v-else>Simpan Kategori</span>
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL: EDIT CATEGORY -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
        <button @click="showEditModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Edit Kategori</h3>

        <form @submit.prevent="handleUpdate" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nama Kategori</label>
            <input 
              v-model="editCategoryName" 
              type="text" 
              required
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white"
            />
          </div>

          <button 
            type="submit" 
            :disabled="submitLoading || !editCategoryName.trim()"
            class="w-full py-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 disabled:opacity-50 text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock v-if="submitLoading" class="w-5 h-5 animate-spin" />
            <span v-else>Simpan Perubahan</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
