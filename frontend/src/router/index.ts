import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import Cookies from 'js-cookie';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/LoginPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/auth/RegisterPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/auth/ForgotPasswordPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/dashboard',
    component: () => import('../components/layout/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/dashboard/DashboardPage.vue'),
      },
      {
        path: 'books',
        name: 'Books',
        component: () => import('../views/dashboard/books/BooksListPage.vue'),
      },
      {
        path: 'borrowings',
        name: 'Borrowings',
        component: () => import('../views/dashboard/borrowings/BorrowingsPage.vue'),
      },
      {
        path: 'borrowers',
        name: 'Borrowers',
        component: () => import('../views/dashboard/borrowers/BorrowersListPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('../views/dashboard/categories/CategoriesPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'faculties',
        name: 'Faculties',
        component: () => import('../views/dashboard/faculties/FacultiesPage.vue'),
        meta: { requiresSuperAdmin: true },
      },
      {
        path: 'study-programs',
        name: 'StudyPrograms',
        component: () => import('../views/dashboard/study-programs/StudyProgramsPage.vue'),
        meta: { requiresSuperAdmin: true },
      },
      {
        path: 'barcodes',
        name: 'Barcodes',
        component: () => import('../views/dashboard/barcodes/BarcodesPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('../views/dashboard/reports/ReportsPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'audit-logs',
        name: 'AuditLogs',
        component: () => import('../views/dashboard/audit-logs/AuditLogsPage.vue'),
        meta: { requiresSuperAdmin: true },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/dashboard/settings/SettingsPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/dashboard/profile/ProfilePage.vue'),
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('../views/dashboard/notifications/NotificationsPage.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();
  const token = Cookies.get('accessToken');

  if (token && !authStore.user) {
    await authStore.fetchProfile();
  }

  const isAuth = !!authStore.user;

  if (to.meta.requiresAuth && !isAuth) {
    next('/login');
  } else if (to.meta.guestOnly && isAuth) {
    next('/dashboard');
  } else if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
    next('/dashboard');
  } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
