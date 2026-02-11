/**
 * Kanji Stroke Animation using KanjiVG data
 * (Same data source used by Jotoba for stroke order)
 * 
 * Fetches SVG from KanjiVG, parses stroke paths,
 * and animates them using stroke-dasharray/dashoffset technique.
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

        // Parse SVG to extract stroke paths
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

/**
 * Render animated kanji strokes into a container element
 * @param {HTMLElement} container - DOM element to render into
 * @param {string} char - Kanji character
 * @param {Object} options - Animation options
 * @returns {Object} Controller with replay() and stop() methods
 */
export async function renderKanjiStrokes(container, char, options = {}) {
    const {
        strokeColor = '#0891b2',      // cyan-600
        guideColor = '#94a3b8',       // slate-400
        ghostColor = '#334155',       // slate-700 (very faint)
        strokeWidth = 3,
        animDuration = 0.5,           // seconds per stroke
        delayBetween = 0.15,          // seconds between strokes
        onComplete = null,
        fillContainer = true,         // fill entire container
    } = options;

    const data = await fetchKanjiSvg(char);
    if (!data || !container) {
        // Show fallback - large character
        container.innerHTML = `<span style="font-size:min(80%, 180px);color:${strokeColor};font-family:'Noto Sans JP','Yu Gothic',serif;line-height:1;user-select:none;display:flex;align-items:center;justify-content:center;width:100%;height:100%">${char}</span>`;
        return { replay: () => { }, stop: () => { }, hasData: false };
    }

    const { strokes } = data;
    let stopped = false;

    function buildSvg(animated = true) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 109 109');
        if (fillContainer) {
            svg.style.width = '100%';
            svg.style.height = '100%';
        }
        svg.style.display = 'block';

        // Subtle guide grid
        const grid = document.createElementNS(ns, 'g');
        grid.setAttribute('opacity', '0.08');
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', '2'); rect.setAttribute('y', '2');
        rect.setAttribute('width', '105'); rect.setAttribute('height', '105');
        rect.setAttribute('fill', 'none'); rect.setAttribute('stroke', guideColor);
        rect.setAttribute('stroke-width', '1');
        grid.appendChild(rect);
        [['54.5,2', '54.5,107'], ['2,54.5', '107,54.5']].forEach(([from, to]) => {
            const line = document.createElementNS(ns, 'line');
            const [x1, y1] = from.split(',');
            const [x2, y2] = to.split(',');
            line.setAttribute('x1', x1); line.setAttribute('y1', y1);
            line.setAttribute('x2', x2); line.setAttribute('y2', y2);
            line.setAttribute('stroke', guideColor);
            line.setAttribute('stroke-width', '0.5');
            line.setAttribute('stroke-dasharray', '3,3');
            grid.appendChild(line);
        });
        svg.appendChild(grid);

        // Ghost strokes (faint outline of full character)
        strokes.forEach(s => {
            const ghost = document.createElementNS(ns, 'path');
            ghost.setAttribute('d', s.d);
            ghost.setAttribute('fill', 'none');
            ghost.setAttribute('stroke', ghostColor);
            ghost.setAttribute('stroke-width', strokeWidth);
            ghost.setAttribute('stroke-linecap', 'round');
            ghost.setAttribute('stroke-linejoin', 'round');
            ghost.setAttribute('opacity', '0.15');
            svg.appendChild(ghost);
        });

        // Active strokes
        const strokeElements = [];
        strokes.forEach((s) => {
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', s.d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', strokeColor);
            path.setAttribute('stroke-width', strokeWidth);
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');

            if (animated) {
                path.style.opacity = '0';
            }

            svg.appendChild(path);
            strokeElements.push(path);
        });

        return { svg, strokeElements };
    }

    async function animate() {
        stopped = false;
        container.innerHTML = '';
        const { svg, strokeElements } = buildSvg(true);
        container.appendChild(svg);

        for (let i = 0; i < strokeElements.length; i++) {
            if (stopped) return;
            const path = strokeElements[i];
            path.style.opacity = '1';

            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;
            // Smooth cubic-bezier for natural brush feel
            path.style.transition = `stroke-dashoffset ${animDuration}s cubic-bezier(0.4, 0, 0.2, 1)`;

            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => setTimeout(r, 16));

            path.style.strokeDashoffset = '0';

            await new Promise(r => setTimeout(r, (animDuration + delayBetween) * 1000));
        }

        if (!stopped && onComplete) onComplete();
    }

    function showComplete() {
        stopped = true;
        container.innerHTML = '';
        const { svg } = buildSvg(false);
        container.appendChild(svg);
    }

    function replay() {
        stopped = true;
        setTimeout(() => animate(), 50);
    }

    function stop() {
        stopped = true;
        showComplete();
    }

    // Start initial animation
    animate();

    return { replay, stop, hasData: true };
}


