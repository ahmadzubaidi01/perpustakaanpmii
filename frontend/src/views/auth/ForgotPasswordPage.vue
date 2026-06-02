<script setup lang="ts">
import { ref } from 'vue';
import api from '../../lib/api';
import { Mail, Loader, BookOpen, ArrowLeft } from '@lucide/vue';

const email = ref('');
const errorMsg = ref('');
const successMsg = ref('');
const loading = ref(false);

const handleForgotPassword = async () => {
  if (!email.value) {
    errorMsg.value = 'Silakan masukkan alamat email Anda';
    return;
  }

  errorMsg.value = '';
  successMsg.value = '';
  loading.value = true;

  try {
    await api.post('/v1/auth/forgot-password', { email_address: email.value });
    successMsg.value = 'Tautan pengaturan ulang password telah dikirim ke email Anda.';
    email.value = '';
  } catch (err: any) {
    errorMsg.value = err.message || 'Terjadi kesalahan. Silakan coba lagi.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg transition-colors duration-300 px-4">
    <div class="w-full max-w-md bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl p-8 transition-all">
      
      <!-- Header -->
      <div class="flex flex-col items-center mb-8">
        <div class="flex gap-4 mb-4">
          <img src="/logo.png" class="w-16 h-16 object-contain filter drop-shadow-sm" alt="Logo PMII Lintang Songo" />
          <img src="/logo_kopri.png" class="w-16 h-16 object-contain filter drop-shadow-sm" alt="Logo Kopri" />
        </div>
        <h1 class="text-2xl font-black text-slate-800 dark:text-slate-100">Lupa Password</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">Masukkan email Anda untuk menerima tautan pemulihan password</p>
      </div>

      <!-- Alerts -->
      <div v-if="errorMsg" class="mb-5 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
        {{ errorMsg }}
      </div>
      <div v-if="successMsg" class="mb-5 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
        {{ successMsg }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleForgotPassword" class="space-y-5">
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

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full py-3.5 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 disabled:opacity-50 text-white font-bold tracking-wide transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-blue-500/10 cursor-pointer"
        >
          <Loader v-if="loading" class="w-5 h-5 animate-spin" />
          <span v-else>Kirim Tautan Pemulihan</span>
        </button>
      </form>

      <!-- Back link -->
      <div class="mt-8 text-center">
        <router-link to="/login" class="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-brand-blue-500 transition-colors">
          <ArrowLeft class="w-4 h-4" /> Kembali ke Halaman Login
        </router-link>
      </div>
    </div>
  </div>
</template>
