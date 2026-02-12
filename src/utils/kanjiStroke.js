/**
 * Kanji Stroke Animation using KanjiVG data + Mincho font rendering
 * 
 * Uses SVG mask technique:
 * - Ghost: Mincho font text at low opacity (always visible reference)
 * - Animation: Mincho font text masked by KanjiVG stroke paths
 *   that are progressively revealed, creating a "painting in" effect
 * - Both ghost and animated character appear in Mincho (serif) font
 * 
 * Also generates step-by-step stroke guide frames (Jotoba style).
 */

const SVG_CACHE = {};

// Convert kanji character to KanjiVG filename
function kanjiToFilename(char) {
    return char.codePointAt(0).toString(16).padStart(5, '0');
}

// Fetch KanjiVG SVG data for a kanji
export async function fetchKanjiSvg(char) {
    if (SVG_CACHE[char]) return SVG_CACHE[char];

    const filename = kanjiToFilename(char);
    const urls = [
        `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${filename}.svg`,
        `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${filename}.svg`,
    ];

    try {
        let svgText = null;
        for (const url of urls) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    svgText = await response.text();
                    break;
                }
            } catch (_) { /* try next URL */ }
        }
        if (!svgText) return null;

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const paths = doc.querySelectorAll('path[id*="-s"]');

        const strokes = [];
        paths.forEach((path) => {
            const d = path.getAttribute('d');
            const id = path.getAttribute('id');
            if (d) {
                strokes.push({ d, id });
            }
        });

        if (strokes.length === 0) return null;

        const result = { char, strokes, svgText };
        SVG_CACHE[char] = result;
        return result;
    } catch (e) {
        console.warn('KanjiVG fetch error for', char, e);
        return null;
    }
}

const MINCHO_FONT = "'Noto Serif JP','Yu Mincho','Hiragino Mincho ProN','MS Mincho',serif";

/**
 * Render animated kanji strokes into a container element.
 * Uses SVG mask: Mincho font text is masked by KanjiVG stroke paths
 * that are animated to reveal the character stroke-by-stroke.
 */
