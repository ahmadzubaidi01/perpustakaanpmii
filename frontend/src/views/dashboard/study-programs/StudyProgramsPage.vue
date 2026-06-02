<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../../lib/api';
import { 
  Plus, Edit2, Trash2, Clock, X, Library
} from '@lucide/vue';

const programs = ref<any[]>([]);
const faculties = ref<any[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const successMsg = ref('');

const fetchPrograms = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const res: any = await api.get('/v1/study-programs');
    programs.value = res.data || [];
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat data program studi';
  } finally {
    loading.value = false;
  }
};

const fetchFaculties = async () => {
  try {
    const res: any = await api.get('/v1/faculties');
    faculties.value = res.data || [];
  } catch (err) {
    console.error('Failed to load faculties', err);
  }
};

onMounted(() => {
  fetchPrograms();
  fetchFaculties();
});

// Add Modal
const showAddModal = ref(false);
const programName = ref('');
const programCode = ref('');
const selectedFacultyId = ref<number | null>(null);
const submitLoading = ref(false);

const openAddModal = () => {
  programName.value = '';
  programCode.value = '';
  selectedFacultyId.value = faculties.value[0]?.faculty_id || null;
  showAddModal.value = true;
};

const handleCreate = async () => {
  if (!programName.value.trim() || !programCode.value.trim() || !selectedFacultyId.value) return;
  submitLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.post('/v1/study-programs', {
      program_name: programName.value.trim(),
      program_code: programCode.value.trim(),
      faculty_id: selectedFacultyId.value,
    });
    successMsg.value = 'Program studi berhasil ditambahkan!';
    showAddModal.value = false;
    fetchPrograms();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menambahkan program studi';
  } finally {
    submitLoading.value = false;
  }
};

// Edit Modal
const showEditModal = ref(false);
const editProgramName = ref('');
const editProgramCode = ref('');
const editFacultyId = ref<number | null>(null);
const activeProgramId = ref<number | null>(null);

const openEditModal = (p: any) => {
  activeProgramId.value = p.program_id;
  editProgramName.value = p.program_name;
  editProgramCode.value = p.program_code;
  editFacultyId.value = p.faculty_id;
  showEditModal.value = true;
};

const handleUpdate = async () => {
  if (!activeProgramId.value || !editProgramName.value.trim() || !editProgramCode.value.trim() || !editFacultyId.value) return;
  submitLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.put(`/v1/study-programs/${activeProgramId.value}`, {
      program_name: editProgramName.value.trim(),
      program_code: editProgramCode.value.trim(),
      faculty_id: editFacultyId.value,
    });
    successMsg.value = 'Program studi berhasil diperbarui!';
    showEditModal.value = false;
    fetchPrograms();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal memperbarui program studi';
  } finally {
    submitLoading.value = false;
  }
};

const handleDelete = async (programId: number) => {
  if (!confirm('Apakah Anda yakin ingin menghapus program studi ini?')) return;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.delete(`/v1/study-programs/${programId}`);
    successMsg.value = 'Program studi berhasil dihapus!';
    fetchPrograms();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menghapus program studi';
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-xs text-slate-500 dark:text-slate-400">Kelola daftar program studi di setiap fakultas</p>
      </div>
      <button 
        @click="openAddModal" 
        class="px-4 py-2.5 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-brand-blue-500/10 cursor-pointer"
      >
        <Plus class="w-4 h-4" /> Tambah Program Studi
      </button>
    </div>

    <!-- Feedback Alerts -->
    <div v-if="errorMsg" class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
      {{ successMsg }}
    </div>

    <!-- Table List -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[300px]">
      <Clock class="w-8 h-8 animate-spin text-brand-blue-500 mb-2" />
      <span class="text-sm text-slate-500 dark:text-slate-400 font-semibold">Memuat data program studi...</span>
    </div>

    <div v-else-if="programs.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl">
      <Library class="w-16 h-16 stroke-[1.2] mb-3" />
      <span class="text-sm font-semibold">Belum ada data program studi</span>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="p in programs" 
        :key="p.program_id"
        class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200"
      >
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-brand-blue-50 dark:bg-brand-blue-950/20 text-brand-blue-500 dark:text-brand-blue-400 flex items-center justify-center flex-shrink-0">
            <Library class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h4 class="font-bold text-slate-800 dark:text-slate-100 truncate" :title="p.program_name">{{ p.program_name }}</h4>
            <span class="text-[10px] font-mono text-slate-500 block uppercase tracking-wider mt-0.5">{{ p.faculty?.faculty_code }} ({{ p.program_code }})</span>
          </div>
        </div>

        <div class="flex gap-1.5 flex-shrink-0">
          <button @click="openEditModal(p)" class="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-border transition-colors cursor-pointer">
            <Edit2 class="w-3.5 h-3.5" />
          </button>
          <button @click="handleDelete(p.program_id)" class="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-45 border border-rose-100 dark:border-rose-900/30 transition-colors cursor-pointer">
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD PROGRAM -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
        <button @click="showAddModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Tambah Program Studi Baru</h3>

        <form @submit.prevent="handleCreate" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Fakultas</label>
            <select v-model="selectedFacultyId" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white">
              <option v-for="f in faculties" :key="f.faculty_id" :value="f.faculty_id">{{ f.faculty_name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nama Program Studi</label>
            <input v-model="programName" type="text" placeholder="e.g. Teknik Informatika" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Kode Program Studi</label>
            <input v-model="programCode" type="text" placeholder="e.g. TI" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white" />
          </div>

          <button 
            type="submit" 
            :disabled="submitLoading"
            class="w-full py-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock v-if="submitLoading" class="w-5 h-5 animate-spin" />
            <span v-else>Simpan Program Studi</span>
          </button>
        </form>
      </div>
    </div>

    <!-- MODAL: EDIT PROGRAM -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
        <button @click="showEditModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Edit Program Studi</h3>

        <form @submit.prevent="handleUpdate" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Fakultas</label>
            <select v-model="editFacultyId" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white">
              <option v-for="f in faculties" :key="f.faculty_id" :value="f.faculty_id">{{ f.faculty_name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nama Program Studi</label>
            <input v-model="editProgramName" type="text" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Kode Program Studi</label>
            <input v-model="editProgramCode" type="text" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white" />
          </div>

          <button 
            type="submit" 
            :disabled="submitLoading"
            class="w-full py-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock v-if="submitLoading" class="w-5 h-5 animate-spin" />
            <span v-else>Simpan Perubahan</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
