import React, { useState, useEffect, useRef, useMemo, Suspense, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls, Sparkles, Float, Stars, Environment, ContactShadows, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

// Suppress THREE.js deprecation warnings from R3F internals (THREE.Clock, etc.)
const _origWarn = console.warn;
console.warn = (...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
        msg.includes('THREE.THREE.Clock') ||
        msg.includes('PCFSoftShadowMap') ||
        msg.includes('should be greater than 0') ||
        msg.includes('BloomFilterError') ||
        msg.includes('Cross-Origin-Opener-Policy')
    ) return;
    _origWarn.apply(console, args);
};

// ==================== PET COMMANDS ====================
const PET_COMMANDS = [
    { id: 'idle', label: '🧘 Thư giãn', description: 'Thư giãn', duration: 0 },
    { id: 'walk', label: '🚶 Đi dạo', description: 'Đang đi dạo', duration: 0 },
    { id: 'run', label: '🏃 Chạy', description: 'Đang chạy', duration: 0 },
    { id: 'sit', label: '🪑 Ngồi', description: 'Ngồi nghỉ', duration: 0 },
    { id: 'sleep', label: '😴 Ngủ', description: 'Đang ngủ', duration: 0 },
    { id: 'jump', label: '⬆️ Nhảy', description: 'Nhảy', duration: 0 },
    { id: 'dance', label: '💃 Nhảy múa', description: 'Nhảy múa', duration: 0 },
    { id: 'eat', label: '🍖 Ăn', description: 'Đang ăn', duration: 0 },
];

// ==================== PET STAGES ====================
const PET_STAGES = [
    { name: 'Trứng Thần Kỳ', minLevel: 0, bg: 'from-slate-800 to-slate-900', bodyColor: '#a0aec0', accentColor: '#718096', scale: 1, isEgg: true, tails: 0, model: 'egg' },
    {
        name: 'Hồ Ly Con', minLevel: 1, bg: 'from-orange-900 to-amber-900', bodyColor: '#f6ad55', accentColor: '#ffffff', scale: 0.85, tails: 1, model: 'spirit',
        emissiveColor: '#000000', emissiveIntensity: 0, auraColor: null
    },
    {
        name: 'Hồ Ly Thông Thái', minLevel: 5, bg: 'from-orange-800 to-red-900', bodyColor: '#ff6b35', accentColor: '#fef08a', scale: 0.95, tails: 2, model: 'spirit',
        emissiveColor: '#ff4500', emissiveIntensity: 0.08, auraColor: '#ff6b35'
    },
    {
        name: 'Kitsune Bạc', minLevel: 10, bg: 'from-blue-900 to-slate-900', bodyColor: '#93c5fd', accentColor: '#1e3a8a', scale: 1.0, tails: 3, model: 'spirit',
        emissiveColor: '#4488ff', emissiveIntensity: 0.15, auraColor: '#60a5fa', orbColor: '#93c5fd'
    },
    {
        name: 'Kitsune Vàng', minLevel: 20, bg: 'from-yellow-900 to-orange-900', bodyColor: '#fde047', accentColor: '#b45309', scale: 1.05, tails: 5, model: 'spirit',
        emissiveColor: '#ffaa00', emissiveIntensity: 0.2, auraColor: '#fde047', orbColor: '#fbbf24', rings: true
    },
    {
        name: 'Kitsune Thần', minLevel: 35, bg: 'from-purple-900 to-fuchsia-900', bodyColor: '#d8b4fe', accentColor: '#fbcfe8', scale: 1.1, tails: 7, halo: true, model: 'white',
        emissiveColor: '#aa66ff', emissiveIntensity: 0.3, auraColor: '#d8b4fe', orbColor: '#c084fc', rings: true, glowPulse: true
    },
    {
        name: 'Ryū — Thần Rồng', minLevel: 50, bg: 'from-indigo-900 to-violet-900', bodyColor: '#818cf8', accentColor: '#c7d2fe', scale: 1.15, tails: 9, horns: true, halo: true, model: 'white',
        emissiveColor: '#6644ff', emissiveIntensity: 0.4, auraColor: '#818cf8', orbColor: '#a78bfa', rings: true, glowPulse: true, lightning: true
    },
];

