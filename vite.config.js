import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'

// Plugin để tạo 404.html cho GitHub Pages SPA routing
const create404Plugin = () => ({
  name: 'create-404',
  closeBundle() {
    const distPath = resolve(__dirname, 'dist')
    const indexPath = resolve(distPath, 'index.html')
    const notFoundPath = resolve(distPath, '404.html')

    try {
      const indexContent = readFileSync(indexPath, 'utf-8')
      writeFileSync(notFoundPath, indexContent)
      console.log('✅ Created 404.html for GitHub Pages SPA routing')
    } catch (error) {
      console.error('❌ Failed to create 404.html:', error.message)
    }
  }
})

// https://vite.dev/config/
// Base path cho GitHub Pages:
// - Nếu repo là project page (username.github.io/repo-name): đặt base = '/repo-name/'
// - Nếu repo là user page (username.github.io): đặt base = '/'
// - Hoặc dùng relative paths: base = './' (hoạt động với mọi cấu hình, khuyến nghị)
export default defineConfig({
  plugins: [react(), create404Plugin()],
  // Sử dụng absolute paths vì app dùng custom domain (quizki.id.vn) tại root
  // Relative paths ('./') gây lỗi 404 khi GitHub Pages serve 404.html cho SPA routes
  // (vd: /kanji -> 404.html -> ./assets/... -> /kanji/assets/... -> 404!)
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Tách các lib lớn để giảm bundle chính
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          recharts: ['recharts'],
          icons: ['lucide-react'],
          react: ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 900, // nới nhẹ ngưỡng cảnh báo
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api/jotoba': {
        target: 'https://jotoba.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jotoba/, '/api'),
      },
      '/resource/audio': {
        target: 'https://jotoba.de',
        changeOrigin: true,
      },
    },
  },
})
