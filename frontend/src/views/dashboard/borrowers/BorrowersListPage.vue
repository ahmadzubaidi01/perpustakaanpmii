<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import api, { getImageUrl } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';

const authStore = useAuthStore();
import { 
  Users, Search, Clock, Shield, AlertTriangle, Edit2, 
  Trash2, X, Check, ArrowRight, UserCheck, Eye, EyeOff
} from '@lucide/vue';

const users = ref<any[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const successMsg = ref('');

// Filters
const search = ref('');
const page = ref(1);
const totalPages = ref(1);
const limit = ref(15);

const fetchBorrowers = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    let url = `/v1/users?page=${page.value}&limit=${limit.value}`;
    if (search.value) url += `&search=${encodeURIComponent(search.value)}`;
    
    const res: any = await api.get(url);
    users.value = res.data.users || [];
    totalPages.value = res.data.pagination.totalPages || 1;
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat data anggota';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchBorrowers();
});

watch(search, () => {
  page.value = 1;
  fetchBorrowers();
});

// Modals
const showEditModal = ref(false);
const activeUser = ref<any>(null);
const editRole = ref('');
const editStatus = ref('');
const editPassword = ref('');
const showEditPassword = ref(false);
const submitLoading = ref(false);

const isEditPasswordInvalid = computed(() => {
  if (!editPassword.value) return false;
  const hasUppercase = /[A-Z]/.test(editPassword.value);
  const hasNumber = /[0-9]/.test(editPassword.value);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(editPassword.value);
  const isLengthValid = editPassword.value.length >= 8;
  return !(hasUppercase && hasNumber && hasSpecial && isLengthValid);
});

const openEditModal = (u: any) => {
  activeUser.value = u;
  editRole.value = u.user_role;
  editStatus.value = u.account_status;
  editPassword.value = '';
  showEditPassword.value = false;
  showEditModal.value = true;
};

const handleUpdateUser = async () => {
  if (!activeUser.value) return;
  if (editPassword.value && isEditPasswordInvalid.value) {
    errorMsg.value = 'Password baru tidak memenuhi persyaratan (harus memakai huruf Besar, nomer, dan karakter khusus).';
    return;
  }
  submitLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const payload: any = {
      user_role: editRole.value,
      account_status: editStatus.value,
    };
    if (editPassword.value) {
      payload.password = editPassword.value;
    }
    await api.put(`/v1/users/${activeUser.value.user_id}`, payload);
    successMsg.value = 'Data anggota berhasil diperbarui!';
    showEditModal.value = false;
    fetchBorrowers();
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || err.message || 'Gagal memperbarui data';
  } finally {
    submitLoading.value = false;
  }
};

const showDeleteConfirmModal = ref(false);
const userToDelete = ref<any>(null);
const deleteLoading = ref(false);

const openDeleteConfirm = (u: any) => {
  if (u.user_id === authStore.user?.user_id) {
    errorMsg.value = 'Tidak bisa menghapus akun sendiri';
    return;
  }
  userToDelete.value = u;
  showDeleteConfirmModal.value = true;
};

