<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../../lib/api';
import { 
  Settings, Clock, CheckCircle, AlertTriangle
} from '@lucide/vue';

const settings = ref({
  max_borrow_days: 30,
  default_borrow_days: 14,
  max_books_per_borrower: 3,
});

const loading = ref(true);
const submitLoading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const fetchSettings = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const res: any = await api.get('/v1/settings');
    if (res.data) {
      settings.value = {
        max_borrow_days: res.data.max_borrow_days,
        default_borrow_days: res.data.default_borrow_days,
        max_books_per_borrower: res.data.max_books_per_borrower,
      };
    }
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat pengaturan peminjaman';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchSettings();
});

const handleSaveSettings = async () => {
  submitLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.put('/v1/settings', settings.value);
    successMsg.value = 'Pengaturan peminjaman berhasil diperbarui!';
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menyimpan pengaturan';
  } finally {
    submitLoading.value = false;
  }
};
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <!-- Feedback Alerts -->
    <div v-if="errorMsg" class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2">
      <CheckCircle class="w-5 h-5" /> {{ successMsg }}
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[250px]">
      <Clock class="w-8 h-8 animate-spin text-brand-blue-500 mb-2" />
      <span class="text-sm text-slate-500 dark:text-slate-400 font-semibold">Memuat pengaturan...</span>
    </div>

    <form v-else @submit.prevent="handleSaveSettings" class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm space-y-6">
      <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div class="w-10 h-10 rounded-xl bg-brand-blue-50 dark:bg-brand-blue-950/20 text-brand-blue-500 dark:text-brand-blue-400 flex items-center justify-center">
          <Settings class="w-5 h-5" />
        </div>
        <div>
          <h4 class="text-base font-bold text-slate-800 dark:text-white">Aturan Batas Peminjaman</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400">Atur masa pinjam dan batas jumlah buku maksimal</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Default Masa Pinjam (Hari)</label>
          <input 
            v-model.number="settings.default_borrow_days" 
            type="number" 
            min="1"
            required 
            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
          />
          <span class="text-[10px] text-slate-400 mt-1 block">Durasi peminjaman standar jika tidak ditentukan secara manual oleh admin.</span>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Maksimum Perpanjangan (Hari)</label>
          <input 
            v-model.number="settings.max_borrow_days" 
            type="number" 
            min="1"
            required 
            class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
          />
          <span class="text-[10px] text-slate-400 mt-1 block">Batas maksimal masa pinjam per buku.</span>
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Batas Buku Per Anggota (Eksemplar)</label>
        <input 
          v-model.number="settings.max_books_per_borrower" 
          type="number" 
          min="1"
          required 
          class="w-full md:w-1/2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
        />
        <span class="text-[10px] text-slate-400 mt-1 block">Jumlah maksimal buku aktif yang dapat dipinjam oleh satu anggota dalam waktu bersamaan.</span>
      </div>

      <button 
        type="submit" 
        :disabled="submitLoading"
        class="px-5 py-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-blue-500/10 cursor-pointer"
      >
        <Clock v-if="submitLoading" class="w-4 h-4 animate-spin" />
        Simpan Aturan Peminjaman
      </button>
    </form>
  </div>
</template>
