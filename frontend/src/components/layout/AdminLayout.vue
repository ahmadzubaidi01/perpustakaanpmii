<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { 
  LayoutDashboard, BookOpen, ClipboardList, Users, Settings, 
  Bell, LogOut, Sun, Moon, Menu, X, ChevronDown, 
  Library, FileText, Barcode, Activity
} from '@lucide/vue';
import api, { getImageUrl } from '../../lib/api';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const sidebarOpen = ref(false);
const profileDropdownOpen = ref(false);
const notificationsCount = ref(0);
let pollingInterval: any = null;

const user = computed(() => authStore.user);

const fetchNotificationsCount = async () => {
  try {
    const res: any = await api.get('/v1/notifications?sync=true');
    // Count unread
    notificationsCount.value = res.metadata?.unread_count || 0;
  } catch (err) {
    console.error('Failed to load notifications count', err);
  }
};

const onNotificationsUpdated = (e: Event) => {
  const customEvent = e as CustomEvent;
  if (customEvent.detail !== undefined && typeof customEvent.detail === 'number') {
    notificationsCount.value = customEvent.detail;
  } else {
    fetchNotificationsCount();
  }
};

onMounted(() => {
  if (authStore.isAuthenticated) {
    fetchNotificationsCount();
    // Poll every 60 seconds
    pollingInterval = setInterval(fetchNotificationsCount, 60000);
    window.addEventListener('notifications-updated', onNotificationsUpdated);
  }
});

onUnmounted(() => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  window.removeEventListener('notifications-updated', onNotificationsUpdated);
});

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const closeSidebar = () => {
  sidebarOpen.value = false;
};

const toggleTheme = () => {
  authStore.setTheme(authStore.theme === 'light' ? 'dark' : 'light');
};

const handleLogout = async () => {
  await authStore.logout();
};

const navigation = computed(() => {
  const links = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'komisariat_admin', 'borrower'] },
    { name: 'Buku', path: '/dashboard/books', icon: BookOpen, roles: ['super_admin', 'komisariat_admin', 'borrower'] },
    { name: 'Peminjaman', path: '/dashboard/borrowings', icon: ClipboardList, roles: ['super_admin', 'komisariat_admin', 'borrower'] },
    { name: 'Anggota', path: '/dashboard/borrowers', icon: Users, roles: ['super_admin', 'komisariat_admin'] },
    { name: 'Fakultas', path: '/dashboard/faculties', icon: Library, roles: ['super_admin'] },
    { name: 'Program Studi', path: '/dashboard/study-programs', icon: Library, roles: ['super_admin'] },
    { name: 'Kategori', path: '/dashboard/categories', icon: Library, roles: ['super_admin', 'komisariat_admin'] },
    { name: 'Barcode', path: '/dashboard/barcodes', icon: Barcode, roles: ['super_admin', 'komisariat_admin'] },
    { name: 'Laporan', path: '/dashboard/reports', icon: FileText, roles: ['super_admin', 'komisariat_admin'] },
    { name: 'Audit Log', path: '/dashboard/audit-logs', icon: Activity, roles: ['super_admin'] },
    { name: 'Pengaturan', path: '/dashboard/settings', icon: Settings, roles: ['super_admin', 'komisariat_admin'] },
  ];

  return links.filter(link => link.roles.includes(user.value?.user_role || ''));
});

const currentRouteName = computed(() => {
  const currentLink = navigation.value.find(link => link.path === route.path);
  if (currentLink) return currentLink.name;
  if (route.path === '/dashboard/profile') return 'Profil Saya';
  if (route.path === '/dashboard/notifications') return 'Notifikasi';
  return 'Perpustakaan Lintang Songo';
});

const initials = computed(() => {
  if (!user.value?.full_name) return 'U';
  return user.value.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
});
</script>