const MODEL_PATHS = {
    egg: '/models/DragonEgg.glb',
    fox: '/models/Fox.glb',
    spirit: '/models/FoxSpirit.glb',
    white: '/models/WhiteKitsune.glb',
};

const getPetStage = (level) => {
    let stage = PET_STAGES[0];
    for (const s of PET_STAGES) { if (level >= s.minLevel) stage = s; }
    return stage;
};

// ==================== EMOTION ====================
const getEmoji = (action) => {
    if (action === 'sleep') return '💤';
    if (action === 'eat') return '🍖';
    if (action === 'dance') return '✨';
    if (action === 'jump') return '⭐';
    if (action === 'run') return '💨';
    if (action === 'sit') return '☁️';
    return '';
};

// ==================== EGG GLB ====================
const EggGLBModel = ({ stage }) => {
    const groupRef = useRef();
    const glowRef = useRef();
    const { scene, animations } = useGLTF(MODEL_PATHS.egg);
    const clonedScene = useMemo(() => {
        const clone = scene.clone(true);
        clone.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        return clone;
    }, [scene]);
    const { actions } = useAnimations(animations, groupRef);

    useEffect(() => {
        if (!actions) return;
        const names = Object.keys(actions);
        if (names.length > 0) { actions[names[0]].reset().fadeIn(0.3).play(); actions[names[0]].timeScale = 0.5; }
    }, [actions]);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.elapsedTime;
        groupRef.current.rotation.y += 0.004;
        groupRef.current.position.y = Math.sin(t * 1.2) * 0.06;
        if (glowRef.current) glowRef.current.intensity = 0.5 + Math.sin(t * 2) * 0.3;
    });

    const modelScale = useMemo(() => {
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3(); box.getSize(size);
        return (0.8 / Math.max(size.x, size.y, size.z)) * stage.scale;
    }, [scene, stage.scale]);
    const yOffset = useMemo(() => { const box = new THREE.Box3().setFromObject(scene); return -box.min.y * modelScale; }, [scene, modelScale]);

    return (
        <group ref={groupRef}>
            <primitive object={clonedScene} scale={[modelScale, modelScale, modelScale]} position={[0, yOffset - 0.4, 0]} />
            <Sparkles count={60} scale={1.5} size={4} color={stage.accentColor} speed={0.5} />
            <pointLight ref={glowRef} position={[0, 0.1, 0]} color={stage.bodyColor} intensity={0.8} distance={2.5} />
        </group>
    );
};

// ==================== ORBITING ORB ====================
const OrbitingOrb = ({ radius, speed, yOffset, color, size }) => {
    const ref = useRef();
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        ref.current.position.set(Math.cos(t * speed) * radius, yOffset + Math.sin(t * speed * 2) * 0.1, Math.sin(t * speed) * radius);
    });
    return (<mesh ref={ref}><sphereGeometry args={[size, 12, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} transparent opacity={0.8} /></mesh>);
};

// ==================== MAGIC RING ====================
const MagicRing = ({ radius, color, speed, yPos }) => {
    const ref = useRef();
    useFrame((state) => {
        ref.current.rotation.z = state.clock.elapsedTime * speed;
        ref.current.material.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    });
    return (
        <mesh ref={ref} position={[0, yPos, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.008, 8, 64]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.35} />
        </mesh>
    );
};