export async function renderKanjiStrokes(container, char, options = {}) {
    const {
        strokeColor = '#0891b2',
        guideColor = '#94a3b8',
        ghostColor = '#334155',
        strokeWidth = 4,          // unused for mask approach but kept for API compat
        animDuration = 0.7,
        delayBetween = 0.2,
        onComplete = null,
        fillContainer = true,
        brushStyle = true,        // kept for API compat
    } = options;

    const data = await fetchKanjiSvg(char);
    if (!data || !container) {
        container.innerHTML = `<span style="font-size:min(80%, 180px);color:${strokeColor};font-family:${MINCHO_FONT};line-height:1;user-select:none;display:flex;align-items:center;justify-content:center;width:100%;height:100%">${char}</span>`;
        return { replay: () => { }, stop: () => { }, hasData: false };
    }

    const { strokes } = data;
    let stopped = false;
    let animFrameId = null;

    // Mask stroke width - thick enough to fully reveal Mincho character strokes
    const MASK_SW = 15;
    // Unique ID suffix to avoid conflicts when multiple instances exist
    const uid = Math.random().toString(36).slice(2, 8);

    function buildSvg(animated = true) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 109 109');
        if (fillContainer) {
            svg.style.width = '100%';
            svg.style.height = '100%';
        }
        svg.style.display = 'block';

        const defs = document.createElementNS(ns, 'defs');

        // Mask: KanjiVG stroke paths control which parts of the Mincho text are visible
        const mask = document.createElementNS(ns, 'mask');
        mask.setAttribute('id', `km-${uid}`);

        // Black background = hide everything by default
        const maskBg = document.createElementNS(ns, 'rect');
        maskBg.setAttribute('width', '109');
        maskBg.setAttribute('height', '109');
        maskBg.setAttribute('fill', 'black');
        mask.appendChild(maskBg);

        // White KanjiVG strokes inside the mask = areas to reveal
        const maskPaths = [];
        strokes.forEach((s) => {
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', s.d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'white');
            path.setAttribute('stroke-width', String(MASK_SW));
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');

            if (animated) {
                // Start hidden, will be revealed during animation
                path.style.strokeDasharray = '500';
                path.style.strokeDashoffset = '500';
            }

            mask.appendChild(path);
            maskPaths.push(path);
        });

        defs.appendChild(mask);
        svg.appendChild(defs);

        // --- Guide grid (subtle dashed cross) ---
        const grid = document.createElementNS(ns, 'g');
        grid.setAttribute('opacity', '0.06');
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', '2'); rect.setAttribute('y', '2');
        rect.setAttribute('width', '105'); rect.setAttribute('height', '105');
        rect.setAttribute('fill', 'none'); rect.setAttribute('stroke', guideColor);
        rect.setAttribute('stroke-width', '0.8');
        rect.setAttribute('rx', '2');
        grid.appendChild(rect);
        [['54.5,2', '54.5,107'], ['2,54.5', '107,54.5']].forEach(([from, to]) => {
            const line = document.createElementNS(ns, 'line');
            const [x1, y1] = from.split(',');
            const [x2, y2] = to.split(',');
            line.setAttribute('x1', x1); line.setAttribute('y1', y1);
            line.setAttribute('x2', x2); line.setAttribute('y2', y2);
            line.setAttribute('stroke', guideColor);
            line.setAttribute('stroke-width', '0.4');
            line.setAttribute('stroke-dasharray', '2,3');
            grid.appendChild(line);
        });
        svg.appendChild(grid);

        // --- Ghost: Mincho text at low opacity (always visible) ---
        const ghostText = document.createElementNS(ns, 'text');
        ghostText.setAttribute('x', '54.5');
        ghostText.setAttribute('y', '57');
        ghostText.setAttribute('text-anchor', 'middle');
        ghostText.setAttribute('dominant-baseline', 'central');
        ghostText.setAttribute('font-size', '95');
        ghostText.setAttribute('font-family', MINCHO_FONT);
        ghostText.setAttribute('fill', ghostColor);
        ghostText.setAttribute('opacity', '0.13');
        ghostText.setAttribute('pointer-events', 'none');
        ghostText.textContent = char;
        svg.appendChild(ghostText);

        // --- Active: Mincho text masked by KanjiVG strokes ---
        const activeText = document.createElementNS(ns, 'text');
        activeText.setAttribute('x', '54.5');
        activeText.setAttribute('y', '57');
        activeText.setAttribute('text-anchor', 'middle');
        activeText.setAttribute('dominant-baseline', 'central');
        activeText.setAttribute('font-size', '95');
        activeText.setAttribute('font-family', MINCHO_FONT);
        activeText.setAttribute('fill', strokeColor);
        activeText.setAttribute('pointer-events', 'none');
        activeText.setAttribute('mask', `url(#km-${uid})`);
        activeText.textContent = char;
        svg.appendChild(activeText);

        return { svg, maskPaths };
    }

    // Smooth easing function - simulates brush acceleration/deceleration  
    function brushEasing(t) {
        if (t < 0.15) {
            return t * t * (1 / 0.0225) * 0.08;
        } else if (t > 0.85) {
            const p = (t - 0.85) / 0.15;
            return 0.92 + (1 - (1 - p) * (1 - p)) * 0.08;
        } else {
            const p = (t - 0.15) / 0.7;
            return 0.08 + p * 0.84;
        }
    }

    async function animate() {
        stopped = false;
        container.innerHTML = '';
        const { svg, maskPaths } = buildSvg(true);
        container.appendChild(svg);

        // After DOM insertion, get actual path lengths
        for (let i = 0; i < maskPaths.length; i++) {
            if (stopped) return;
            const maskPath = maskPaths[i];

            const length = maskPath.getTotalLength();
            maskPath.style.strokeDasharray = String(length);
            maskPath.style.strokeDashoffset = String(length);

            const duration = animDuration * 1000;
            const startTime = performance.now();

            await new Promise((resolve) => {
                function step(currentTime) {
                    if (stopped) { resolve(); return; }

                    const elapsed = currentTime - startTime;
                    const rawProgress = Math.min(1, elapsed / duration);
                    const progress = brushEasing(rawProgress);

                    // Reveal the mask stroke progressively
                    maskPath.style.strokeDashoffset = String(length * (1 - progress));

                    if (rawProgress < 1) {
                        animFrameId = requestAnimationFrame(step);
                    } else {
                        maskPath.style.strokeDashoffset = '0';
                        resolve();
                    }
                }
                animFrameId = requestAnimationFrame(step);
            });

            // Delay between strokes
            if (i < maskPaths.length - 1) {
                await new Promise(r => setTimeout(r, delayBetween * 1000));
            }
        }

        if (!stopped && onComplete) onComplete();
    }

    function showComplete() {
        stopped = true;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        container.innerHTML = '';
        const { svg } = buildSvg(false);
        container.appendChild(svg);
    }

    function replay() {
        stopped = true;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        setTimeout(() => animate(), 50);
    }

    function stop() {
        stopped = true;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        showComplete();
    }

    // Start initial animation
    animate();

    return { replay, stop, hasData: true };
}


/**
 * Generate stroke order guide frames (Jotoba style).
 * Each frame shows completed strokes, current stroke start (green dot),
 * and remaining strokes (very faint).
 */
