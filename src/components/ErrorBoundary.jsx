import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, Home, X, Copy, Check, ChevronDown, ShieldAlert } from 'lucide-react';
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
 * Determine safe fallback route for current context so the user is never stranded.
 */
export const getSafeFallbackUrl = () => {
  try {
    const pathname = window.location.pathname || '';

    // 1. Vocabulary review / study modes / flashcards / match / test
    if (
      pathname.includes('/vocab/review') ||
      pathname.includes('/vocab/study') ||
      pathname.includes('/vocab/flashcards') ||
      pathname.includes('/vocab/test') ||
      pathname.includes('/vocab/set/') ||
      pathname.includes('/vocab/edit/') ||
      pathname.includes('/vocab/add')
    ) {
      return '/vocab/list';
    }
    if (pathname.startsWith('/vocab') && pathname !== '/vocab/list') {
      return '/vocab/list';
    }

    // 2. Books & Reading
    if (pathname.startsWith('/books')) {
      return '/books';
    }

    // 3. Kanji screens
    if (pathname.startsWith('/kanji')) {
      if (pathname === '/kanji/saved' || pathname === '/kanji') {
        return '/';
      }
      return '/kanji/saved';
    }

    // 4. Grammar screens
    if (pathname.startsWith('/grammar')) {
      if (pathname === '/grammar') {
        return '/';
      }
      return '/grammar';
    }

    // 5. JLPT & Kaiwa
    if (pathname.startsWith('/jlpt') || pathname.startsWith('/kaiwa')) {
      return '/';
    }

    // 6. Stats, Forum, Account, Settings, Help
    if (
      pathname.startsWith('/stats') ||
      pathname.startsWith('/forum') ||
      pathname.startsWith('/account') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/help')
    ) {
      return '/';
    }

    // Default fallback
    return '/';
  } catch (_) {
    return '/';
  }
};

/**
 * Root Application Error Pop-up Fallback
 * Renders as a focused pop-up modal dialog over the application.
 */
function AppErrorFallback({ error, resetErrorBoundary }) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const isAdmin = isUserAdmin();

  // Reset error boundary if user uses browser history navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof resetErrorBoundary === 'function') {
        try {
          resetErrorBoundary();
        } catch (_) {}
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resetErrorBoundary]);

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
    if (window.location.pathname === '/') {
      window.location.reload();
    } else {
      window.location.href = '/';
    }
  };

  const handleCloseFeature = () => {
    const safeUrl = getSafeFallbackUrl();
    if (window.location.pathname === safeUrl && (!window.location.search || safeUrl === '/')) {
      window.location.reload();
    } else {
      window.location.href = safeUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 text-center relative overflow-hidden animate-scale-up">
        {/* Top close button */}
        <button
          type="button"
          onClick={handleCloseFeature}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Đóng tính năng"
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
          Tính năng này vừa gặp lỗi xử lý. Bạn có thể bấm đóng tính năng để quay lại hoặc về trang chủ để tiếp tục sử dụng bình thường.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              type="button"
              onClick={handleCloseFeature}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#204051] hover:bg-[#162e3b] dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl shadow-md transition-all font-bold text-xs sm:text-sm cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4" />
              <span>Đóng tính năng</span>
            </button>

            <button
              type="button"
              onClick={handleGoHome}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-all font-semibold text-xs sm:text-sm cursor-pointer active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>Về trang chủ</span>
            </button>
          </div>

          {/* Admin-only copy error button */}
          {isAdmin && (
            <div className="pt-1 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCopyError}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép chi tiết' : 'Sao chép lỗi (Admin)'}</span>
              </button>
            </div>
          )}
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
  const isAdmin = isUserAdmin();

  // Reset error boundary if user uses browser history navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof resetErrorBoundary === 'function') {
        try {
          resetErrorBoundary();
        } catch (_) {}
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resetErrorBoundary]);

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

  const handleCloseFeature = () => {
    if (typeof onDismiss === 'function') {
      try {
        onDismiss();
      } catch (e) {
        console.error('Error in onDismiss:', e);
      }
      if (typeof resetErrorBoundary === 'function') {
        try {
          resetErrorBoundary();
        } catch (_) {}
      }
      return;
    }

    const safeUrl = getSafeFallbackUrl();
    if (window.location.pathname === safeUrl && (!window.location.search || safeUrl === '/')) {
      window.location.reload();
    } else {
      window.location.href = safeUrl;
    }
  };

  const handleGoHome = () => {
    if (window.location.pathname === '/') {
      window.location.reload();
    } else {
      window.location.href = '/';
    }
  };

  // Inline minimal fallback for individual list cards
  if (minimal) {
    return (
      <div className="p-3 my-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
        <span className="flex items-center gap-1.5 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{name} gặp sự cố hiển thị</span>
        </span>
        {isAdmin && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded cursor-pointer"
            title="Sao chép lỗi"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center relative overflow-hidden animate-scale-up">
        {/* Top close button */}
        <button
          type="button"
          onClick={handleCloseFeature}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Đóng tính năng"
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
          Tính năng này vừa gặp lỗi xử lý. Bạn có thể bấm đóng tính năng hoặc về trang chủ để tiếp tục sử dụng bình thường.
        </p>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              type="button"
              onClick={handleCloseFeature}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#204051] hover:bg-[#162e3b] dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4" />
              <span>Đóng tính năng</span>
            </button>

            <button
              type="button"
              onClick={handleGoHome}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>Về trang chủ</span>
            </button>
          </div>

          {/* Admin-only copy error button */}
          {isAdmin && (
            <div className="pt-1 flex items-center justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium cursor-pointer py-1 px-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép lỗi (Admin)'}</span>
              </button>
            </div>
          )}

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
export function SectionErrorBoundary({
  children,
  name = 'Tính năng',
  minimal = false,
  onReset,
  onDismiss,
  fallback,
  resetKeys
}) {
  const defaultResetKeys = typeof window !== 'undefined'
    ? [window.location.pathname, window.location.search]
    : [];

  return (
    <ErrorBoundary
      resetKeys={resetKeys || defaultResetKeys}
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
  const defaultResetKeys = typeof window !== 'undefined'
    ? [window.location.pathname, window.location.search]
    : [];

  return (
    <ErrorBoundary
      resetKeys={defaultResetKeys}
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