/**
 * Generate Jotoba-style stroke order guide frames
 * Each frame shows: completed strokes (white), current stroke start (green dot), 
 * remaining strokes (very faint gray)
 * 
 * @param {HTMLElement} container - DOM element to render guide strip into
 * @param {string} char - Kanji character
 * @param {Object} options - Style options
 */
export async function renderStrokeGuide(container, char, options = {}) {
    const {
        frameSize = 70,
        completedColor = '#e2e8f0',    // white/light
        currentColor = '#22c55e',       // green-500 (dot)
        remainingColor = '#475569',     // slate-600
        bgColor = '#1e293b',           // slate-800
        gridColor = '#334155',         // slate-700
        strokeWidth = 2.5,
    } = options;

    const data = await fetchKanjiSvg(char);
    if (!data || !container) {
        container.innerHTML = '';
        return;
    }

    const { strokes } = data;
    const ns = 'http://www.w3.org/2000/svg';

    // Clear container
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.gap = '2px';
    container.style.overflowX = 'auto';
    container.style.padding = '4px';

    // Calculate the starting point of a path from its 'd' attribute
    function getPathStart(d) {
        const match = d.match(/M\s*([\d.]+)[,\s]+([\d.]+)/i);
        if (match) return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        return null;
    }

    // Generate one frame for each stroke
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

        // Grid lines (subtle)
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

        // Draw all strokes with different styles based on their position
        strokes.forEach((s, i) => {
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', s.d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');

            if (i < step) {
                // Completed strokes - bright white
                path.setAttribute('stroke', completedColor);
                path.setAttribute('stroke-width', strokeWidth);
                path.setAttribute('opacity', '0.9');
            } else if (i === step) {
                // Current stroke - white with green start dot
                path.setAttribute('stroke', completedColor);
                path.setAttribute('stroke-width', strokeWidth);
                path.setAttribute('opacity', '1');
            } else {
                // Future strokes - very faint
                path.setAttribute('stroke', remainingColor);
                path.setAttribute('stroke-width', strokeWidth);
                path.setAttribute('opacity', '0.15');
            }

            svg.appendChild(path);
        });

        // Green dot at current stroke start
        const startPoint = getPathStart(strokes[step].d);
        if (startPoint) {
            const circle = document.createElementNS(ns, 'circle');
            circle.setAttribute('cx', startPoint.x);
            circle.setAttribute('cy', startPoint.y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', currentColor);
            // Glow effect
            const glow = document.createElementNS(ns, 'circle');
            glow.setAttribute('cx', startPoint.x);
            glow.setAttribute('cy', startPoint.y);
            glow.setAttribute('r', '6');
            glow.setAttribute('fill', currentColor);
            glow.setAttribute('opacity', '0.3');
            svg.appendChild(glow);
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

    // Grid
    const finalGrid = document.createElementNS(ns, 'g');
    finalGrid.setAttribute('opacity', '0.2');
    const finalRect = document.createElementNS(ns, 'rect');
    finalRect.setAttribute('x', '2'); finalRect.setAttribute('y', '2');
    finalRect.setAttribute('width', '105'); finalRect.setAttribute('height', '105');
    finalRect.setAttribute('fill', 'none'); finalRect.setAttribute('stroke', gridColor);
    finalRect.setAttribute('stroke-width', '1');
    finalGrid.appendChild(finalRect);
    finalSvg.appendChild(finalGrid);

    // All strokes completed
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

    // Green dot at top right to indicate completion
    const checkCircle = document.createElementNS(ns, 'circle');
    checkCircle.setAttribute('cx', '97');
    checkCircle.setAttribute('cy', '12');
    checkCircle.setAttribute('r', '4');
    checkCircle.setAttribute('fill', currentColor);
    finalSvg.appendChild(checkCircle);

    finalWrapper.appendChild(finalSvg);
    container.appendChild(finalWrapper);
}
