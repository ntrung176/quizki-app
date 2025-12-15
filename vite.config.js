import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages (repo: quizki-app)
  base: '/quizki-app/',
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
