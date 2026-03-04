/**
 * Security utilities to protect against F12 console attacks.
 * 
 * Key protections:
 * 1. Freeze critical objects to prevent tampering
 * 2. Hide sensitive console logs in production
 * 3. Validate data integrity client-side
 * 4. Prevent localStorage injection of API keys
 */

// ==================== CONSOLE PROTECTION ====================

/**
 * In production, suppress sensitive console output (API keys, credits, etc.)
 * Attackers use console.log output to discover API keys and internal state.
 */
export const initConsoleProtection = () => {
    if (import.meta.env.DEV) return; // Keep full logging in dev

    const noop = () => { };
    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
    };

    // Override console.log to filter sensitive data
    console.log = (...args) => {
        // Block all console.log in production to prevent info leakage
        // API keys, credit counts, provider info are all logged
        return;
    };

    // Keep warnings and errors but sanitize them
    console.warn = (...args) => {
        const sanitized = args.map(arg => {
            if (typeof arg === 'string') {
                // Hide API keys from error messages
                return arg.replace(/[A-Za-z0-9_-]{30,}/g, '[REDACTED]');
            }
            return arg;
        });
        originalConsole.warn(...sanitized);
    };

    console.error = (...args) => {
        const sanitized = args.map(arg => {
            if (typeof arg === 'string') {
                return arg.replace(/[A-Za-z0-9_-]{30,}/g, '[REDACTED]');
            }
            return arg;
        });
        originalConsole.error(...sanitized);
    };
};

// ==================== CREDIT VALIDATION ====================

/**
 * Validate credit operations to prevent manipulation.
 * Returns true if the credit change is valid.
 */
export const validateCreditChange = (currentCredits, newCredits, operation) => {
    // Credits must be a number
    if (typeof newCredits !== 'number' || isNaN(newCredits)) return false;

    // Credits can't be negative
    if (newCredits < 0) return false;

    // For deduction: new must be exactly 1 less
    if (operation === 'deduct') {
        return newCredits === Math.max(0, currentCredits - 1);
    }

    // For initialization: must be exactly 100
    if (operation === 'init') {
        return newCredits === 100;
    }

    return false;
};

// ==================== GEMINI KEY PROTECTION ====================

/**
 * Prevent localStorage injection of API keys.
 * Attackers can set fake API keys via console:
 *   localStorage.setItem('geminiApiKeys', '["stolen-key"]')
 * This validates that keys match env-provided keys only.
 */
export const getSecureGeminiKeys = (envKeysFn) => {
    // ONLY use keys from env variables, NEVER from localStorage
    // This prevents: localStorage.setItem('geminiApiKeys', '["attacker-key"]')
    return envKeysFn();
};

// ==================== RATE LIMITING ====================

/**
 * Client-side rate limiter to prevent abuse.
 * Limits function calls per time window.
 */
export class RateLimiter {
    constructor(maxCalls, windowMs) {
        this.maxCalls = maxCalls;
        this.windowMs = windowMs;
        this.calls = [];
    }

    canProceed() {
        const now = Date.now();
        // Remove expired entries
        this.calls = this.calls.filter(t => now - t < this.windowMs);

        if (this.calls.length >= this.maxCalls) {
            return false;
        }

        this.calls.push(now);
        return true;
    }

    getTimeUntilNext() {
        if (this.calls.length < this.maxCalls) return 0;
        const oldest = this.calls[0];
        return Math.max(0, this.windowMs - (Date.now() - oldest));
    }
}

// AI call rate limiter: max 10 calls per minute
export const aiRateLimiter = new RateLimiter(10, 60 * 1000);

// ==================== ADMIN VALIDATION ====================

/**
 * Additional admin check - verify admin email matches at call time,
 * not just at render time. This prevents:
 *   1. Setting isAdmin=true via React DevTools
 *   2. Calling admin functions from console
 */
export const verifyAdminAtCallTime = (auth, adminEmailEnv) => {
    if (!auth?.currentUser?.email || !adminEmailEnv) return false;
    const currentEmail = auth.currentUser.email.trim().toLowerCase();
    const adminEmail = adminEmailEnv.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
    return !!adminEmail && currentEmail === adminEmail;
};

// ==================== DATA SANITIZATION ====================

/**
 * Sanitize user input to prevent XSS via stored data.
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
};

/**
 * Validate Firebase document path to prevent path traversal.
 */
export const isValidFirebasePath = (path) => {
    if (!path || typeof path !== 'string') return false;
    // Must not contain '..' or '//' 
    if (path.includes('..') || path.includes('//')) return false;
    // Must start with expected prefix
    if (!path.startsWith('artifacts/') && !path.startsWith('kanji') && !path.startsWith('shared')) return false;
    return true;
};
