<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import api from '../../../lib/api';
import { 
  Bell, Clock, Check, Trash2, X, AlertCircle, Info, Bookmark, UserCheck
} from '@lucide/vue';

const notifications = ref<any[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const successMsg = ref('');

const filterRead = ref<string>('all'); // all, unread, read

const fetchNotifications = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    let url = '/v1/notifications?sync=true';
    if (filterRead.value === 'unread') {
      url += '&is_read=false';
    } else if (filterRead.value === 'read') {
      url += '&is_read=true';
    }

    const res: any = await api.get(url);
    notifications.value = res.data || [];
    if (res.metadata && res.metadata.unread_count !== undefined) {
      window.dispatchEvent(new CustomEvent('notifications-updated', { detail: res.metadata.unread_count }));
    }
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat notifikasi';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchNotifications();
});

watch(filterRead, () => {
  fetchNotifications();
});

const handleMarkAllRead = async () => {
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.patch('/v1/notifications/read-all');
    successMsg.value = 'Semua notifikasi ditandai telah dibaca!';
    fetchNotifications();
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal mengubah status notifikasi';
  }
};

const handleMarkRead = async (notif: any) => {
  if (notif.is_read) return;
  try {
    await api.patch(`/v1/notifications/${notif.notification_id}/read`);
    notif.is_read = true;
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  } catch (err) {
    console.error('Failed to mark notification as read', err);
  }
};

const handleDelete = async (notifId: number) => {
  errorMsg.value = '';
  try {
    await api.delete(`/v1/notifications/${notifId}`);
    notifications.value = notifications.value.filter(n => n.notification_id !== notifId);
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  } catch (err: any) {
    errorMsg.value = err.message || 'Gagal menghapus notifikasi';
  }
};

const getIcon = (type: string) => {
  switch (type) {
    case 'borrow_request': return Bookmark;
    case 'borrow_approved': return UserCheck;
    case 'return_confirmed': return Check;
    case 'overdue_warning': return AlertCircle;
    default: return Info;
  }
};

const getIconClass = (type: string) => {
  switch (type) {
    case 'borrow_request': return 'bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400';
    case 'borrow_approved': return 'bg-blue-50 text-blue-500 dark:bg-blue-950/20 dark:text-blue-400';
    case 'return_confirmed': return 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400';
    case 'overdue_warning': return 'bg-rose-50 text-rose-500 dark:bg-rose-950/20 dark:text-rose-450';
    default: return 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  }
};
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <!-- Actions and filters Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex gap-2">
        <button 
          v-for="f in ['all', 'unread', 'read']"
          :key="f"
          @click="filterRead = f"
          :class="[
            filterRead === f 
              ? 'bg-brand-blue-500 text-white font-bold' 
              : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
            'px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer'
          ]"
        >
          {{ f === 'all' ? 'Semua' : f }}
        </button>
      </div>

      <button 
        @click="handleMarkAllRead" 
        class="px-4 py-2.5 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2 cursor-pointer"
      >
        <Check class="w-4 h-4" /> Tandai Semua Dibaca
      </button>
    </div>

    <!-- Feedback Alerts -->
    <div v-if="errorMsg" class="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-semibold">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
      {{ successMsg }}
    </div>

    <!-- Notifications List -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[250px]">
      <Clock class="w-8 h-8 animate-spin text-brand-blue-500 mb-2" />
      <span class="text-sm text-slate-500 dark:text-slate-400 font-semibold">Memuat notifikasi...</span>
    </div>

    <div v-else-if="notifications.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl">
      <Bell class="w-16 h-16 stroke-[1.2] mb-3 text-slate-300" />
      <span class="text-sm font-semibold">Tidak ada notifikasi baru</span>
    </div>

    <div v-else class="space-y-3">
      <div 
        v-for="n in notifications" 
        :key="n.notification_id"
        @click="handleMarkRead(n)"
        :class="[
          n.is_read ? 'opacity-70 bg-white dark:bg-dark-card/50' : 'bg-white dark:bg-dark-card ring-2 ring-brand-blue-500/10',
          'border border-slate-200 dark:border-dark-border rounded-2xl p-4 shadow-sm flex gap-4 hover:shadow-md transition-all cursor-pointer relative group'
        ]"
      >
        <!-- Icon badge -->
        <div :class="[getIconClass(n.notification_type), 'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0']">
          <component :is="getIcon(n.notification_type)" class="w-5 h-5" />
        </div>

        <div class="flex-grow min-w-0 pr-6">
          <div class="flex items-center gap-2">
            <h5 :class="[n.is_read ? 'font-semibold' : 'font-extrabold', 'text-sm text-slate-800 dark:text-slate-200 truncate']">
              {{ n.notification_title }}
            </h5>
            <span v-if="!n.is_read" class="w-2 h-2 rounded-full bg-brand-blue-500 flex-shrink-0"></span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{{ n.notification_message }}</p>
          <span class="text-[10px] text-slate-400 font-medium block mt-2">
            {{ new Date(n.created_at).toLocaleString('id-ID') }}
          </span>
        </div>

        <!-- Delete button -->
        <button 
          @click.stop="handleDelete(n.notification_id)"
          class="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-600 transition-colors lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