<template>
  <div class="min-h-screen flex bg-slate-50 dark:bg-dark-bg transition-colors duration-300">
    <!-- Mobile Sidebar Backdrop -->
    <div 
      v-if="sidebarOpen" 
      @click="closeSidebar" 
      class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
    ></div>

    <!-- Sidebar Component -->
    <aside 
      :class="[
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-brand-blue-900 border-r border-brand-blue-800 text-white lg:translate-x-0 lg:static transition-transform duration-300 ease-in-out'
      ]"
    >
      <!-- Brand Logo -->
      <div class="h-16 flex items-center gap-3 px-6 border-b border-brand-blue-800">
        <img src="/logo.png" class="w-9 h-9 object-contain" alt="Logo PMII Lintang Songo" />
        <div>
          <h1 class="text-lg font-bold leading-none tracking-wide text-brand-gold-100">BukuPMII</h1>
          <span class="text-[10px] text-brand-blue-300 font-semibold tracking-wider uppercase">Lintang Songo</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
        <router-link 
          v-for="item in navigation" 
          :key="item.path" 
          :to="item.path"
          @click="closeSidebar"
          :class="[
            route.path === item.path 
              ? 'bg-brand-gold-500 text-brand-blue-900 font-semibold shadow-md shadow-brand-gold-500/10' 
              : 'text-brand-blue-100 hover:bg-brand-blue-800 hover:text-white',
            'flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-sm'
          ]"
        >
          <component 
            :is="item.icon" 
            :class="[
              route.path === item.path ? 'text-brand-blue-900' : 'text-brand-blue-300 group-hover:text-white',
              'w-5 h-5 transition-colors duration-200'
            ]" 
          />
          {{ item.name }}
        </router-link>
      </nav>

      <!-- User Profile Card -->
      <div class="p-4 border-t border-brand-blue-800">
        <div class="flex items-center gap-3 p-2 rounded-xl bg-brand-blue-800/40">
          <div class="w-10 h-10 rounded-lg overflow-hidden bg-brand-blue-700 flex items-center justify-center font-bold text-brand-gold-500 border border-brand-blue-600">
            <img v-if="user?.profile_photo_url" :src="getImageUrl(user.profile_photo_url)" alt="Avatar" class="w-full h-full object-cover" />
            <span v-else>{{ initials }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-white truncate">{{ user?.full_name }}</p>
            <p class="text-[10px] text-brand-blue-300 uppercase font-bold tracking-wider truncate">{{ user?.user_role?.replace('_', ' ') }}</p>
          </div>
          <button @click="handleLogout" class="p-1.5 rounded-lg text-brand-blue-300 hover:bg-brand-blue-700 hover:text-white transition-colors duration-200">
            <LogOut class="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content Wrapper -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Topbar Header -->
      <header class="h-16 flex items-center justify-between px-6 bg-white dark:bg-dark-card border-b border-slate-200 dark:border-dark-border z-30 transition-colors duration-300">
        <div class="flex items-center gap-4">
          <!-- Mobile Sidebar Toggle -->
          <button @click="toggleSidebar" class="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors">
            <Menu class="w-6 h-6" />
          </button>
          <!-- Current Page Title with Komisariat Logo -->
          <div class="flex items-center gap-2">
            <img src="/logo.png" class="w-7 h-7 object-contain" alt="Logo Komisariat" />
            <h2 class="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-wide">{{ currentRouteName }}</h2>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Light/Dark Mode Switch -->
          <button @click="toggleTheme" class="p-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200">
            <Sun v-if="authStore.theme === 'dark'" class="w-5 h-5 text-amber-400 fill-amber-400" />
            <Moon v-else class="w-5 h-5 text-slate-700 fill-slate-100" />
          </button>

          <!-- Notifications Button -->
          <router-link to="/dashboard/notifications" class="relative p-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200">
            <Bell class="w-5 h-5" />
            <span v-if="notificationsCount > 0" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 border-2 border-white dark:border-dark-card flex items-center justify-center text-[10px] font-bold text-white leading-none">
              {{ notificationsCount }}
            </span>
          </router-link>

          <!-- Profile Dropdown -->
          <div class="relative">
            <button 
              @click="profileDropdownOpen = !profileDropdownOpen" 
              class="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
            >
              <div class="w-8 h-8 rounded-lg overflow-hidden bg-brand-blue-50 flex items-center justify-center font-bold text-brand-blue-500 border border-brand-blue-100">
                <img v-if="user?.profile_photo_url" :src="getImageUrl(user.profile_photo_url)" alt="Avatar" class="w-full h-full object-cover" />
                <span v-else>{{ initials }}</span>
              </div>
              <ChevronDown class="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>

            <!-- Dropdown Menu -->
            <div 
              v-if="profileDropdownOpen" 
              @click="profileDropdownOpen = false"
              class="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-xl py-1 z-50"
            >
              <router-link to="/dashboard/profile" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Profil Saya
              </router-link>
              <button @click="handleLogout" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-left">
                Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Page Content Area -->
      <main class="flex-grow overflow-y-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
