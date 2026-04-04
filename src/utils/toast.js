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

/**
 * Thay thế window.confirm() bằng modal dialog đẹp
 * Trả về Promise<boolean>
 * 
 * Sử dụng:
 *   import { showConfirm } from '../utils/toast';
 *   const ok = await showConfirm('Bạn có chắc muốn xóa?');
 *   if (ok) { ... }
 */
export const showConfirm = (message, { confirmText = 'Xác nhận', cancelText = 'Hủy', type = 'warning' } = {}) => {
    return new Promise((resolve) => {
        const isDark = document.documentElement.classList.contains('dark');

        // Overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 99998;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.2s ease;
        `;

        // Modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: ${isDark ? '#1e293b' : '#ffffff'};
            border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
            border-radius: 16px; padding: 24px; max-width: 400px; width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            transform: scale(0.9); transition: transform 0.2s cubic-bezier(0.21, 1.02, 0.73, 1);
            text-align: center;
        `;

        const icon = type === 'danger' ? '🗑️' : '⚠️';
        const confirmColor = type === 'danger'
            ? 'background: linear-gradient(135deg, #ef4444, #dc2626);'
            : 'background: linear-gradient(135deg, #f59e0b, #d97706);';

        modal.innerHTML = `
            <div style="font-size: 36px; margin-bottom: 12px;">${icon}</div>
            <p style="color: ${isDark ? '#e2e8f0' : '#1e293b'}; font-size: 15px; font-weight: 500; line-height: 1.5; margin-bottom: 20px; word-break: break-word;">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="confirm-cancel" style="
                    flex: 1; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600;
                    border: 1px solid ${isDark ? '#475569' : '#cbd5e1'}; cursor: pointer;
                    background: ${isDark ? '#334155' : '#f1f5f9'}; color: ${isDark ? '#94a3b8' : '#64748b'};
                    transition: all 0.15s ease;
                ">${cancelText}</button>
                <button id="confirm-ok" style="
                    flex: 1; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600;
                    border: none; cursor: pointer; color: white; ${confirmColor}
                    transition: all 0.15s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                ">${confirmText}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        });

        const cleanup = (result) => {
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve(result);
            }, 200);
        };

        modal.querySelector('#confirm-cancel').onclick = () => cleanup(false);
        modal.querySelector('#confirm-ok').onclick = () => cleanup(true);
        overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };

        // ESC to cancel
        const handleKey = (e) => {
            if (e.key === 'Escape') { cleanup(false); window.removeEventListener('keydown', handleKey); }
            if (e.key === 'Enter') { cleanup(true); window.removeEventListener('keydown', handleKey); }
        };
        window.addEventListener('keydown', handleKey);
    });
};