// ==================== FOX GLB MODEL ====================
const FoxGLBModel = ({ modelPath, action, stage, streak }) => {
    const groupRef = useRef();
    const { scene, animations } = useGLTF(modelPath);

    const clonedScene = useMemo(() => {
        const clone = scene.clone(true);
        clone.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material && stage.emissiveColor && stage.emissiveIntensity > 0) {
                    const mat = child.material.clone();
                    mat.emissive = new THREE.Color(stage.emissiveColor);
                    mat.emissiveIntensity = stage.emissiveIntensity;
                    child.material = mat;
                }
            }
        });
        return clone;
    }, [scene, stage.emissiveColor, stage.emissiveIntensity]);

    const { actions } = useAnimations(animations, groupRef);

    // Log animations on first load (only in dev, and only if there ARE animations)
    useEffect(() => {
        if (actions) {
            const names = Object.keys(actions);
            if (names.length > 0 && import.meta.env.DEV) {
                console.log(`[Pet] ${modelPath} animations:`, names);
            }
        }
    }, [actions, modelPath]);

    // Play matching animation with crossfade
    useEffect(() => {
        if (!actions) return;
        const animNames = Object.keys(actions);
        if (animNames.length === 0) return;

        const findAnim = (...keywords) => {
            for (const kw of keywords) {
                const found = animNames.find(n => n.toLowerCase().includes(kw.toLowerCase()));
                if (found) return found;
            }
            return null;
        };

        let targetAnim;
        let timeScale = 1.0;

        switch (action) {
            case 'walk':
                targetAnim = findAnim('walk', 'move', 'trot');
                timeScale = 0.8;
                break;
            case 'eat':
                targetAnim = findAnim('eat', 'walk', 'move');
                timeScale = 1.2;
                break;
            case 'run':
                targetAnim = findAnim('run', 'gallop', 'sprint', 'walk');
                timeScale = 1.6;
                break;
            case 'jump':
                targetAnim = findAnim('jump', 'run', 'gallop');
                timeScale = 1.8;
                break;
            case 'dance':
                targetAnim = findAnim('dance', 'run', 'walk');
                timeScale = 2.0;
                break;
            case 'sleep':
                targetAnim = findAnim('idle', 'survey', 'rest', 'sleep');
                timeScale = 0.12;
                break;
            case 'sit':
                targetAnim = findAnim('idle', 'survey', 'sit', 'rest');
                timeScale = 0.25;
                break;
            default: // idle
                targetAnim = findAnim('idle', 'survey', 'rest');
                timeScale = 0.5;
                break;
        }

        if (!targetAnim) targetAnim = animNames[0];

        if (targetAnim && actions[targetAnim]) {
            // Smooth crossfade
            Object.values(actions).forEach(a => a.fadeOut(0.5));
            const anim = actions[targetAnim];
            anim.reset().fadeIn(0.5).play();
            anim.timeScale = timeScale;
        }
    }, [action, actions]);

    // ====== PROCEDURAL MOVEMENT ======
    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.elapsedTime;
        const g = groupRef.current;
        const L = (curr, tgt, spd) => THREE.MathUtils.lerp(curr, tgt, spd);
        const s = 0.05; // base lerp speed

        switch (action) {
            case 'idle': {
                g.position.y = L(g.position.y, Math.sin(t * 1.0) * 0.01, s);
                g.rotation.y = L(g.rotation.y, Math.sin(t * 0.25) * 0.06, s * 0.4);
                g.rotation.z = L(g.rotation.z, Math.sin(t * 0.6) * 0.015, s);
                g.rotation.x = L(g.rotation.x, 0, s);
                const br = 1 + Math.sin(t * 1.3) * 0.006;
                g.scale.setScalar(br);
                break;
            }
            case 'walk': {
                g.position.y = L(g.position.y, Math.abs(Math.sin(t * 5)) * 0.025, s);
                g.rotation.y = L(g.rotation.y, Math.sin(t * 2.5) * 0.05, s);
                g.rotation.z = L(g.rotation.z, Math.sin(t * 5) * 0.02, s);
                g.rotation.x = L(g.rotation.x, 0, s);
                g.scale.setScalar(1);
                break;
            }
            case 'eat': {
                g.position.y = L(g.position.y, 0, s);
                g.rotation.x = L(g.rotation.x, Math.abs(Math.sin(t * 4)) * 0.1, s * 1.5);
                g.rotation.y = L(g.rotation.y, Math.sin(t * 1.5) * 0.03, s);
                g.rotation.z = L(g.rotation.z, 0, s);
                g.scale.setScalar(1);
                break;
            }
            case 'run': {
                g.position.y = L(g.position.y, Math.abs(Math.sin(t * 9)) * 0.12, s * 2.5);
                g.rotation.x = L(g.rotation.x, Math.sin(t * 9) * 0.06, s * 2);
                g.rotation.y = L(g.rotation.y, 0, s);
                g.rotation.z = L(g.rotation.z, Math.sin(t * 9) * 0.03, s * 1.5);
                g.scale.setScalar(1);
                break;
            }
            case 'jump': {
                const phase = (t * 3.5) % (Math.PI * 2);
                g.position.y = L(g.position.y, Math.max(0, Math.sin(phase)) * 0.35, s * 3);
                g.rotation.x = L(g.rotation.x, -Math.sin(phase) * 0.12, s * 2);
                g.rotation.y = L(g.rotation.y, 0, s);
                g.rotation.z = L(g.rotation.z, 0, s);
                g.scale.setScalar(1);
                break;
            }
            case 'sit': {
                g.position.y = L(g.position.y, -0.04, s * 0.4);
                g.rotation.x = L(g.rotation.x, 0.04, s * 0.3);
                g.rotation.y = L(g.rotation.y, Math.sin(t * 0.4) * 0.08, s * 0.4);
                g.rotation.z = L(g.rotation.z, Math.sin(t * 0.6) * 0.015, s);
                g.scale.setScalar(1);
                break;
            }
            case 'sleep': {
                g.position.y = L(g.position.y, -0.1, s * 0.2);
                g.rotation.x = L(g.rotation.x, 0.08, s * 0.15);
                g.rotation.y = L(g.rotation.y, 0, s * 0.2);
                g.rotation.z = L(g.rotation.z, 0.04, s * 0.15);
                const sleepB = 1 + Math.sin(t * 0.6) * 0.012;
                g.scale.setScalar(sleepB);
                break;
            }
            case 'dance': {
                g.position.y = L(g.position.y, Math.abs(Math.sin(t * 7)) * 0.1, s * 3);
                g.rotation.y = L(g.rotation.y, Math.sin(t * 2.5) * 0.35, s * 2);
                g.rotation.z = L(g.rotation.z, Math.sin(t * 7) * 0.06, s * 2);
                g.rotation.x = L(g.rotation.x, Math.cos(t * 3.5) * 0.04, s * 2);
                const dp = 1 + Math.abs(Math.sin(t * 7)) * 0.025;
                g.scale.setScalar(dp);
                break;
            }
        }
    });

    // Auto-detect scale & Y offset
    const modelScale = useMemo(() => {
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3(); box.getSize(size);
        return (1.2 / Math.max(size.x, size.y, size.z)) * stage.scale;
    }, [scene, stage.scale]);
    const yOffset = useMemo(() => { const box = new THREE.Box3().setFromObject(scene); return -box.min.y * modelScale; }, [scene, modelScale]);

    const emoji = getEmoji(action);

    return (
        <group ref={groupRef}>
            <primitive object={clonedScene} scale={[modelScale, modelScale, modelScale]} position={[0, yOffset - 0.5, 0]} />

            {emoji && (
                <Billboard position={[0, 0.75, 0]}>
                    <Text fontSize={0.2} anchorX="center" anchorY="middle">{emoji}</Text>
                </Billboard>
            )}

            {stage.halo && (
                <mesh position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.22, 0.015, 16, 32]} />
                    <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} />
                </mesh>
            )}

            {stage.auraColor && <pointLight position={[0, 0.3, 0]} color={stage.auraColor} intensity={stage.emissiveIntensity * 3} distance={3} />}
            {stage.auraColor && <Sparkles count={20 + stage.minLevel * 2} scale={1.8} size={stage.minLevel >= 20 ? 4 : 2} color={stage.auraColor} speed={0.4} />}
            {stage.orbColor && (
                <>
                    <OrbitingOrb radius={0.6} speed={1.5} yOffset={0.3} color={stage.orbColor} size={0.03} />
                    <OrbitingOrb radius={0.5} speed={-2} yOffset={0.5} color={stage.orbColor} size={0.025} />
                    {stage.minLevel >= 20 && <OrbitingOrb radius={0.7} speed={1} yOffset={0.15} color={stage.accentColor} size={0.035} />}
                    {stage.minLevel >= 50 && <OrbitingOrb radius={0.8} speed={-1.2} yOffset={0.6} color="#fff" size={0.02} />}
                </>
            )}
            {stage.rings && (
                <>
                    <MagicRing radius={0.5} color={stage.auraColor} speed={0.5} yPos={-0.1} />
                    {stage.minLevel >= 35 && <MagicRing radius={0.4} color={stage.orbColor} speed={-0.7} yPos={0.4} />}
                    {stage.minLevel >= 50 && <MagicRing radius={0.6} color={stage.accentColor} speed={0.3} yPos={0.7} />}
                </>
            )}
            {stage.minLevel >= 20 && <Sparkles count={50} scale={3} size={5} color={stage.accentColor} speed={0.6} />}
            {stage.lightning && <Sparkles count={80} scale={2.5} size={8} color="#fff" speed={3} opacity={0.4} />}
        </group>
    );
};

