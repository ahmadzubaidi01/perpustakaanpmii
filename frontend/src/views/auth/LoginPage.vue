<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { Mail, Lock, Loader, BookOpen, Eye, EyeOff } from '@lucide/vue';

const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMsg = ref('');
const loading = ref(false);

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMsg.value = 'Silakan masukkan email dan password';
    return;
  }

  errorMsg.value = '';
  loading.value = true;

  try {
    await authStore.login({
      email_address: email.value,
      password: password.value,
    });
    router.push('/dashboard');
  } catch (err: any) {
    errorMsg.value = err.message || 'Email atau password salah';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg transition-colors duration-300 px-4">
    <div class="w-full max-w-md bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl p-8 transition-all">
      <!-- Rebranding / Logo Header -->
      <div class="flex flex-col items-center mb-8">
        <div class="flex gap-4 mb-4">
          <img src="/logo.png" class="w-16 h-16 object-contain filter drop-shadow-sm" alt="Logo PMII Lintang Songo" />
          <img src="/logo_kopri.png" class="w-16 h-16 object-contain filter drop-shadow-sm" alt="Logo Kopri" />
        </div>
        <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100">Buku Pustaka Jalanan</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Sistem Peminjaman</p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMsg" class="mb-5 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
        {{ errorMsg }}
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-5">
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
              class="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Password</label>
            <router-link to="/forgot-password" class="text-xs font-semibold text-brand-blue-500 hover:text-brand-blue-600">Lupa Password?</router-link>
          </div>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Lock class="w-5 h-5" />
            </span>
            <input 
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="••••••••" 
              required
              class="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
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
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full py-3.5 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 disabled:opacity-50 text-white font-bold tracking-wide transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-blue-500/10 cursor-pointer"
        >
          <Loader v-if="loading" class="w-5 h-5 animate-spin" />
          <span v-else>Masuk ke Akun</span>
        </button>
      </form>

      <!-- Bottom Info -->
      <div class="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
        Belum punya akun? 
        <router-link to="/register" class="font-bold text-brand-blue-500 hover:text-brand-blue-600 transition-colors">Daftar Sekarang</router-link>
      </div>
    </div>
  </div>
</template>
