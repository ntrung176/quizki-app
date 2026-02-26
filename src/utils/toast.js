/**
 * Toast Notification System
 * Thay thế tất cả alert() bằng toast popup đẹp
 * 
 * Sử dụng: 
 *   import { showToast } from '../utils/toast';
 *   showToast('Thông báo thành công', 'success');
 *   showToast('Có lỗi xảy ra', 'error');
 *   showToast('Lưu ý nha', 'warning');
 *   showToast('Thông tin', 'info');
 */

let toastContainer = null;

const ICONS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
};

const COLORS = {
    success: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', dark_bg: '#064e3b', dark_border: '#34d399', dark_text: '#a7f3d0' },
    error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', dark_bg: '#450a0a', dark_border: '#f87171', dark_text: '#fecaca' },
    warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', dark_bg: '#451a03', dark_border: '#fbbf24', dark_text: '#fde68a' },
    info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', dark_bg: '#172554', dark_border: '#60a5fa', dark_text: '#bfdbfe' }
};

const getContainer = () => {
    if (toastContainer && document.body.contains(toastContainer)) return toastContainer;

    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
        position: fixed; top: 16px; right: 16px; z-index: 99999;
        display: flex; flex-direction: column; gap: 8px;
        pointer-events: none; max-width: 400px;
    `;
    document.body.appendChild(toastContainer);
    return toastContainer;
};

export const showToast = (message, type = 'info', duration = 3500) => {
    const container = getContainer();
    const isDark = document.documentElement.classList.contains('dark');
    const color = COLORS[type] || COLORS.info;
    const icon = ICONS[type] || ICONS.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        display: flex; align-items: center; gap: 10px;
        padding: 12px 16px; border-radius: 12px;
        background: ${isDark ? color.dark_bg : color.bg};
        border: 1px solid ${isDark ? color.dark_border : color.border};
        color: ${isDark ? color.dark_text : color.text};
        font-size: 13px; font-weight: 500; line-height: 1.4;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.1);
        pointer-events: auto; cursor: pointer;
        transform: translateX(120%); transition: all 0.35s cubic-bezier(0.21, 1.02, 0.73, 1);
        backdrop-filter: blur(8px); max-width: 100%;
    `;

    toast.innerHTML = `
        <span style="font-size:18px;flex-shrink:0">${icon}</span>
        <span style="flex:1;word-break:break-word">${message}</span>
    `;

    toast.onclick = () => removeToast(toast);
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    // Auto remove
    const timer = setTimeout(() => removeToast(toast), duration);
    toast._timer = timer;
};

const removeToast = (toast) => {
    if (toast._removed) return;
    toast._removed = true;
    clearTimeout(toast._timer);
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
};
