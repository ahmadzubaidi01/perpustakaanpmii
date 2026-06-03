import { defineStore } from 'pinia';
import Cookies from 'js-cookie';
import api from '../lib/api';

export interface UserProfile {
  user_id: number;
  nim: string | null;
  full_name: string;
  email_address: string;
  phone_number: string | null;
  profile_photo_url: string | null;
  user_role: 'super_admin' | 'komisariat_admin' | 'borrower';
  account_status: 'active' | 'inactive' | 'suspended';
  faculty?: { faculty_id: number; faculty_name: string; faculty_code: string };
  study_program?: { program_id: number; program_name: string; program_code: string };
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserProfile | null,
    loading: false,
    theme: localStorage.getItem('theme') || 'light',
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isSuperAdmin: (state) => state.user?.user_role === 'super_admin',
    isAdmin: (state) => state.user?.user_role === 'super_admin' || state.user?.user_role === 'komisariat_admin',
    isBorrower: (state) => state.user?.user_role === 'borrower',
  },

  actions: {
    setTheme(newTheme: 'light' | 'dark') {
      this.theme = newTheme;
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    initTheme() {
      if (this.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    async fetchProfile() {
      this.loading = true;
      try {
        const res: any = await api.get('/v1/auth/me');
        this.user = res.data;
      } catch (err) {
        this.user = null;
        Cookies.remove('accessToken');
      } finally {
        this.loading = false;
      }
    },


    async login(payload: { email_address: string; password: string }) {
  this.loading = true;

  try {
    const res: any = await api.post('/v1/auth/login', payload);

    console.log('LOGIN RESPONSE:', res);

    const { user, tokens } = res.data;

    const accessToken = tokens?.access_token;
    const refreshToken = tokens?.refresh_token;

    Cookies.set('accessToken', accessToken, { expires: 1 / 24 });

    if (refreshToken) {
      Cookies.set('refreshToken', refreshToken, { expires: 7 });
    }

    this.user = user;

    return user;
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    throw err;
  } finally {
    this.loading = false;
  }
    },

    async register(payload: any) {
      this.loading = true;
      try {
        await api.post('/v1/auth/register', payload);
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;
      try {
        const refreshToken = Cookies.get('refreshToken');
        await api.post('/v1/auth/logout', { refresh_token: refreshToken });
      } catch (err) {
        console.error('Logout error', err);
      } finally {
        this.user = null;
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        window.location.href = '/login';
        this.loading = false;
      }
    },
  },
});
