import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/ErrorBoundary.jsx'
import { showToast, showConfirm } from './utils/toast';

// Expose toast systems globally to avoid repeating imports
window.showToast = showToast;
window.showConfirm = showConfirm;
window.alert = (message) => {
  showToast(message, 'info');
};

// Auto-recover when Vite dynamic chunk fails due to new production deployment
window.addEventListener('vite:preloadError', (event) => {
  console.warn('⚠️ Vite preload error detected (bản cập nhật mới trên server), tự động tải lại trang...', event);
  const reloaded = sessionStorage.getItem('vite_preload_retry');
  if (!reloaded) {
    sessionStorage.setItem('vite_preload_retry', 'true');
    window.location.reload();
  }
});
import { QueryProvider } from './providers/QueryProvider.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { TargetLanguageProvider } from './context/TargetLanguageContext.jsx'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryProvider>
        <LanguageProvider>
          <TargetLanguageProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </TargetLanguageProvider>
        </LanguageProvider>
      </QueryProvider>
    </AppErrorBoundary>
  </StrictMode>,
)