const handleDeleteUser = async () => {
  if (!userToDelete.value) return;
  deleteLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.delete(`/v1/users/${userToDelete.value.user_id}`);
    successMsg.value = `Anggota "${userToDelete.value.full_name}" berhasil dihapus!`;
    showDeleteConfirmModal.value = false;
    fetchBorrowers();
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || err.message || 'Gagal menghapus anggota';
  } finally {
    deleteLoading.value = false;
    userToDelete.value = null;
  }
};

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'super_admin': return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30';
    case 'komisariat_admin': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30';
    case 'borrower': return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30';
    default: return 'bg-slate-50 text-slate-700';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'komisariat_admin': return 'Admin Pustaka Jalanan';
    case 'borrower': return 'Anggota';
    default: return role;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-405';
    case 'inactive': return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400';
    case 'suspended': return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-405';
    default: return 'bg-slate-50 text-slate-700';
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

    <!-- Filter & Search -->
    <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-4 shadow-sm">
      <div class="relative">
        <input 
          v-model="search" 
          type="text" 
          placeholder="Cari anggota berdasarkan nama, NIM, atau email..." 
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
      <span class="text-sm text-slate-500 dark:text-slate-400 font-semibold">Memuat data anggota...</span>
    </div>

    <div v-else-if="users.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl">
      <Users class="w-16 h-16 stroke-[1.2] mb-3" />
      <span class="text-sm font-semibold">Tidak ada anggota yang ditemukan</span>
    </div>

    <div v-else class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900">
              <th class="py-3.5 px-6">Anggota</th>
              <th class="py-3.5 px-6">Kontak</th>
              <th class="py-3.5 px-6">Akademik</th>
              <th class="py-3.5 px-6">Role</th>
              <th class="py-3.5 px-6">Status</th>
              <th class="py-3.5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="u in users" :key="u.user_id" class="text-slate-700 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
              <td class="py-4 px-6 flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-brand-blue-50 dark:bg-brand-blue-950/20 flex items-center justify-center font-bold text-brand-blue-500 border border-brand-blue-100 dark:border-brand-blue-900/30 overflow-hidden flex-shrink-0">
                  <img v-if="u.profile_photo_url" :src="getImageUrl(u.profile_photo_url)" alt="Avatar" class="w-full h-full object-cover" />
                  <span v-else>{{ u.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() }}</span>
                </div>
                <div>
                  <div class="font-bold text-slate-800 dark:text-white">{{ u.full_name }}</div>
                  <div class="text-xs text-slate-500 font-mono mt-0.5">{{ u.nim || 'NIM tidak diisi' }}</div>
                </div>
              </td>
              <td class="py-4 px-6">
                <div>{{ u.email_address }}</div>
                <div class="text-xs text-slate-500 mt-0.5">{{ u.phone_number || '-' }}</div>
              </td>
              <td class="py-4 px-6">
                <div class="font-semibold text-slate-800 dark:text-slate-100">{{ u.faculty?.faculty_code || '-' }}</div>
                <div class="text-xs text-slate-500 mt-0.5">{{ u.study_program?.program_name || '-' }}</div>
              </td>
              <td class="py-4 px-6">
                <span :class="[getRoleBadge(u.user_role), 'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border']">
                  {{ getRoleLabel(u.user_role) }}
                </span>
              </td>
              <td class="py-4 px-6">
                <span :class="[getStatusBadge(u.account_status), 'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border']">
                  {{ u.account_status }}
                </span>
              </td>
              <td class="py-4 px-6 text-right">
                <div class="inline-flex items-center gap-2">
                  <button 
                    @click="openEditModal(u)"
                    class="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-border transition-colors cursor-pointer"
                    title="Ubah Akses Anggota"
                  >
                    <Edit2 class="w-4 h-4" />
                  </button>
                  <button 
                    v-if="authStore.isAdmin"
                    @click="openDeleteConfirm(u)"
                    class="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 transition-colors cursor-pointer"
                    title="Hapus Anggota"
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

    <!-- MODAL: EDIT ANGGOTA ROLE/STATUS -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
        <button @click="showEditModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Edit Akses Anggota</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Mengubah hak akses untuk: <strong class="text-slate-800 dark:text-slate-200">{{ activeUser?.full_name }}</strong></p>

        <form @submit.prevent="handleUpdateUser" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Role Pengguna</label>
            <select 
              v-model="editRole" 
              required
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white"
            >
              <option value="borrower">Borrower (Anggota Biasa)</option>
              <option value="komisariat_admin">Admin Pustaka Jalanan</option>
              <option value="super_admin" :disabled="!authStore.isSuperAdmin">Super Admin</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Status Akun</label>
            <select 
              v-model="editStatus" 
              required
              class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div v-if="authStore.isSuperAdmin">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Ubah Password (Opsional)</label>
            <div class="relative">
              <input 
                v-model="editPassword" 
                :type="showEditPassword ? 'text' : 'password'" 
                placeholder="Masukkan password baru untuk reset" 
                class="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-xs"
              />
              <button 
                type="button"
                @click="showEditPassword = !showEditPassword"
                class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 cursor-pointer"
              >
                <Eye v-if="!showEditPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
            <!-- Password Complexity Warning -->
            <p 
              :class="[
                editPassword && isEditPasswordInvalid 
                  ? 'text-rose-500 font-semibold dark:text-rose-450' 
                  : 'text-slate-400 dark:text-slate-500', 
                'text-[10px] mt-1.5 transition-colors duration-200'
              ]"
            >
              Password harus memakai huruf Besar, nomer, dan karakter khusus (minimal 8 karakter).
            </p>
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

    <!-- MODAL: KONFIRMASI HAPUS ANGGOTA -->
    <div v-if="showDeleteConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
        <button @click="showDeleteConfirmModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <div class="flex items-center gap-3 text-rose-500 mb-4">
          <AlertTriangle class="w-6 h-6 flex-shrink-0" />
          <h3 class="text-lg font-black text-slate-800 dark:text-slate-100">Konfirmasi Hapus Anggota</h3>
        </div>
        
        <p class="text-sm text-slate-650 dark:text-slate-300 mb-6">
          Apakah Anda yakin ingin menghapus anggota <strong class="text-slate-800 dark:text-slate-100">{{ userToDelete?.full_name }}</strong>? Tindakan ini akan menonaktifkan/menghapus akun anggota tersebut.
        </p>

        <div class="flex items-center gap-3">
          <button 
            type="button"
            @click="showDeleteConfirmModal = false"
            class="flex-1 py-3 rounded-xl border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button 
            type="button"
            @click="handleDeleteUser"
            :disabled="deleteLoading"
            class="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/10"
          >
            <Clock v-if="deleteLoading" class="w-5 h-5 animate-spin" />
            <span v-else>Ya, Hapus</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
