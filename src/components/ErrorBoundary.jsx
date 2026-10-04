import React, { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, RotateCcw, Home, X, Copy, Check, ChevronDown, ShieldAlert } from 'lucide-react';
import { showToast } from '../utils/toast';

/**
 * Helper to detect if current user has admin privileges.
 */
const isUserAdmin = () => {
  try {
    if (typeof window !== 'undefined' && window.__QUIZKI_IS_ADMIN__) return true;
    if (import.meta.env.DEV) return true;
    const adminCache = sessionStorage.getItem('quizki_is_admin');
    if (adminCache === 'true') return true;
    const profile = JSON.parse(localStorage.getItem('quizki-profile') || '{}');
    if (profile?.isAdmin || profile?.role === 'admin') return true;
  } catch (_) {}
  return false;
};

/**
 * Root Application Error Pop-up Fallback
 * Renders as a focused pop-up modal dialog over the application.
 */
function AppErrorFallback({ error, resetErrorBoundary }) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isAdmin = isUserAdmin();

  if (isDismissed) return null;

  const handleCopyError = () => {
    const errorText = `[QuizKi Error Report]\nURL: ${window.location.href}\nTime: ${new Date().toISOString()}\nMessage: ${error?.message || error?.toString()}\n\nStack:\n${error?.stack || 'No stack trace'}`;
    navigator.clipboard.writeText(errorText).then(() => {
      setCopied(true);
      if (typeof showToast === 'function') {
        showToast('Đã sao chép chi tiết mã lỗi vào bộ nhớ tạm', 'info');
      }
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 text-center relative overflow-hidden animate-scale-up">
        {/* Top close button */}
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top accent border */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

        {/* Alert Icon Badge */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 mb-3.5 shadow-inner">
          <AlertTriangle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
        </div>

        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
          Đã xảy ra sự cố
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed max-w-sm mx-auto">
          Ứng dụng vừa gặp phải lỗi không mong muốn. Bạn có thể thử lại, quay lại trang trước hoặc về trang chủ.
        </p>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              type="button"
              onClick={resetErrorBoundary}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#204051] hover:bg-[#162e3b] dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl shadow-md transition-all font-bold text-xs sm:text-sm cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Thử lại ngay</span>
            </button>

            <button
              type="button"
              onClick={handleGoBack}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all font-semibold text-xs sm:text-sm cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          </div>

          <div className="pt-1 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleGoHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 dark:text-cyan-400 hover:underline font-bold cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Về trang chủ</span>
            </button>

            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Đóng màn hình lỗi</span>
            </button>

            {/* Admin-only copy error button */}
            {isAdmin && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={handleCopyError}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép lỗi'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Admin-only technical details accordion */}
        {isAdmin && error && (
          <div className="mt-4 text-left bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>Chi tiết lỗi ({error.name || 'Error'})</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
            </button>

            {showDetails && (
              <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap select-all custom-scrollbar">
                {error.toString()}
                {error.stack && `\n\n${error.stack}`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Section Error Fallback Modal / Pop-up
 * Displays as a pop-up modal so the user doesn't lose access to the current page.
 */
export function SectionErrorFallback({ error, resetErrorBoundary, name = 'Tính năng', minimal = false, onDismiss }) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isAdmin = isUserAdmin();

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleGoBack = () => {
    setIsDismissed(true);
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const handleGoHome = () => {
    setIsDismissed(true);
    window.location.href = '/';
  };

  const handleCopy = (e) => {
    e?.stopPropagation();
    const errorText = `[${name} Error]\n${error?.message || error?.toString()}\n\nStack:\n${error?.stack || ''}`;
    navigator.clipboard.writeText(errorText);
    setCopied(true);
    if (typeof showToast === 'function') {
      showToast('Đã sao chép thông tin lỗi', 'info');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center relative overflow-hidden animate-scale-up">
        {/* Top close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

        {/* Warning Badge */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 mb-3 shadow-inner">
          <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5">
          {name} gặp sự cố
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed max-w-xs mx-auto">
          Tính năng này vừa gặp lỗi xử lý. Bạn có thể thử lại, quay lại trang trước hoặc đóng thông báo.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={resetErrorBoundary}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#204051] hover:bg-[#162e3b] dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>

            <button
              type="button"
              onClick={handleGoBack}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Quay lại
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>

          <div className="pt-1 flex items-center justify-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleGoHome}
              className="inline-flex items-center gap-1 text-indigo-600 dark:text-cyan-400 hover:underline font-bold cursor-pointer py-1 px-2"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Về trang chủ</span>
            </button>

            {isAdmin && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium cursor-pointer py-1 px-2"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép lỗi'}</span>
                </button>
              </>
            )}
          </div>

          {/* Admin-only technical details accordion */}
          {isAdmin && error && (
            <div className="mt-3 text-left bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full px-3.5 py-2 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  <span>Chi tiết lỗi</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
              </button>

              {showDetails && (
                <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-900 text-emerald-400 font-mono text-[10px] leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap select-all custom-scrollbar">
                  {error.toString()}
                  {error.stack && `\n\n${error.stack}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Section Error Boundary Component
 * Wraps individual sub-features/modals to prevent cascading crashes.
 */
export function SectionErrorBoundary({ children, name = 'Tính năng', minimal = false, onReset, onDismiss, fallback }) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => {
        if (fallback) {
          if (typeof fallback === 'function') {
            return fallback({ error, resetErrorBoundary });
          }
          return fallback;
        }
        return (
          <SectionErrorFallback
            error={error}
            resetErrorBoundary={resetErrorBoundary}
            name={name}
            minimal={minimal}
            onDismiss={onDismiss}
          />
        );
      }}
      onError={(error, errorInfo) => {
        if (import.meta.env.DEV) {
          console.error(`[SectionErrorBoundary:${name}] caught an error:`, error, errorInfo);
        }
      }}
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Root Application Error Boundary
 */
function AppErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      FallbackComponent={AppErrorFallback}
      onError={(error, errorInfo) => {
        if (import.meta.env.DEV) {
          console.error('[AppErrorBoundary] caught top-level error:', error, errorInfo);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default AppErrorBoundary;
