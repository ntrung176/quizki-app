import React, { useEffect, useRef } from 'react';

/**
 * AudioWaveformVisualizer Component - Futuristic Cyber AI Edition
 * Visualizes microphone audio input stream or AI TTS audio playback
 * using HTML5 Canvas & Web Audio API AnalyserNode with glowing Sci-Fi effects.
 */
const AudioWaveformVisualizer = ({ 
    analyserNode, 
    isActive = false, 
    mode = 'mic', // 'mic' | 'ai'
    height = 45, 
    barColor = '#06b6d4' 
}) => {
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // High DPI scaling for crisp display
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = (rect.width || 300) * dpr;
        canvas.height = (height || 45) * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width || 300;
        const canvasHeight = height || 45;

        if (!isActive || !analyserNode) {
            // Render futuristic idle ambient pulse line with cyber dots
            ctx.clearRect(0, 0, width, canvasHeight);
            const midY = canvasHeight / 2;
            
            // Baseline glow
            ctx.beginPath();
            ctx.strokeStyle = mode === 'mic' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(16, 185, 129, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.moveTo(0, midY);
            ctx.lineTo(width, midY);
            ctx.stroke();

            // Central cyber pulse dot
            ctx.beginPath();
            ctx.fillStyle = mode === 'mic' ? '#06b6d4' : '#10b981';
            ctx.arc(width / 2, midY, 2.5, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const render = () => {
            animationFrameRef.current = requestAnimationFrame(render);
            analyserNode.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, width, canvasHeight);

            const barWidth = 3.5;
            const barGap = 3;
            const totalBars = Math.floor(width / (barWidth + barGap));
            const step = Math.max(1, Math.floor(bufferLength / totalBars));
            const midY = canvasHeight / 2;

            for (let i = 0; i < totalBars; i++) {
                const dataIndex = i * step;
                const value = dataArray[dataIndex] || 0;
                
                // Scale bar height to container
                const barHeight = Math.max(3, (value / 255) * (canvasHeight - 8));
                const x = i * (barWidth + barGap);
                const y = midY - barHeight / 2;

                // Cyber Linear Gradient with neon glow
                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                if (mode === 'mic') {
                    // Futuristic Cyan / Blue Spectrum
                    gradient.addColorStop(0, '#38bdf8'); // Sky 400
                    gradient.addColorStop(0.5, '#06b6d4'); // Cyan 500
                    gradient.addColorStop(1, '#3b82f6'); // Blue 500
                } else {
                    // Holographic Emerald / Teal Spectrum
                    gradient.addColorStop(0, '#34d399'); // Emerald 400
                    gradient.addColorStop(0.5, '#10b981'); // Emerald 500
                    gradient.addColorStop(1, '#06b6d4'); // Cyan 500
                }

                // Bar Shadow for Neon Glow effect
                ctx.shadowColor = mode === 'mic' ? 'rgba(6, 182, 212, 0.6)' : 'rgba(16, 185, 129, 0.6)';
                ctx.shadowBlur = value > 50 ? 8 : 2;

                ctx.fillStyle = gradient;
                
                // Draw sleek capsule bars
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, barWidth, barHeight, 2);
                } else {
                    ctx.rect(x, y, barWidth, barHeight);
                }
                ctx.fill();

                // Top Peak indicator dot for high frequencies
                if (value > 120) {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(x + barWidth / 2, y - 2, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        };

        render();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [analyserNode, isActive, mode, height, barColor]);

    return (
        <div className="w-full relative flex items-center justify-center">
            <canvas 
                ref={canvasRef} 
                className="w-full rounded-xl transition-all duration-300"
                style={{ height: `${height}px` }}
            />
        </div>
    );
};

export default AudioWaveformVisualizer;
