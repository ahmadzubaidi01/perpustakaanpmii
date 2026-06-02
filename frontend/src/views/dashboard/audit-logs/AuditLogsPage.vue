<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../../lib/api';
import { 
  Activity, Clock, ChevronLeft, ChevronRight, Eye, X
} from '@lucide/vue';

const logs = ref<any[]>([]);
const loading = ref(true);
const errorMsg = ref('');

const page = ref(1);
const totalPages = ref(1);
const limit = ref(15);

const fetchAuditLogs = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const res: any = await api.get(`/v1/audit-logs?page=${page.value}&limit=${limit.value}`);
    logs.value = res.data.logs || [];
    totalPages.value = res.data.pagination.totalPages || 1;
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat log aktivitas';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchAuditLogs();
});

const handlePageChange = (p: number) => {
  page.value = p;
  fetchAuditLogs();
};

// Details Modal
const showDetailModal = ref(false);
const activeLog = ref<any>(null);

const openDetailModal = (log: any) => {
  activeLog.value = log;
  showDetailModal.value = true;
};
</script>

<template>
  <div class="space-y-6">
    <!-- Feedback Alerts -->
    <div v-if="errorMsg" class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
      {{ errorMsg }}
    </div>

    <!-- Data Table -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[300px]">
      <Clock class="w-8 h-8 animate-spin text-brand-blue-500 mb-2" />
      <span class="text-sm text-slate-500 dark:text-slate-400 font-semibold">Memuat log aktivitas...</span>
    </div>

    <div v-else-if="logs.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl">
      <Activity class="w-16 h-16 stroke-[1.2] mb-3" />
      <span class="text-sm font-semibold">Tidak ada log aktivitas sistem</span>
    </div>

    <div v-else class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-dark-border text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900">
              <th class="py-3.5 px-6">Pengguna</th>
              <th class="py-3.5 px-6">Aksi</th>
              <th class="py-3.5 px-6">Tabel Referensi</th>
              <th class="py-3.5 px-6">Record ID</th>
              <th class="py-3.5 px-6">IP Address</th>
              <th class="py-3.5 px-6">Waktu</th>
              <th class="py-3.5 px-6 text-right">Detail</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="log in logs" :key="log.log_id" class="text-slate-700 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
              <td class="py-4 px-6 font-semibold">{{ log.performed_by?.full_name || 'System / Guest' }}</td>
              <td class="py-4 px-6">
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
              <td class="py-4 px-6 text-xs font-mono">{{ log.table_name }}</td>
              <td class="py-4 px-6 text-xs font-mono">{{ log.affected_record_id }}</td>
              <td class="py-4 px-6 text-xs text-slate-500">{{ log.ip_address || '-' }}</td>
              <td class="py-4 px-6 text-xs text-slate-500">
                {{ new Date(log.created_at).toLocaleString('id-ID') }}
              </td>
              <td class="py-4 px-6 text-right">
                <button 
                  @click="openDetailModal(log)"
                  class="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Eye class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 py-4 border-t border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-900">
        <button 
          @click="handlePageChange(page - 1)" 
          :disabled="page === 1"
          class="p-2 rounded-lg border border-slate-200 dark:border-dark-border disabled:opacity-50 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Halaman {{ page }} dari {{ totalPages }}</span>
        <button 
          @click="handlePageChange(page + 1)" 
          :disabled="page === totalPages"
          class="p-2 rounded-lg border border-slate-200 dark:border-dark-border disabled:opacity-50 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- DETAIL MODAL -->
    <div v-if="showDetailModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative flex flex-col max-h-[80vh]">
        <button @click="showDetailModal = false" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
          <X class="w-5 h-5" />
        </button>

        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 mb-4">Detail Log Aktivitas</h3>

        <div class="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-[10px] font-bold text-slate-450 uppercase block">Aktor Pengguna</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ activeLog?.performed_by?.full_name || 'System / Guest' }}</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-450 uppercase block">Tipe Aksi</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ activeLog?.action_type }}</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-450 uppercase block">Tabel Target</span>
              <span class="font-bold text-slate-800 dark:text-slate-200 font-mono">{{ activeLog?.table_name }}</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-450 uppercase block">Record ID</span>
              <span class="font-bold text-slate-800 dark:text-slate-200 font-mono">{{ activeLog?.affected_record_id }}</span>
            </div>
          </div>

          <div class="border-t border-slate-100 dark:border-slate-800 pt-3">
            <span class="text-[10px] font-bold text-slate-450 uppercase block mb-1">Informasi Perangkat</span>
            <p class="text-slate-600 dark:text-slate-400">
              Browser: {{ activeLog?.browser_name }} {{ activeLog?.browser_version }} | OS: {{ activeLog?.device_os }} | Device: {{ activeLog?.device_name || 'PC' }}
            </p>
          </div>

          <div v-if="activeLog?.old_value" class="border-t border-slate-100 dark:border-slate-800 pt-3">
            <span class="text-[10px] font-bold text-slate-450 uppercase block mb-1">Data Lama (Sebelum Perubahan)</span>
            <pre class="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-[10px] overflow-x-auto text-slate-700 dark:text-slate-300">{{ JSON.stringify(activeLog.old_value, null, 2) }}</pre>
          </div>

          <div v-if="activeLog?.new_value" class="border-t border-slate-100 dark:border-slate-800 pt-3">
            <span class="text-[10px] font-bold text-slate-450 uppercase block mb-1">Data Baru (Sesudah Perubahan)</span>
            <pre class="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-[10px] overflow-x-auto text-slate-700 dark:text-slate-300">{{ JSON.stringify(activeLog.new_value, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
