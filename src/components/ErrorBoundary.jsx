import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Đã xảy ra lỗi
        </h1>
        
        <p className="text-gray-600 mb-6">
          Ứng dụng đã gặp phải một lỗi không mong muốn. Vui lòng thử lại.
        </p>
        
        {import.meta.env.DEV && error && (
          <details className="mb-6 text-left bg-red-50 border border-red-200 rounded-lg p-4">
            <summary className="cursor-pointer text-sm font-semibold text-red-800 mb-2">
              Chi tiết lỗi (chỉ hiển thị trong development)
            </summary>
            <pre className="text-xs text-red-700 overflow-auto max-h-40 whitespace-pre-wrap">
              {error.toString()}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </button>
          
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}

function AppErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Log error to console in development
        if (import.meta.env.DEV) {
          console.error('Error caught by boundary:', error, errorInfo);
        }
        // TODO: Send to error reporting service (e.g., Sentry) in production
        // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
      }}
      onReset={() => {
        // Optionally reset app state here
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default AppErrorBoundary;

