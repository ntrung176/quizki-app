import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Base path cho GitHub Pages:
// - Nếu repo là project page (username.github.io/repo-name): đặt base = '/repo-name/'
// - Nếu repo là user page (username.github.io): đặt base = '/'
// - Hoặc dùng relative paths: base = './' (hoạt động với mọi cấu hình, khuyến nghị)
export default defineConfig({
  plugins: [react()],
  // Sử dụng relative paths để hoạt động với mọi cấu hình GitHub Pages
  // Nếu vẫn bị lỗi 404, thử đổi thành '/Quizki/' hoặc '/quizki-app/' tùy theo tên repo
  base: './',
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
})
