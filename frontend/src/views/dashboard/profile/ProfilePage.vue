<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import api, { getImageUrl } from '../../../lib/api';
import { 
  User, Lock, Clock, CheckCircle, AlertTriangle, Key, Mail, Phone
} from '@lucide/vue';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const initials = computed(() => {
  if (!user.value?.full_name) return 'U';
  return user.value.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
});

// Profile fields
const fullName = ref('');
const phoneNumber = ref('');

// Watch user profile state to populate form fields dynamically when loaded or switched
watch(user, (newUser) => {
  if (newUser) {
    fullName.value = newUser.full_name || '';
    phoneNumber.value = newUser.phone_number || '';
  }
}, { immediate: true });

const profileLoading = ref(false);
const profileError = ref('');
const profileSuccess = ref('');

const handleUpdateProfile = async () => {
  if (!fullName.value) {
    profileError.value = 'Nama lengkap tidak boleh kosong';
    return;
  }
  profileLoading.value = true;
  profileError.value = '';
  profileSuccess.value = '';

  try {
    const res: any = await api.put('/v1/users/profile', {
      full_name: fullName.value,
      phone_number: phoneNumber.value || null,
    });
    profileSuccess.value = 'Profil berhasil diperbarui!';
    
    // Update store state
    await authStore.fetchProfile();
  } catch (err: any) {
    profileError.value = err.message || 'Gagal memperbarui profil';
  } finally {
    profileLoading.value = false;
  }
};

// Password fields
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const passwordLoading = ref(false);
const passwordError = ref('');
const passwordSuccess = ref('');

const handleChangePassword = async () => {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'Semua field password wajib diisi';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Konfirmasi password baru tidak cocok';
    return;
  }

  passwordLoading.value = true;
  passwordError.value = '';
  passwordSuccess.value = '';

  try {
    await api.put('/v1/users/change-password', {
      current_password: currentPassword.value,
      new_password: newPassword.value,
    });
    passwordSuccess.value = 'Password berhasil diubah!';
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err: any) {
    passwordError.value = err.message || 'Gagal mengubah password';
  } finally {
    passwordLoading.value = false;
  }
};
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- User Overview Panel -->
    <div>
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
        <div class="w-20 h-20 rounded-full bg-brand-blue-50 dark:bg-brand-blue-950/20 flex items-center justify-center font-bold text-3xl text-brand-blue-500 border border-brand-blue-100 dark:border-brand-blue-900/30 overflow-hidden mb-4">
          <img v-if="user?.profile_photo_url" :src="getImageUrl(user.profile_photo_url)" alt="Avatar" class="w-full h-full object-cover" />
          <span v-else>{{ initials }}</span>
        </div>

        <h4 class="text-base font-bold text-slate-800 dark:text-white">{{ user?.full_name }}</h4>
        <span class="text-xs text-slate-500 font-medium font-mono block mt-0.5">{{ user?.nim || 'NIM tidak diisi' }}</span>
        <span class="px-2.5 py-0.5 mt-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-blue-50 dark:bg-brand-blue-950/20 text-brand-blue-500 border border-brand-blue-100 dark:border-brand-blue-900/20">
          {{ user?.user_role?.replace('_', ' ') }}
        </span>

        <!-- Academic Info -->
        <div v-if="user?.faculty || user?.study_program" class="w-full text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 space-y-2 text-left">
          <div v-if="user.faculty" class="flex justify-between">
            <span>Fakultas:</span>
            <strong class="text-slate-700 dark:text-slate-300">{{ user.faculty.faculty_name }}</strong>
          </div>
          <div v-if="user.study_program" class="flex justify-between">
            <span>Prodi:</span>
            <strong class="text-slate-700 dark:text-slate-300">{{ user.study_program.program_name }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Profile Form -->
    <div class="lg:col-span-2 space-y-6">
      <!-- Profile details -->
      <form @submit.prevent="handleUpdateProfile" class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm space-y-5">
        <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <User class="w-5 h-5 text-brand-blue-500" />
          <h4 class="text-sm font-bold text-slate-800 dark:text-white">Detail Profil Saya</h4>
        </div>

        <!-- Alert messages -->
        <div v-if="profileError" class="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-450 text-xs font-semibold">
          {{ profileError }}
        </div>
        <div v-if="profileSuccess" class="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-450 text-xs font-semibold flex items-center gap-1.5">
          <CheckCircle class="w-4 h-4" /> {{ profileSuccess }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nama Lengkap</label>
            <input v-model="fullName" type="text" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nomor HP</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Phone class="w-4 h-4" />
              </span>
              <input v-model="phoneNumber" type="text" placeholder="08xxxxxxxxxx" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white" />
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Alamat Email (Tidak dapat diubah)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Mail class="w-4 h-4" />
            </span>
            <input :value="user?.email_address" type="email" disabled class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm cursor-not-allowed" />
          </div>
        </div>

        <button type="submit" :disabled="profileLoading" class="px-4 py-2.5 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer">
          <Clock v-if="profileLoading" class="w-4 h-4 animate-spin" /> Simpan Perubahan Profil
        </button>
      </form>

      <!-- Password Change form -->
      <form @submit.prevent="handleChangePassword" class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm space-y-5">
        <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Key class="w-5 h-5 text-brand-gold-500" />
          <h4 class="text-sm font-bold text-slate-800 dark:text-white">Ubah Password</h4>
        </div>

        <!-- Alert messages -->
        <div v-if="passwordError" class="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-450 text-xs font-semibold">
          {{ passwordError }}
        </div>
        <div v-if="passwordSuccess" class="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-450 text-xs font-semibold flex items-center gap-1.5">
          <CheckCircle class="w-4 h-4" /> {{ passwordSuccess }}
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Password Saat Ini</label>
          <input v-model="currentPassword" type="password" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Password Baru</label>
            <input v-model="newPassword" type="password" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Konfirmasi Password Baru</label>
            <input v-model="confirmPassword" type="password" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-sm text-slate-900 dark:text-white" />
          </div>
        </div>

        <button type="submit" :disabled="passwordLoading" class="px-4 py-2.5 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer">
          <Clock v-if="passwordLoading" class="w-4 h-4 animate-spin" /> Ubah Password Saya
        </button>
      </form>
    </div>
  </div>
</template>