export async function renderStrokeGuide(container, char, options = {}) {
    const {
        frameSize = 70,
        completedColor = '#e2e8f0',
        currentColor = '#22c55e',
        remainingColor = '#475569',
        bgColor = '#1e293b',
        gridColor = '#334155',
        strokeWidth = 2.5,
    } = options;

    const data = await fetchKanjiSvg(char);
    if (!data || !container) {
        container.innerHTML = '';
        return;
    }

    const { strokes } = data;
    const ns = 'http://www.w3.org/2000/svg';

    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.gap = '2px';
    container.style.overflowX = 'auto';
    container.style.padding = '4px';

    function getPathStart(d) {
        const match = d.match(/M\s*([\d.]+)[,\s]+([\d.]+)/i);
        if (match) return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        return null;
    }

    for (let step = 0; step < strokes.length; step++) {
        const wrapper = document.createElement('div');
        wrapper.style.flexShrink = '0';
        wrapper.style.width = frameSize + 'px';
        wrapper.style.height = frameSize + 'px';
        wrapper.style.borderRadius = '6px';
        wrapper.style.backgroundColor = bgColor;
        wrapper.style.border = '1px solid ' + gridColor;
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';

        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 109 109');
        svg.setAttribute('width', frameSize);
        svg.setAttribute('height', frameSize);
        svg.style.display = 'block';

        // Grid lines
        const grid = document.createElementNS(ns, 'g');
        grid.setAttribute('opacity', '0.2');
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', '2'); rect.setAttribute('y', '2');
        rect.setAttribute('width', '105'); rect.setAttribute('height', '105');
        rect.setAttribute('fill', 'none'); rect.setAttribute('stroke', gridColor);
        rect.setAttribute('stroke-width', '1');
        grid.appendChild(rect);
        [['54.5,2', '54.5,107'], ['2,54.5', '107,54.5']].forEach(([from, to]) => {
            const line = document.createElementNS(ns, 'line');
            const [x1, y1] = from.split(',');
            const [x2, y2] = to.split(',');
            line.setAttribute('x1', x1); line.setAttribute('y1', y1);
            line.setAttribute('x2', x2); line.setAttribute('y2', y2);
            line.setAttribute('stroke', gridColor);
            line.setAttribute('stroke-width', '0.5');
            line.setAttribute('stroke-dasharray', '3,3');
            grid.appendChild(line);
        });
        svg.appendChild(grid);

        strokes.forEach((s, i) => {
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', s.d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');

            if (i < step) {
                path.setAttribute('stroke', completedColor);
                path.setAttribute('stroke-width', strokeWidth);
                path.setAttribute('opacity', '0.9');
            } else if (i === step) {
                path.setAttribute('stroke', completedColor);
                path.setAttribute('stroke-width', strokeWidth);
                path.setAttribute('opacity', '1');
            } else {
                path.setAttribute('stroke', remainingColor);
                path.setAttribute('stroke-width', strokeWidth);
                path.setAttribute('opacity', '0.15');
            }

            svg.appendChild(path);
        });

        const startPoint = getPathStart(strokes[step].d);
        if (startPoint) {
            const glow = document.createElementNS(ns, 'circle');
            glow.setAttribute('cx', startPoint.x);
            glow.setAttribute('cy', startPoint.y);
            glow.setAttribute('r', '6');
            glow.setAttribute('fill', currentColor);
            glow.setAttribute('opacity', '0.3');
            svg.appendChild(glow);
            const circle = document.createElementNS(ns, 'circle');
            circle.setAttribute('cx', startPoint.x);
            circle.setAttribute('cy', startPoint.y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', currentColor);
            svg.appendChild(circle);
        }

        wrapper.appendChild(svg);
        container.appendChild(wrapper);
    }

    // Final frame - completed kanji
    const finalWrapper = document.createElement('div');
    finalWrapper.style.flexShrink = '0';
    finalWrapper.style.width = frameSize + 'px';
    finalWrapper.style.height = frameSize + 'px';
    finalWrapper.style.borderRadius = '6px';
    finalWrapper.style.backgroundColor = bgColor;
    finalWrapper.style.border = '1px solid ' + gridColor;
    finalWrapper.style.position = 'relative';
    finalWrapper.style.overflow = 'hidden';

    const finalSvg = document.createElementNS(ns, 'svg');
    finalSvg.setAttribute('viewBox', '0 0 109 109');
    finalSvg.setAttribute('width', frameSize);
    finalSvg.setAttribute('height', frameSize);
    finalSvg.style.display = 'block';

    const finalGrid = document.createElementNS(ns, 'g');
    finalGrid.setAttribute('opacity', '0.2');
    const finalRect = document.createElementNS(ns, 'rect');
    finalRect.setAttribute('x', '2'); finalRect.setAttribute('y', '2');
    finalRect.setAttribute('width', '105'); finalRect.setAttribute('height', '105');
    finalRect.setAttribute('fill', 'none'); finalRect.setAttribute('stroke', gridColor);
    finalRect.setAttribute('stroke-width', '1');
    finalGrid.appendChild(finalRect);
    finalSvg.appendChild(finalGrid);

    strokes.forEach(s => {
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', s.d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', completedColor);
        path.setAttribute('stroke-width', strokeWidth);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('opacity', '1');
        finalSvg.appendChild(path);
    });

    const checkCircle = document.createElementNS(ns, 'circle');
    checkCircle.setAttribute('cx', '97');
    checkCircle.setAttribute('cy', '12');
    checkCircle.setAttribute('r', '4');
    checkCircle.setAttribute('fill', currentColor);
    finalSvg.appendChild(checkCircle);

    finalWrapper.appendChild(finalSvg);
    container.appendChild(finalWrapper);
}
