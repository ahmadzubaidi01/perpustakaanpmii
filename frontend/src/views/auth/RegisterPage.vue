<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { Mail, Lock, User, Phone, Loader, BookOpen, GraduationCap, Eye, EyeOff } from '@lucide/vue';
import api from '../../lib/api';

const authStore = useAuthStore();
const router = useRouter();

const fullName = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const phoneNumber = ref('');
const nim = ref('');

const isPasswordInvalid = computed(() => {
  if (!password.value) return false;
  const hasUppercase = /[A-Z]/.test(password.value);
  const hasNumber = /[0-9]/.test(password.value);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password.value);
  const isLengthValid = password.value.length >= 8;
  return !(hasUppercase && hasNumber && hasSpecial && isLengthValid);
});
const selectedFaculty = ref<number | null>(null);
const selectedProgram = ref<number | null>(null);

const faculties = ref<any[]>([]);
const programs = ref<any[]>([]);

const errorMsg = ref('');
const successMsg = ref('');
const loading = ref(false);
const loadingFaculties = ref(false);
const loadingPrograms = ref(false);

const fetchFaculties = async () => {
  loadingFaculties.value = true;
  try {
    const res: any = await api.get('/v1/faculties');
    faculties.value = res.data || [];
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat daftar fakultas';
  } finally {
    loadingFaculties.value = false;
  }
};

const fetchPrograms = async (facultyId: number) => {
  loadingPrograms.value = true;
  try {
    const res: any = await api.get(`/v1/study-programs?faculty_id=${facultyId}`);
    programs.value = res.data || [];
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat daftar program studi';
  } finally {
    loadingPrograms.value = false;
  }
};

onMounted(() => {
  fetchFaculties();
});

watch(selectedFaculty, (newVal) => {
  selectedProgram.value = null;
  programs.value = [];
  if (newVal) {
    fetchPrograms(newVal);
  }
});

const handleRegister = async () => {
  if (!fullName.value || !email.value || !password.value || !nim.value || !selectedFaculty.value || !selectedProgram.value) {
    errorMsg.value = 'Semua field wajib diisi';
    return;
  }

  if (isPasswordInvalid.value) {
    errorMsg.value = 'Password tidak memenuhi persyaratan (harus memakai huruf Besar, nomer, dan karakter khusus).';
    return;
  }

  errorMsg.value = '';
  successMsg.value = '';
  loading.value = true;

  try {
    await authStore.register({
      full_name: fullName.value,
      email_address: email.value,
      password: password.value,
      phone_number: phoneNumber.value || null,
      nim: nim.value,
      faculty_id: selectedFaculty.value,
      program_id: selectedProgram.value,
      user_role: 'borrower'
    });
    
    successMsg.value = 'Pendaftaran berhasil! Silakan masuk menggunakan email Anda.';
    // Clear form
    fullName.value = '';
    email.value = '';
    password.value = '';
    phoneNumber.value = '';
    nim.value = '';
    selectedFaculty.value = null;
    selectedProgram.value = null;

    setTimeout(() => {
      router.push('/login');
    }, 3000);
  } catch (err: any) {
    errorMsg.value = err.message || 'Pendaftaran gagal. Silakan coba lagi.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg transition-colors duration-300 px-4 py-12">
    <div class="w-full max-w-lg bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl p-8 transition-all">
      
      <!-- Header -->
      <div class="flex flex-col items-center mb-8">
        <div class="mb-4">
          <img src="/logo.png" class="w-16 h-16 object-contain filter drop-shadow-sm" alt="Logo Pustaka Jalanan" />
        </div>
        <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100">Daftar Anggota Baru</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Perpustakaan Pustaka Jalanan</p>
      </div>

      <!-- Alerts -->
      <div v-if="errorMsg" class="mb-5 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
        {{ errorMsg }}
      </div>
      <div v-if="successMsg" class="mb-5 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
        {{ successMsg }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nama Lengkap</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <User class="w-5 h-5" />
            </span>
            <input 
              v-model="fullName" 
              type="text" 
              placeholder="Nama Lengkap Sahabat/i" 
              required
              class="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">NIM (Nomor Induk Mahasiswa)</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <GraduationCap class="w-5 h-5" />
              </span>
              <input 
                v-model="nim" 
                type="text" 
                placeholder="NIM" 
                required
                class="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nomor HP / WhatsApp</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Phone class="w-5 h-5" />
              </span>
              <input 
                v-model="phoneNumber" 
                type="text" 
                placeholder="0812xxxxxxxx" 
                class="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Fakultas</label>
            <select 
              v-model="selectedFaculty" 
              required
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
            >
              <option :value="null" disabled>Pilih Fakultas</option>
              <option v-for="f in faculties" :key="f.faculty_id" :value="f.faculty_id">
                {{ f.faculty_name }} ({{ f.faculty_code }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Program Studi</label>
            <select 
              v-model="selectedProgram" 
              required
              :disabled="!selectedFaculty"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm disabled:opacity-50"
            >
              <option :value="null" disabled>Pilih Program Studi</option>
              <option v-for="p in programs" :key="p.program_id" :value="p.program_id">
                {{ p.program_name }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Mail class="w-5 h-5" />
            </span>
            <input 
              v-model="email" 
              type="email" 
              placeholder="nama@email.com" 
              required
              class="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Password</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Lock class="w-5 h-5" />
            </span>
            <input 
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="••••••••" 
              required
              class="w-full pl-11 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
            />
            <button 
              type="button"
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 cursor-pointer"
            >
              <Eye v-if="!showPassword" class="w-5 h-5" />
              <EyeOff v-else class="w-5 h-5" />
            </button>
          </div>
          <!-- Password Complexity Warning -->
          <p 
            :class="[
              password && isPasswordInvalid 
                ? 'text-rose-500 font-semibold dark:text-rose-400' 
                : 'text-slate-400 dark:text-slate-500', 
              'text-xs mt-1.5 transition-colors duration-200'
            ]"
          >
            Password harus memakai huruf Besar, nomer, dan karakter khusus (minimal 8 karakter).
          </p>
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full py-3 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 disabled:opacity-50 text-white font-bold tracking-wide transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-blue-500/10 mt-6 cursor-pointer"
        >
          <Loader v-if="loading" class="w-5 h-5 animate-spin" />
          <span v-else>Buat Akun Anggota</span>
        </button>
      </form>

      <!-- Bottom Info -->
      <div class="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
        Sudah punya akun? 
        <router-link to="/login" class="font-bold text-brand-blue-500 hover:text-brand-blue-600 transition-colors">Masuk di sini</router-link>
      </div>
    </div>
  </div>
</template>
