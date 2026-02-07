import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/ErrorBoundary.jsx'
import { QueryProvider } from './providers/QueryProvider.jsx'

// Setup web-vitals for performance monitoring
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('[Web Vitals]', metric.name, metric.value, metric.id);
  }

  // TODO: Send to analytics service in production
  // Example: gtag('event', metric.name, { ... });
  // Or send to your backend: fetch('/api/analytics', { method: 'POST', body: JSON.stringify(metric) });
}

// Measure Core Web Vitals
onCLS(sendToAnalytics);  // Cumulative Layout Shift
onINP(sendToAnalytics);  // Interaction to Next Paint (thay thế FID từ 2024)
onFCP(sendToAnalytics);  // First Contentful Paint
onLCP(sendToAnalytics);  // Largest Contentful Paint
onTTFB(sendToAnalytics); // Time to First Byte

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryProvider>
    </AppErrorBoundary>
  </StrictMode>,
)

