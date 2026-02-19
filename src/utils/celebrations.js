/**
 * Celebration Effects - Confetti, sparkles, and fanfare animations
 * Pure CSS + JS, no dependencies
 */

// ==================== CONFETTI ====================
const CONFETTI_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', '#6C5CE7',
    '#A29BFE', '#FF85A1', '#00CEC9', '#FAB1A0', '#55EFC4',
    '#E17055', '#74B9FF', '#FFEAA7', '#DFE6E9', '#FD79A8'
];

const CONFETTI_SHAPES = ['square', 'circle', 'triangle'];

export function launchConfetti(duration = 2500, count = 80) {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;';
    document.body.appendChild(container);

    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const shape = CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
        const size = Math.random() * 8 + 6;
        const startX = Math.random() * 100;
        const drift = (Math.random() - 0.5) * 200;
        const delay = Math.random() * 600;
        const spinSpeed = Math.random() * 3 + 2;

        let shapeStyle = '';
        if (shape === 'circle') {
            shapeStyle = 'border-radius:50%;';
        } else if (shape === 'triangle') {
            shapeStyle = `width:0;height:0;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-bottom:${size}px solid ${color};background:transparent !important;`;
        }

        confetti.style.cssText = `
            position:absolute;
            top:-20px;
            left:${startX}%;
            width:${size}px;
            height:${size * 0.6}px;
            background:${color};
            opacity:1;
            ${shapeStyle}
            animation: confettiFall ${1.5 + Math.random() * 1.5}s ease-out ${delay}ms forwards;
        `;

        // Inject keyframes if not already done
        if (!document.getElementById('confetti-keyframes')) {
            const style = document.createElement('style');
            style.id = 'confetti-keyframes';
            style.textContent = `
                @keyframes confettiFall {
                    0% { transform: translateY(0) translateX(0) rotate(0deg) scale(1); opacity: 1; }
                    25% { opacity: 1; }
                    100% { transform: translateY(100vh) translateX(var(--drift, 100px)) rotate(var(--spin, 720deg)) scale(0.3); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        confetti.style.setProperty('--drift', `${drift}px`);
        confetti.style.setProperty('--spin', `${spinSpeed * 360}deg`);
        container.appendChild(confetti);
    }

    setTimeout(() => container.remove(), duration + 500);
}

// ==================== SPARKLE BURST (correct answer) ====================
export function launchSparkles(x, y, count = 12) {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
    document.body.appendChild(container);

    // Inject keyframes
    if (!document.getElementById('sparkle-keyframes')) {
        const style = document.createElement('style');
        style.id = 'sparkle-keyframes';
        style.textContent = `
            @keyframes sparkleBurst {
                0% { transform: translate(0, 0) scale(1); opacity: 1; }
                100% { transform: translate(var(--sx), var(--sy)) scale(0); opacity: 0; }
            }
            @keyframes sparkleRing {
                0% { transform: scale(0); opacity: 0.8; border-width: 4px; }
                100% { transform: scale(3); opacity: 0; border-width: 0px; }
            }
        `;
        document.head.appendChild(style);
    }

    // Expanding ring
    const ring = document.createElement('div');
    ring.style.cssText = `
        position:absolute;
        left:${x - 30}px;
        top:${y - 30}px;
        width:60px;
        height:60px;
        border-radius:50%;
        border:4px solid #FDCB6E;
        animation:sparkleRing 0.6s ease-out forwards;
        pointer-events:none;
    `;
    container.appendChild(ring);

    // Particles
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        const angle = (i / count) * Math.PI * 2;
        const distance = 40 + Math.random() * 60;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const size = Math.random() * 6 + 3;
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const isCircle = Math.random() > 0.5;

        particle.style.cssText = `
            position:absolute;
            left:${x - size / 2}px;
            top:${y - size / 2}px;
            width:${size}px;
            height:${size}px;
            background:${color};
            border-radius:${isCircle ? '50%' : '2px'};
            animation: sparkleBurst 0.6s ease-out ${Math.random() * 100}ms forwards;
        `;
        particle.style.setProperty('--sx', `${dx}px`);
        particle.style.setProperty('--sy', `${dy}px`);
        container.appendChild(particle);
    }

    setTimeout(() => container.remove(), 1000);
}

// ==================== CELEBRATION BANNER (completion) ====================
export function showCelebrationBanner(text = '🎊 Tuyệt vời! 🎊') {
    // Inject keyframes
    if (!document.getElementById('celebration-banner-keyframes')) {
        const style = document.createElement('style');
        style.id = 'celebration-banner-keyframes';
        style.textContent = `
            @keyframes bannerSlideIn {
                0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
                70% { transform: translate(-50%, -50%) scale(0.98); }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            @keyframes bannerGlow {
                0%, 100% { box-shadow: 0 0 20px rgba(253, 203, 110, 0.3); }
                50% { box-shadow: 0 0 40px rgba(253, 203, 110, 0.6), 0 0 60px rgba(253, 203, 110, 0.2); }
            }
            @keyframes bannerFade {
                to { transform: translate(-50%, -80%) scale(0.9); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 99998;
        padding: 16px 40px;
        border-radius: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 24px;
        font-weight: 900;
        letter-spacing: 1px;
        pointer-events: none;
        animation: bannerSlideIn 0.6s ease-out, bannerGlow 1.5s ease-in-out infinite;
        white-space: nowrap;
    `;
    banner.textContent = text;
    document.body.appendChild(banner);

    setTimeout(() => {
        banner.style.animation = 'bannerFade 0.4s ease-in forwards';
        setTimeout(() => banner.remove(), 500);
    }, 2500);
}

// ==================== FANFARE (gold explosion for completion) ====================
export function launchFanfare() {
    // 1. Big confetti burst
    launchConfetti(3500, 150);

    // 2. Show banner
    showCelebrationBanner('🏆 Hoàn thành xuất sắc! 🏆');

    // 3. Side cannons (delayed)
    setTimeout(() => {
        launchSideCannon('left');
        launchSideCannon('right');
    }, 300);

    // 4. Play fanfare sound using Web Audio API
    playFanfareSound();
}

function launchSideCannon(side) {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;';
    document.body.appendChild(container);

    if (!document.getElementById('cannon-keyframes')) {
        const style = document.createElement('style');
        style.id = 'cannon-keyframes';
        style.textContent = `
            @keyframes cannonShoot {
                0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
                100% { transform: translate(var(--cx), var(--cy)) rotate(var(--cr, 360deg)) scale(0.2); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    const startX = side === 'left' ? 5 : 95;
    const startY = 70;

    for (let i = 0; i < 40; i++) {
        const piece = document.createElement('div');
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        const size = Math.random() * 10 + 5;
        const angle = side === 'left'
            ? -20 + Math.random() * 80  // shoot right and up
            : 120 + Math.random() * 80; // shoot left and up
        const rad = (angle * Math.PI) / 180;
        const distance = 200 + Math.random() * 400;
        const dx = Math.cos(rad) * distance;
        const dy = Math.sin(rad) * distance - 200; // bias upward

        piece.style.cssText = `
            position:absolute;
            left:${startX}%;
            top:${startY}%;
            width:${size}px;
            height:${size * 0.6}px;
            background:${color};
            border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
            animation: cannonShoot ${1.5 + Math.random()}s ease-out ${Math.random() * 200}ms forwards;
        `;
        piece.style.setProperty('--cx', `${dx}px`);
        piece.style.setProperty('--cy', `${dy}px`);
        piece.style.setProperty('--cr', `${(Math.random() * 720).toFixed(0)}deg`);
        container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 3000);
}

// ==================== FANFARE SOUND (Web Audio API) ====================
function playFanfareSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Trumpet-like fanfare notes
        const notes = [
            { freq: 523.25, start: 0, dur: 0.15 },      // C5
            { freq: 659.25, start: 0.15, dur: 0.15 },   // E5
            { freq: 783.99, start: 0.3, dur: 0.15 },    // G5
            { freq: 1046.50, start: 0.45, dur: 0.4 },   // C6 (held)
            { freq: 783.99, start: 0.9, dur: 0.1 },     // G5
            { freq: 1046.50, start: 1.0, dur: 0.5 },    // C6 (final)
        ];

        notes.forEach(({ freq, start, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            // Sawtooth for trumpet-like timbre
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

            // Low-pass filter to soften
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, ctx.currentTime + start);

            // Envelope
            gain.gain.setValueAtTime(0, ctx.currentTime + start);
            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + start + 0.02);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + start + dur * 0.6);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + dur + 0.05);
        });

        // Close context after fanfare
        setTimeout(() => ctx.close(), 2500);
    } catch (e) {
        // Web Audio not supported, skip silently
        console.log('Web Audio API not available for fanfare');
    }
}

// ==================== CORRECT ANSWER EFFECT ====================
export function celebrateCorrectAnswer(event) {
    // Get position from event or use center
    let x, y;
    if (event?.clientX) {
        x = event.clientX;
        y = event.clientY;
    } else if (event?.target) {
        const rect = event.target.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    } else {
        x = window.innerWidth / 2;
        y = window.innerHeight / 2;
    }

    launchSparkles(x, y, 16);
}

// ==================== GREEN FLASH (subtle correct feedback) ====================
export function flashCorrect() {
    if (!document.getElementById('flash-keyframes')) {
        const style = document.createElement('style');
        style.id = 'flash-keyframes';
        style.textContent = `
            @keyframes flashGreen {
                0% { opacity: 0.4; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        inset: 0;
        background: radial-gradient(circle at center, rgba(72, 219, 127, 0.3), transparent 70%);
        pointer-events: none;
        z-index: 99990;
        animation: flashGreen 0.5s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
}