// Preload
useGLTF.preload('/models/DragonEgg.glb');
useGLTF.preload('/models/FoxSpirit.glb');
useGLTF.preload('/models/WhiteKitsune.glb');

// Loading fallback
const LoadingFallback = () => {
    const meshRef = useRef();
    useFrame((state) => { if (meshRef.current) { meshRef.current.rotation.y = state.clock.elapsedTime * 2; meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.3; } });
    return (<mesh ref={meshRef}><octahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#f6ad55" wireframe emissive="#f6ad55" emissiveIntensity={0.5} /></mesh>);
};

// ==================== COMMAND BUTTON ====================
const CommandButton = ({ cmd, isActive, onClick }) => (
    <button
        onClick={() => onClick(cmd.id)}
        className={`
            flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium
            transition-all duration-200 border
            ${isActive
                ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300 shadow-lg shadow-indigo-500/20 scale-105'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-gray-200 active:scale-95'
            }
        `}
    >
        <span className="text-base leading-none">{cmd.label.split(' ')[0]}</span>
        <span className="text-[9px] opacity-70">{cmd.label.split(' ').slice(1).join(' ')}</span>
    </button>
);

// ==================== MAIN PET COMPANION ====================
const PetCompanion = ({ petLevel = 0, streak = 0, petXP = 0, xpPercent = 0, xpProgress = 0, xpNeeded = 100, onInteract }) => {
    const [debugLevel, setDebugLevel] = useState(petLevel);
    useEffect(() => { setDebugLevel(petLevel); }, [petLevel]);

    const petStage = useMemo(() => getPetStage(debugLevel), [debugLevel]);
    const [currentAction, setCurrentAction] = useState('idle');
    const [isManualControl, setIsManualControl] = useState(false);
    const autoTimeoutRef = useRef(null);

    // Auto behavior when not manually controlling
    useEffect(() => {
        if (isManualControl) return;

        const autoWeights = { idle: 35, walk: 25, sit: 15, run: 10, eat: 10, sleep: 5 };
        const doNext = () => {
            const all = Object.entries(autoWeights);
            const total = all.reduce((s, [, w]) => s + w, 0);
            let r = Math.random() * total;
            let chosen = 'idle';
            for (const [act, wt] of all) { r -= wt; if (r <= 0) { chosen = act; break; } }
            setCurrentAction(chosen);
            autoTimeoutRef.current = setTimeout(doNext, 3000 + Math.random() * 3000);
        };
        doNext();
        return () => { if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current); };
    }, [isManualControl]);

    // Handle command button press
    const handleCommand = useCallback((actionId) => {
        // Clear any auto timeout
        if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
        setIsManualControl(true);
        setCurrentAction(actionId);

        // Return to auto mode after 8 seconds of manual control
        autoTimeoutRef.current = setTimeout(() => {
            setIsManualControl(false);
        }, 8000);
    }, []);

    const modelPath = petStage.model ? MODEL_PATHS[petStage.model] : null;
    const activeCmd = PET_COMMANDS.find(c => c.id === currentAction);

    return (
        <div className="relative w-full" style={{ minHeight: 420 }}>
            {/* 3D Viewport */}
            <div className={`w-full rounded-2xl overflow-hidden relative bg-gradient-to-b ${petStage.bg}`}
                style={{ height: 280, boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)' }}
            >
                <Canvas camera={{ position: [1.5, 0.6, 2], fov: 42 }} shadows={{ type: THREE.PCFShadowMap }}>
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
                    <pointLight position={[-3, 2, -3]} color={petStage.accentColor} intensity={0.6} />
                    <pointLight position={[2, 1, 2]} color="#fff5e1" intensity={0.3} />
                    <Environment preset="sunset" />
                    <Stars radius={50} depth={50} count={200} factor={3} saturation={0} fade speed={0.8} />

                    <Suspense fallback={<LoadingFallback />}>
                        <Float speed={1.0} rotationIntensity={0.05} floatIntensity={0.15}>
                            {petStage.isEgg ? (
                                <EggGLBModel stage={petStage} />
                            ) : modelPath ? (
                                <FoxGLBModel modelPath={modelPath} action={currentAction} stage={petStage} streak={streak} />
                            ) : null}
                        </Float>
                    </Suspense>

                    <ContactShadows position={[0, -0.5, 0]} opacity={0.5} scale={5} blur={2.5} far={2} />
                    <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2.2} autoRotate={currentAction === 'idle' && !isManualControl} autoRotateSpeed={0.4} />
                </Canvas>

                {/* Action status bar */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] text-white/60 backdrop-blur-sm px-3 py-1 rounded-full bg-black/40 pointer-events-none border border-white/10">
                    {isManualControl && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                    <span className="uppercase tracking-widest">{activeCmd?.description || 'Thư giãn'}</span>
                </div>
            </div>

            {/* ==================== COMMAND PANEL ==================== */}
            {!petStage.isEgg && (
                <div className="mt-2 px-1">
                    <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Điều khiển</span>
                        {isManualControl && (
                            <span className="text-[8px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full font-medium animate-pulse">MANUAL</span>
                        )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                        {PET_COMMANDS.map(cmd => (
                            <CommandButton key={cmd.id} cmd={cmd} isActive={currentAction === cmd.id} onClick={handleCommand} />
                        ))}
                    </div>
                </div>
            )}

            {/* Admin Controls */}
            <div className="flex items-center justify-between mt-2.5 px-2">
                <div className="flex items-center gap-2">
                    <button onClick={() => setDebugLevel(Math.max(0, debugLevel - 1))} className="text-gray-400 hover:text-indigo-500 font-bold active:scale-90 transition-transform px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">◀</button>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{petStage.name}</span>
                            <span className="text-[8px] bg-red-500/20 text-red-500 px-1 py-0.5 rounded uppercase font-bold">Admin</span>
                        </div>
                        <span className="text-[10px] text-gray-400">Lv.{debugLevel}</span>
                    </div>
                    <button onClick={() => setDebugLevel(debugLevel + 1)} className="text-gray-400 hover:text-indigo-500 font-bold active:scale-90 transition-transform px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">▶</button>
                </div>
                <span className="text-[10px] text-gray-400 text-right">👆 Kéo thả để xoay</span>
            </div>

            {/* XP Bar */}
            <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${xpPercent}%`, background: `linear-gradient(90deg, ${petStage.bodyColor}, ${petStage.accentColor})`, boxShadow: `0 0 10px ${petStage.bodyColor}80` }} />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-gray-400 px-1">
                <span>XP: {xpProgress}/{xpNeeded}</span>
                <span>Tiến hóa tiếp: Lv.{PET_STAGES.find(s => s.minLevel > petLevel)?.minLevel || 'MAX'}</span>
            </div>
        </div>
    );
};

export { PetCompanion, PET_STAGES, getPetStage };
export default PetCompanion;
