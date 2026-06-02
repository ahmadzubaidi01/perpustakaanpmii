<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import api, { getImageUrl } from '../../../lib/api';
import JsBarcode from 'jsbarcode';
import { 
  Search, Clock, Barcode, Download, X, BookOpen, AlertCircle
} from '@lucide/vue';

const books = ref<any[]>([]);
const search = ref('');
const loading = ref(false);
const errorMsg = ref('');

const fetchBooks = async () => {
  if (!search.value.trim()) {
    books.value = [];
    return;
  }
  loading.value = true;
  try {
    const res: any = await api.get(`/v1/books?limit=10&search=${encodeURIComponent(search.value)}`);
    books.value = res.data.books || [];
  } catch (err) {
    console.error('Failed to load books for barcode generation', err);
  } finally {
    loading.value = false;
  }
};

watch(search, () => {
  fetchBooks();
});

const selectedBook = ref<any>(null);
const barcodeFormat = ref('CODE128'); // CODE128 or EAN13

const selectBook = (book: any) => {
  selectedBook.value = book;
  const rawVal = book.isbn_code || book.book_code || '';
  const numericOnly = rawVal.replace(/\D/g, '');
  if (numericOnly.length === 13) {
    barcodeFormat.value = 'EAN13';
  } else {
    barcodeFormat.value = 'CODE128';
  }
  generateBarcode();
};

const closeBarcodeView = () => {
  selectedBook.value = null;
};

const generateBarcode = async () => {
  await nextTick();
  if (!selectedBook.value) return;

  let barcodeValue = selectedBook.value.isbn_code || selectedBook.value.book_code || '';

  if (barcodeFormat.value === 'EAN13') {
    // EAN-13 must be exactly 13 numeric digits. Let's sanitize and pad or slice the code safely.
    let numeric = barcodeValue.replace(/\D/g, '');
    if (numeric.length === 0) {
      numeric = '0';
    }
    if (numeric.length < 13) {
      numeric = numeric.padStart(13, '0');
    } else if (numeric.length > 13) {
      numeric = numeric.slice(0, 13);
    }
    barcodeValue = numeric;
  }

  try {
    JsBarcode('#barcode-svg', barcodeValue, {
      format: barcodeFormat.value,
      lineColor: '#0f172a',
      width: 2,
      height: 70,
      displayValue: true,
      font: 'monospace',
      fontSize: 14,
      background: '#ffffff',
    });
  } catch (err) {
    console.error('JsBarcode rendering failed', err);
  }
};

watch(barcodeFormat, () => {
  generateBarcode();
});

const downloadBarcode = () => {
  const svgElement = document.getElementById('barcode-svg') as any;
  if (!svgElement) return;

  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const DOMURL = window.URL || window.webkitURL || window;
  const blobURL = DOMURL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svgElement.getBoundingClientRect().width * 2; // scale for high res
    canvas.height = svgElement.getBoundingClientRect().height * 2;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(2, 2);
      context.drawImage(image, 0, 0);

      const pngURL = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngURL;
      downloadLink.download = `barcode-${selectedBook.value.book_code}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };
  image.src = blobURL;
};
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Search & Select Section -->
      <div class="lg:col-span-2 space-y-4">
        <div class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Cari Buku</h4>
          
          <div class="relative">
            <input 
              v-model="search" 
              type="text" 
              placeholder="Masukkan judul buku, penulis, atau kode..." 
              class="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition-all text-sm"
            />
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search class="w-5 h-5" />
            </span>
          </div>

          <!-- Loading state -->
          <div v-if="loading" class="flex items-center gap-2 mt-4 text-xs text-slate-500">
            <Clock class="w-4 h-4 animate-spin text-brand-blue-500" /> Mencari buku...
          </div>

          <!-- Results list -->
          <div v-if="books.length > 0" class="mt-4 border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
            <div 
              v-for="b in books" 
              :key="b.book_id"
              @click="selectBook(b)"
              class="flex items-center justify-between p-3.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-11 bg-slate-200 dark:bg-slate-800 rounded overflow-hidden flex-shrink-0">
                  <img v-if="b.cover_image_url" :src="getImageUrl(b.cover_image_url)" alt="Cover" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-[7px] text-slate-400">NO COV</div>
                </div>
                <div class="min-w-0">
                  <h5 class="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{{ b.book_title }}</h5>
                  <p class="text-[10px] text-slate-500 truncate">{{ b.author_name }}</p>
                </div>
              </div>
              <span class="text-[10px] font-mono text-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-950/20 px-2 py-0.5 rounded border border-brand-blue-100 dark:border-brand-blue-900/20">
                {{ b.isbn_code || b.book_code }}
              </span>
            </div>
          </div>

          <div v-else-if="search && !loading" class="mt-4 p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <AlertCircle class="w-4 h-4" /> Buku tidak ditemukan. Coba ketik kata kunci lain.
          </div>
        </div>
      </div>

      <!-- Generator / Preview Section -->
      <div>
        <div v-if="selectedBook" class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm flex flex-col items-center relative">
          <button @click="closeBarcodeView" class="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10">
            <X class="w-4 h-4" />
          </button>

          <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-6 w-full text-left">Generate Barcode</h4>

          <!-- Format selector -->
          <div class="w-full mb-6">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Format Barcode</label>
            <select v-model="barcodeFormat" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-xs">
              <option value="CODE128">Code 128 (Standard Alphanumeric)</option>
              <option value="EAN13">EAN-13 (Standard ISBN-13 / Numeric-only)</option>
            </select>
          </div>

          <!-- Barcode SVG Render -->
          <div class="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-center w-full min-h-[120px] mb-6">
            <svg id="barcode-svg" class="max-w-full"></svg>
          </div>

          <!-- Book mini Info -->
          <div class="w-full text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4 mb-6">
            <p class="font-bold text-slate-800 dark:text-slate-250 truncate">{{ selectedBook.book_title }}</p>
            <p class="mt-0.5 truncate">{{ selectedBook.author_name }}</p>
            <p class="mt-2 font-mono text-[10px]">Value: {{ selectedBook.isbn_code || selectedBook.book_code }}</p>
          </div>

          <!-- Download button -->
          <button 
            @click="downloadBarcode"
            class="w-full py-2.5 rounded-xl bg-brand-blue-500 hover:bg-brand-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-blue-500/10 cursor-pointer"
          >
            <Download class="w-4 h-4" /> Download Gambar PNG
          </button>
        </div>

        <div v-else class="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm h-64 flex flex-col items-center justify-center text-slate-400 text-center">
          <Barcode class="w-12 h-12 stroke-[1.2] mb-3 text-slate-300" />
          <p class="text-xs font-semibold">Pilih buku dari daftar hasil pencarian untuk men-generate barcode.</p>
        </div>
      </div>
    </div>
  </div>
</template>
