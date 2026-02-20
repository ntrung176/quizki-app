import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls, Sparkles, Float, Stars, Environment, ContactShadows, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

// ==================== PET ACTIONS ====================
const ACTION_DURATIONS = { idle: 3500, walk: 4000, jump: 1400, sit: 4000, sleep: 6000, dance: 2800, run: 3000, eat: 2200 };

// ==================== PET STAGES ====================
const PET_STAGES = [
    { name: 'Trứng Thần Kỳ', minLevel: 0, bg: 'from-slate-800 to-slate-900', bodyColor: '#a0aec0', accentColor: '#718096', scale: 1, isEgg: true, tails: 0 },
    { name: 'Hồ Ly Con', minLevel: 1, bg: 'from-orange-900 to-amber-900', bodyColor: '#f6ad55', accentColor: '#ffffff', scale: 0.9, tails: 1 },
    { name: 'Hồ Ly Thông Thái', minLevel: 5, bg: 'from-orange-800 to-red-900', bodyColor: '#ff4d4d', accentColor: '#fef08a', scale: 1.0, tails: 2 },
    { name: 'Kitsune Bạc', minLevel: 10, bg: 'from-blue-900 to-slate-900', bodyColor: '#93c5fd', accentColor: '#1e3a8a', scale: 1.1, tails: 3 },
    { name: 'Kitsune Vàng', minLevel: 20, bg: 'from-yellow-900 to-orange-900', bodyColor: '#fde047', accentColor: '#b45309', scale: 1.15, tails: 5 },
    { name: 'Kitsune Thần', minLevel: 35, bg: 'from-purple-900 to-fuchsia-900', bodyColor: '#d8b4fe', accentColor: '#fbcfe8', scale: 1.2, tails: 7, halo: true },
    { name: 'Ryū — Thần Rồng', minLevel: 50, bg: 'from-indigo-900 to-violet-900', bodyColor: '#818cf8', accentColor: '#c7d2fe', scale: 1.3, tails: 9, horns: true, halo: true },
];

const getPetStage = (level) => {
    let stage = PET_STAGES[0];
    for (const s of PET_STAGES) { if (level >= s.minLevel) stage = s; }
    return stage;
};

// ==================== EXPRESSION LOGIC ====================
const getFace = (streak, action) => {
    if (action === 'sleep') return { eyes: 'closed', mouth: 'sleep' };
    if (action === 'eat') return { eyes: 'happy', mouth: 'open' };
    if (action === 'dance') return { eyes: 'star', mouth: 'smile' };
    if (action === 'jump') return { eyes: 'wide', mouth: 'open' };
    if (streak === 0) return { eyes: 'sad', mouth: 'sad' };
    if (streak >= 7) return { eyes: 'star', mouth: 'smile' };
    if (streak >= 3) return { eyes: 'happy', mouth: 'smile' };
    return { eyes: 'normal', mouth: 'neutral' };
};

// ==================== PROCEDURAL 3D PET ====================
// Egg Model
const EggModel = ({ color }) => {
    const meshRef = useRef();
    useFrame((state, delta) => {
        meshRef.current.rotation.y += delta * 0.5;
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    });
    return (
        <group position={[0, 0.5, 0]}>
            <mesh ref={meshRef} castShadow>
                <icosahedronGeometry args={[0.5, 2]} />
                <meshStandardMaterial color={color} wireframe emissive={color} emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
            </mesh>
            <Sparkles count={50} scale={2} size={2} color={color} speed={0.4} />
        </group>
    );
};

// ==================== STAGE ENVIRONMENT (Floating Island) ====================
const StageEnvironment = ({ stage }) => {
    if (stage.minLevel === 0) return null; // Egg has no island

    let color = '#2d6a4f'; // Default grass
    let type = 'grass';
    if (stage.minLevel === 5) { type = 'desert'; color = '#d4a373'; }
    if (stage.minLevel === 10) { type = 'ice'; color = '#90e0ef'; }
    if (stage.minLevel === 20) { type = 'autumn'; color = '#ca6702'; }
    if (stage.minLevel === 35) { type = 'volcano'; color = '#370617'; }
    if (stage.minLevel === 50) { type = 'cloud'; color = '#e0aaff'; }

    return (
        <group position={[0, -0.1, 0]}>
            {/* Main floating island base */}
            <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[1.5, 1.1, 0.2, 32]} />
                <meshStandardMaterial color={color} roughness={1} />
            </mesh>

            {/* Environmental details based on stage */}
            {type === 'grass' && (
                <mesh position={[-0.8, 0.15, -0.5]} rotation={[0, 0, 0.2]}>
                    <coneGeometry args={[0.1, 0.3, 8]} />
                    <meshStandardMaterial color="#40916c" />
                </mesh>
            )}
            {type === 'desert' && (
                <group position={[-0.8, 0.25, -0.5]}>
                    {/* Cactus placeholder */}
                    <mesh castShadow><cylinderGeometry args={[0.08, 0.08, 0.5]} /><meshStandardMaterial color="#40916c" roughness={0.8} /></mesh>
                    <mesh castShadow position={[0.15, 0.05, 0]} rotation={[0, 0, 1.5]}><cylinderGeometry args={[0.05, 0.05, 0.2]} /><meshStandardMaterial color="#40916c" /></mesh>
                </group>
            )}
            {type === 'ice' && (
                <mesh position={[0.8, 0.25, -0.5]} rotation={[0.2, 0, 0.1]} castShadow>
                    {/* Ice crystal */}
                    <coneGeometry args={[0.15, 0.6, 5]} />
                    <meshStandardMaterial color="#caf0f8" transparent opacity={0.8} roughness={0.1} metalness={0.5} />
                </mesh>
            )}
            {type === 'autumn' && (
                <mesh position={[-0.9, 0.15, 0]} rotation={[0, 1, 0]} castShadow>
                    {/* Orange rock / stump */}
                    <cylinderGeometry args={[0.15, 0.2, 0.3, 8]} />
                    <meshStandardMaterial color="#9c6644" roughness={0.9} />
                </mesh>
            )}
            {type === 'volcano' && (
                <group position={[-0.8, 0.2, -0.6]} rotation={[-0.2, 0, 0]}>
                    {/* Volcano rock */}
                    <coneGeometry args={[0.3, 0.5, 8]} />
                    <meshStandardMaterial color="#1a0b0c" roughness={0.9} />
                    <mesh position={[0, 0.25, 0]}><sphereGeometry args={[0.05, 8, 8]} /><meshBasicMaterial color="#ff0000" /></mesh>
                </group>
            )}
            {type === 'cloud' && (
                <mesh position={[0, -0.15, 0]} scale={[1.2, 0.5, 1.2]}>
                    <sphereGeometry args={[1.5, 16, 16]} />
                    <meshStandardMaterial color="#ffffff" transparent opacity={0.7} roughness={1} />
                </mesh>
            )}
        </group>
    );
};

// ==================== STAGE ENVIRONMENT (Floating Island) ====================
// We removed StageEnvironment instances but keep this block empty or remove it.
// Dynamic Bending Tail
const FluffyTail = ({ index, totalTails, furMaterial, accentMaterial, action }) => {
    const rootRef = useRef();
    const midRef = useRef();
    const tipRef = useRef();

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const phase = index * 0.5;

        let tgRotBase = 0, tgRotMid = 0, tgRotTip = 0;

        if (action === 'sit') {
            tgRotBase = 0.2; tgRotMid = 0.3; tgRotTip = 0.4;
        } else if (action === 'sleep') {
            tgRotBase = 0.2; tgRotMid = 0.6; tgRotTip = 0.8;
        } else if (action === 'run' || action === 'jump') {
            tgRotBase = -0.3; tgRotMid = -0.2; tgRotTip = -0.1;
        } else {
            // Natural Flowing Sway
            tgRotBase = Math.sin(t * 2 + phase) * 0.15;
            tgRotMid = Math.sin(t * 2 + phase - 0.5) * 0.2;
            tgRotTip = Math.sin(t * 2 + phase - 1.0) * 0.25;
        }

        const lerpSpeed = 0.08;
        if (rootRef.current) rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, tgRotBase, lerpSpeed);
        if (midRef.current) midRef.current.rotation.x = THREE.MathUtils.lerp(midRef.current.rotation.x, tgRotMid, lerpSpeed);
        if (tipRef.current) tipRef.current.rotation.x = THREE.MathUtils.lerp(tipRef.current.rotation.x, tgRotTip, lerpSpeed);
    });

    // We will use 3 segments, shaped specifically to match a kitsune tail profile:
    // Narrow base -> Fat middle -> Sweeping pointy tip

    // Spread math to fan them out beautifully
    const angleX = 0.2 + (index % 2 === 0 ? 0 : 0.2); // Layered vertical effect
    const spread = totalTails <= 1 ? 0 : 1.4 * (index / (totalTails - 1) - 0.5); // Spread from -0.7 to +0.7 rad
    const angleY = spread + (index % 2 === 0 ? 0.05 : -0.05); // slight stagger

    // Smooth transition materials
    return (
        <group rotation={[angleX, angleY, 0]}>
            <group ref={rootRef}>
                {/* 1. Base (Narrowing in to the body) */}
                <mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.03, 0.09, 0.3, 16]} />
                    <meshStandardMaterial {...furMaterial} />
                </mesh>

                {/* Mid Pivot */}
                <group position={[0, 0, -0.3]} ref={midRef}>
                    {/* Seamless Joint 1 (Pill shape) */}
                    <mesh position={[0, 0, 0]}>
                        <sphereGeometry args={[0.09, 16, 16]} />
                        <meshStandardMaterial {...furMaterial} />
                    </mesh>

                    {/* 2. Middle (Fattest part, very fluffy) */}
                    <mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.09, 0.07, 0.3, 16]} />
                        <meshStandardMaterial {...furMaterial} />
                    </mesh>

                    {/* Add extra fluff spikes to the middle back */}
                    <mesh position={[0, 0.09, -0.15]} rotation={[-0.3, 0, 0]}>
                        <coneGeometry args={[0.04, 0.15, 8]} />
                        <meshStandardMaterial {...furMaterial} />
                    </mesh>

                    {/* Tip Pivot */}
                    <group position={[0, 0, -0.3]} ref={tipRef}>
                        {/* Seamless Joint 2 */}
                        <mesh position={[0, 0, 0]}>
                            <sphereGeometry args={[0.07, 16, 16]} />
                            <meshStandardMaterial {...furMaterial} />
                        </mesh>

                        {/* 3. Tip (Long sweeping point, accent colored) */}
                        <mesh position={[0, 0, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
                            {/* Cylinder tapering to a point */}
                            <cylinderGeometry args={[0.07, 0.005, 0.45, 16]} />
                            <meshStandardMaterial {...accentMaterial} />
                        </mesh>

                        {/* Extra accent fluff spikes on the tip curve */}
                        <mesh position={[0, 0.04, -0.1]} rotation={[-0.4, 0, 0]}>
                            <coneGeometry args={[0.04, 0.2, 8]} />
                            <meshStandardMaterial {...accentMaterial} />
                        </mesh>
                    </group>
                </group>
            </group>
        </group>
    );
};

// Chibi Quadruped Fluffy Kitsune Pet
const ProceduralPetModel = ({ stage, action, streak }) => {
    const groupRef = useRef();
    const headRef = useRef();
    const tailGroupRef = useRef();
    const bodyRef = useRef();

    // Detailed parts refs
    const flRef = useRef(); const frRef = useRef();
    const blRef = useRef(); const brRef = useRef();
    const earLRef = useRef(); const earRRef = useRef();
    const eyeBlinkRef = useRef(); // to scale Y during blinks

    const faceRef = useRef();
    const face = getFace(streak, action);

    // Dynamic Animation State Variables
    const [blink, setBlink] = useState(false);

    // Custom Blink loop
    useEffect(() => {
        let timeout1;
        const triggerBlink = () => {
            // Not blinking if sleeping!
            if (action !== 'sleep') {
                setBlink(true);
                setTimeout(() => setBlink(false), 150); // fast blink
            }
            timeout1 = setTimeout(triggerBlink, 2000 + Math.random() * 4000); // 2-6s between blinks
        };
        timeout1 = setTimeout(triggerBlink, 1000);
        return () => clearTimeout(timeout1);
    }, [action]);

    // Animation loop for procedural quadruped movement & natural idle
    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.elapsedTime;

        // --- DEFINE CONTINUOUS TARGETS ---
        let tgGrpY = 0, tgGrpRotY = 0;
        let tgBodyRotX = 0, tgBodyPosY = 0.4; // Note: Torso is now horizontal by default
        let tgAbdomenRotX = 0;
        let tgHeadRotX = 0, tgHeadRotY = 0, tgHeadRotZ = 0, tgHeadPosY = 0.65, tgHeadPosZ = 0.35;
        let tgTailRotX = 0, tgTailRotY = 0, tgTailRotZ = 0;
        let tgEarLRotX = 0, tgEarLRotY = 0, tgEarLRotZ = 0;
        let tgEarRRotX = 0, tgEarRRotY = 0, tgEarRRotZ = 0;

        let tgFlRotX = 0, tgFrRotX = 0, tgBlRotX = 0, tgBrRotX = 0;
        let tgFlKneeX = 0, tgFrKneeX = 0, tgBlKneeX = 0.3, tgBrKneeX = 0.3; // Default leg joints
        let tgFlPosY = 0.2, tgFrPosY = 0.2, tgBlPosY = 0.25, tgBrPosY = 0.25;
        let tgBlPosX = -0.15, tgBrPosX = 0.15;
        let tgBlPosZ = -0.25, tgBrPosZ = -0.25;
        let tgScale = 1;

        // Blink logic scale down
        if (eyeBlinkRef.current) {
            eyeBlinkRef.current.scale.y = THREE.MathUtils.lerp(eyeBlinkRef.current.scale.y, blink ? 0.05 : 1, 0.6);
        }

        const isSit = action === 'sit';
        const isSleep = action === 'sleep';
        const isWalk = action === 'walk' || action === 'eat';
        const isRun = action === 'run' || action === 'jump';
        const isDance = action === 'dance';

        if (isSleep) {
            tgGrpY = -0.3; // Lowered back down since Stage is removed
            tgBodyRotX = 0;
            tgAbdomenRotX = 0.3; // Curl abdomen in
            tgHeadPosY = 0.15; tgHeadPosZ = 0.45; tgHeadRotX = -0.15;

            // Ear droop
            tgEarLRotZ = -0.4; tgEarRRotZ = 0.4;

            // Fold legs tightly
            tgFlRotX = -1.5; tgFrRotX = -1.5;
            tgFlKneeX = 1.5; tgFrKneeX = 1.5;
            tgBlRotX = 1.6; tgBrRotX = 1.6;
            tgBlKneeX = -1.8; tgBrKneeX = -1.8;
            tgBlPosY = 0.15; tgBrPosY = 0.15;

            // Wrap tail around
            tgTailRotX = 0.4; tgTailRotY = Math.PI / 2.5;

            // Deep slow breathing
            const breath = Math.sin(t * 1.5);
            bodyRef.current.scale.set(1 + breath * 0.015, 1 + breath * 0.03, 1 + breath * 0.015);

        } else if (isSit) {
            tgBodyRotX = -0.3; // pitch chest up
            tgAbdomenRotX = 0.4; // tuck abdomen down
            tgBodyPosY = 0.35;
            tgHeadPosY = 0.75; tgHeadPosZ = 0.15;

            // Front legs straight to hold chest up
            tgFlRotX = 0.2; tgFrRotX = 0.2;
            tgFlKneeX = 0; tgFrKneeX = 0;

            // Back legs folded sitting
            tgBlRotX = 1.2; tgBlPosY = 0.15; tgBlPosX = -0.18; tgBlPosZ = -0.15; tgBlKneeX = -1.5;
            tgBrRotX = 1.2; tgBrPosY = 0.15; tgBrPosX = 0.18; tgBrPosZ = -0.15; tgBrKneeX = -1.5;

            // Gentle tail wag on floor
            tgTailRotX = 0.6; tgTailRotY = Math.sin(t * 3) * 0.1;
            tgHeadRotY = Math.sin(t * 1.5) * 0.1; // Gentle look around

        } else if (isWalk) {
            tgBodyPosY = 0.4 + Math.abs(Math.sin(t * 8)) * 0.04;
            tgBodyRotX = Math.sin(t * 4) * 0.04; // small tilt

            tgHeadPosY = 0.65 + Math.abs(Math.sin(t * 8)) * 0.03;
            tgHeadRotY = Math.sin(t * 4) * 0.08;
            tgHeadRotX = action === 'eat' ? Math.abs(Math.sin(t * 10)) * 0.6 : Math.sin(t * 8) * 0.05;

            tgTailRotY = Math.sin(t * 4) * 0.2;
            tgTailRotX = Math.sin(t * 8) * 0.1;

            // Ear bounce
            tgEarLRotZ = Math.sin(t * 8) * 0.1;
            tgEarRRotZ = -Math.sin(t * 8) * 0.1;

            // Alternating legs (Inverse Kinematics feel)
            tgFlRotX = Math.sin(t * 8) * 0.5; tgFlKneeX = tgFlRotX > 0 ? -tgFlRotX * 0.8 : 0;
            tgBrRotX = Math.sin(t * 8) * 0.5; tgBrKneeX = tgBrRotX > 0 ? -tgBrRotX * 0.5 + 0.3 : 0.3;
            tgFrRotX = -Math.sin(t * 8) * 0.5; tgFrKneeX = tgFrRotX > 0 ? -tgFrRotX * 0.8 : 0;
            tgBlRotX = -Math.sin(t * 8) * 0.5; tgBlKneeX = tgBlRotX > 0 ? -tgBlRotX * 0.5 + 0.3 : 0.3;

        } else if (isRun) {
            tgGrpY = Math.abs(Math.sin(t * 12)) * 0.2;
            tgBodyRotX = Math.sin(t * 12) * 0.15;
            tgAbdomenRotX = -Math.sin(t * 12) * 0.2; // Spine crunch
            tgHeadRotX = -Math.sin(t * 12) * 0.2;

            tgTailRotX = -0.2 + Math.cos(t * 12) * 0.2;

            // Ears flat
            tgEarLRotX = 0.3; tgEarRRotX = 0.3;

            // Front bounding, Back bounding
            tgFlRotX = Math.cos(t * 12) * 0.7 + 0.2; tgFlKneeX = tgFlRotX > 0 ? -0.5 : 0;
            tgFrRotX = Math.cos(t * 12) * 0.7 + 0.2; tgFrKneeX = tgFrRotX > 0 ? -0.5 : 0;
            tgBlRotX = -Math.cos(t * 12) * 0.7 - 0.1; tgBlKneeX = tgBlRotX > 0 ? -0.6 : 0.4;
            tgBrRotX = -Math.cos(t * 12) * 0.7 - 0.1; tgBrKneeX = tgBrRotX > 0 ? -0.6 : 0.4;

        } else if (isDance) {
            tgGrpY = Math.abs(Math.sin(t * 10)) * 0.15;
            tgBodyRotX = -0.2;
            tgGrpRotY = Math.sin(t * 5) * 0.5;
            tgHeadRotZ = Math.sin(t * 10) * 0.2;
            tgTailRotY = Math.cos(t * 5) * 0.6;

            // Tapping
            tgFlPosY = 0.2 + Math.abs(Math.sin(t * 10)) * 0.15;
            tgFrPosY = 0.2 + Math.abs(Math.cos(t * 10)) * 0.15;

            tgEarLRotY = Math.sin(t * 10) * 0.4;
            tgEarRRotY = Math.cos(t * 10) * 0.4;

        } else {
            // ----- Natural IDLE State -----
            tgBodyPosY = 0.4 + Math.sin(t * 2) * 0.01; // soft breathing

            // Occasional look around
            tgHeadRotY = Math.sin(t * 0.5) * 0.15;
            tgHeadRotX = Math.cos(t * 0.8) * 0.05;

            // Tail sway
            tgTailRotY = Math.sin(t * 1.5) * 0.15;
            tgTailRotZ = Math.cos(t * 2) * 0.05;

            // Ear twitches (randomly using sine combos)
            const twitch = Math.sin(t * 25) * Math.cos(t * 13);
            tgEarLRotZ = twitch > 0.8 ? twitch * 0.2 : 0;
            tgEarRRotZ = twitch < -0.8 ? twitch * 0.2 : 0;
        }

        // Apply scale softly if not sleeping
        if (!isSleep) bodyRef.current.scale.set(1, 1, 1);

        // --- SMOOTH LERPING APPLY ---
        const lerpSpeed = 0.08; // smooth transition speed
        const lerpRot = (ref, x, y, z) => {
            if (!ref.current) return;
            ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, x, lerpSpeed);
            ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, y, lerpSpeed);
            ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, z, lerpSpeed);
        };
        const lerpPos = (ref, x, y, z) => {
            if (!ref.current) return;
            ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, x, lerpSpeed);
            ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, y, lerpSpeed);
            ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, z, lerpSpeed);
        };

        lerpPos(groupRef, 0, tgGrpY, 0);
        lerpRot(groupRef, 0, tgGrpRotY, 0);
        lerpPos(bodyRef, 0, tgBodyPosY, 0);
        lerpRot(bodyRef, tgBodyRotX, 0, 0);
        lerpPos(headRef, 0, tgHeadPosY, tgHeadPosZ);
        lerpRot(headRef, tgHeadRotX, tgHeadRotY, tgHeadRotZ);
        lerpRot(tailGroupRef, tgTailRotX, tgTailRotY, tgTailRotZ);

        lerpRot(earRRef, tgEarRRotX, tgEarRRotY, tgEarRRotZ);

        lerpRot(flRef, tgFlRotX, 0, 0); lerpPos(flRef, -0.12, tgFlPosY, 0.25);
        if (flRef.current && flRef.current.children[1]) flRef.current.children[1].rotation.x = THREE.MathUtils.lerp(flRef.current.children[1].rotation.x, tgFlKneeX, lerpSpeed);

        lerpRot(frRef, tgFrRotX, 0, 0); lerpPos(frRef, 0.12, tgFrPosY, 0.25);
        if (frRef.current && frRef.current.children[1]) frRef.current.children[1].rotation.x = THREE.MathUtils.lerp(frRef.current.children[1].rotation.x, tgFrKneeX, lerpSpeed);

        lerpRot(blRef, tgBlRotX, 0, 0); lerpPos(blRef, tgBlPosX, tgBlPosY, tgBlPosZ);
        if (blRef.current && blRef.current.children[1]) blRef.current.children[1].rotation.x = THREE.MathUtils.lerp(blRef.current.children[1].rotation.x, tgBlKneeX, lerpSpeed);

        lerpRot(brRef, tgBrRotX, 0, 0); lerpPos(brRef, tgBrPosX, tgBrPosY, tgBrPosZ);
        if (brRef.current && brRef.current.children[1]) brRef.current.children[1].rotation.x = THREE.MathUtils.lerp(brRef.current.children[1].rotation.x, tgBrKneeX, lerpSpeed);

        // Abdomen bend
        if (bodyRef.current && bodyRef.current.children[1]) {
            bodyRef.current.children[1].rotation.x = THREE.MathUtils.lerp(bodyRef.current.children[1].rotation.x, tgAbdomenRotX, lerpSpeed);
        }
    });

    const furMaterial = { color: stage.bodyColor, roughness: 1.0, metalness: 0.0 };
    const accentMaterial = { color: stage.accentColor, roughness: 1.0, metalness: 0.0 };

    return (
        <group ref={groupRef} scale={stage.scale} position={[0, 0, 0]}>

            {/* ===================== BODY (Ribcage & Abdomen) ===================== */}
            <group ref={bodyRef} position={[0, 0.4, 0]}>
                {/* Ribcage / Chest Sphere */}
                <mesh castShadow receiveShadow position={[0, 0.02, 0.15]} scale={[1.1, 1, 1]}>
                    <sphereGeometry args={[0.22, 16, 16]} />
                    <meshStandardMaterial {...furMaterial} />
                </mesh>

                {/* Abdomen / Pelvis Sphere connected dynamically */}
                <group position={[0, 0.02, 0.05]}>
                    <mesh castShadow receiveShadow position={[0, -0.05, -0.22]} scale={[0.9, 0.85, 1.3]}>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshStandardMaterial {...furMaterial} />
                    </mesh>
                    {/* Back Fur marking on Abdomen */}
                    <mesh position={[0, 0.13, -0.2]} scale={[0.8, 0.25, 0.8]}>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshStandardMaterial {...accentMaterial} />
                    </mesh>
                </group>
            </group>

            {/* Fluffy Chest (Layered Spheres for softness) */}
            <group position={[0, 0.42, 0.35]}>
                <mesh castShadow receiveShadow position={[0, 0, 0]} rotation={[-0.2, 0, 0]} scale={[1.1, 1, 0.9]}>
                    <sphereGeometry args={[0.23, 16, 16]} />
                    <meshStandardMaterial {...accentMaterial} />
                </mesh>
                <mesh castShadow receiveShadow position={[0, -0.05, 0.1]} scale={[0.8, 0.8, 0.6]}>
                    <sphereGeometry args={[0.18, 16, 16]} />
                    <meshStandardMaterial {...accentMaterial} />
                </mesh>
                {/* Side pointy tufts (Chest Ruff Wings) */}
                <mesh castShadow position={[-0.18, 0, 0]} rotation={[0, 0, 0.8]} scale={[1, 2, 1]}>
                    <coneGeometry args={[0.09, 0.22, 16]} />
                    <meshStandardMaterial {...accentMaterial} />
                </mesh>
                <mesh castShadow position={[0.18, 0, 0]} rotation={[0, 0, -0.8]} scale={[1, 2, 1]}>
                    <coneGeometry args={[0.09, 0.22, 16]} />
                    <meshStandardMaterial {...accentMaterial} />
                </mesh>
            </group>

            {/* ===================== LEGS (Multi-Joint Inverse Kinematics Layout) ===================== */}
            <group position={[0, 0, 0]}>
                {/* Front Left */}
                <group ref={flRef} position={[-0.12, 0.25, 0.25]}>
                    {/* Thigh */}
                    <mesh castShadow position={[0, -0.08, 0]}>
                        <capsuleGeometry args={[0.045, 0.15, 8, 8]} />
                        <meshStandardMaterial {...furMaterial} />
                    </mesh>
                    {/* Knee joint */}
                    <group position={[0, -0.16, 0]}>
                        <mesh><sphereGeometry args={[0.045, 8, 8]} /><meshStandardMaterial {...furMaterial} /></mesh>
                        {/* Calf */}
                        <mesh castShadow position={[0, -0.07, 0]} rotation={[0, 0, 0]}>
                            <capsuleGeometry args={[0.035, 0.12, 8, 8]} />
                            <meshStandardMaterial {...furMaterial} />
                        </mesh>
                        {/* Paw */}
                        <mesh castShadow position={[0, -0.15, 0.02]} scale={[1, 0.7, 1.2]}>
                            <sphereGeometry args={[0.05, 16, 16]} />
                            <meshStandardMaterial color="#111" />
                        </mesh>
                    </group>
                </group>

                {/* Front Right */}
                <group ref={frRef} position={[0.12, 0.25, 0.25]}>
                    <mesh castShadow position={[0, -0.08, 0]}>
                        <capsuleGeometry args={[0.045, 0.15, 8, 8]} />
                        <meshStandardMaterial {...furMaterial} />
                    </mesh>
                    <group position={[0, -0.16, 0]}>
                        <mesh><sphereGeometry args={[0.045, 8, 8]} /><meshStandardMaterial {...furMaterial} /></mesh>
                        <mesh castShadow position={[0, -0.07, 0]} rotation={[0, 0, 0]}>
                            <capsuleGeometry args={[0.035, 0.12, 8, 8]} />
                            <meshStandardMaterial {...furMaterial} />
                        </mesh>
                        <mesh castShadow position={[0, -0.15, 0.02]} scale={[1, 0.7, 1.2]}>
                            <sphereGeometry args={[0.05, 16, 16]} />
                            <meshStandardMaterial color="#111" />
                        </mesh>
                    </group>
                </group>

                {/* Back Left (Muscular Fox Haunches) */}
                <group ref={blRef} position={[-0.15, 0.25, -0.25]}>
                    {/* Big Haunch / Thigh */}
                    <mesh castShadow position={[-0.03, -0.02, 0]} rotation={[0.4, 0, 0]} scale={[1, 1.4, 1.1]}>
                        <sphereGeometry args={[0.11, 16, 16]} />
                        <meshStandardMaterial {...furMaterial} />
                    </mesh>
                    {/* Knee Joint */}
                    <group position={[0, -0.14, 0.05]}>
                        <mesh><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial {...furMaterial} /></mesh>
                        {/* Elongated Calf */}
                        <mesh castShadow position={[0, -0.08, -0.05]} rotation={[-0.2, 0, 0]}>
                            <capsuleGeometry args={[0.04, 0.18, 8, 8]} />
                            <meshStandardMaterial {...furMaterial} />
                        </mesh>
                        {/* Paw */}
                        <mesh castShadow position={[0, -0.18, -0.01]} scale={[1, 0.7, 1.2]}>
                            <sphereGeometry args={[0.055, 16, 16]} />
                            <meshStandardMaterial color="#111" />
                        </mesh>
                    </group>
                </group>

                {/* Back Right */}
                <group ref={brRef} position={[0.15, 0.25, -0.25]}>
                    <mesh castShadow position={[0.03, -0.02, 0]} rotation={[0.4, 0, 0]} scale={[1, 1.4, 1.1]}>
                        <sphereGeometry args={[0.11, 16, 16]} />
                        <meshStandardMaterial {...furMaterial} />
                    </mesh>
                    <group position={[0, -0.14, 0.05]}>
                        <mesh><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial {...furMaterial} /></mesh>
                        <mesh castShadow position={[0, -0.08, -0.05]} rotation={[-0.2, 0, 0]}>
                            <capsuleGeometry args={[0.04, 0.18, 8, 8]} />
                            <meshStandardMaterial {...furMaterial} />
                        </mesh>
                        <mesh castShadow position={[0, -0.18, -0.01]} scale={[1, 0.7, 1.2]}>
                            <sphereGeometry args={[0.055, 16, 16]} />
                            <meshStandardMaterial color="#111" />
                        </mesh>
                    </group>
                </group>
            </group>

            {/* ===================== TAILS ===================== */}
            <group ref={tailGroupRef} position={[0, 0.45, -0.35]}>
                {[...Array(stage.tails)].map((_, i) => (
                    <FluffyTail key={i} index={i} totalTails={stage.tails} furMaterial={furMaterial} accentMaterial={accentMaterial} action={action} />
                ))}
            </group>

            {/* ===================== HEAD ===================== */}
            <group ref={headRef}>
                {/* Skull Base */}
                <mesh castShadow receiveShadow position={[0, 0, 0]} scale={[1.2, 0.95, 1.15]}>
                    <sphereGeometry args={[0.26, 32, 32]} />
                    <meshStandardMaterial {...furMaterial} />
                </mesh>

                {/* Fluffy Side Cheeks (Very Kitsune) */}
                <mesh castShadow position={[-0.24, -0.08, 0.04]} rotation={[0, 0, 0.6]} scale={[1, 1.8, 1]}>
                    <coneGeometry args={[0.09, 0.22, 16]} />
                    <meshStandardMaterial {...accentMaterial} />
                </mesh>
                <mesh castShadow position={[0.24, -0.08, 0.04]} rotation={[0, 0, -0.6]} scale={[1, 1.8, 1]}>
                    <coneGeometry args={[0.09, 0.22, 16]} />
                    <meshStandardMaterial {...accentMaterial} />
                </mesh>

                {/* Snout */}
                <group position={[0, -0.1, 0.24]} rotation={[Math.PI / 2 - 0.15, 0, 0]}>
                    <mesh castShadow>
                        {/* Pointy muzzle */}
                        <cylinderGeometry args={[0.05, 0.13, 0.22, 32]} />
                        <meshStandardMaterial {...accentMaterial} />
                    </mesh>
                </group>
                {/* Shiny Wet Nose tip */}
                <mesh castShadow position={[0, -0.12, 0.36]}>
                    <sphereGeometry args={[0.035, 16, 16]} />
                    <meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} />
                </mesh>

                {/* Massive Detailed Fox Ears */}
                <group ref={earLRef} position={[-0.14, 0.18, -0.02]} rotation={[-0.1, 0.3, 0.4]}>
                    {/* Outer Ear */}
                    <mesh castShadow position={[0, 0.2, 0]}>
                        <coneGeometry args={[0.13, 0.5, 16]} />
                        <meshStandardMaterial {...furMaterial} />
                    </mesh>
                    {/* Inner Ear Fluff */}
                    <mesh position={[0, 0.21, 0.03]}>
                        <coneGeometry args={[0.08, 0.45, 16]} />
                        <meshStandardMaterial {...accentMaterial} />
                    </mesh>
                    {/* Ear Back Fluff Tuft */}
                    <mesh position={[-0.05, 0.05, -0.05]} rotation={[0, 0, -0.3]}>
                        <coneGeometry args={[0.06, 0.15, 8]} />
                        <meshStandardMaterial {...accentMaterial} />
                    </mesh>
                </group>
                <group ref={earRRef} position={[0.14, 0.18, -0.02]} rotation={[-0.1, -0.3, -0.4]}>
                    <mesh castShadow position={[0, 0.2, 0]}>
                        <coneGeometry args={[0.13, 0.5, 16]} />
                        <meshStandardMaterial {...furMaterial} />
                    </mesh>
                    <mesh position={[0, 0.21, 0.03]}>
                        <coneGeometry args={[0.08, 0.45, 16]} />
                        <meshStandardMaterial {...accentMaterial} />
                    </mesh>
                    {/* Ear Back Fluff Tuft */}
                    <mesh position={[0.05, 0.05, -0.05]} rotation={[0, 0, 0.3]}>
                        <coneGeometry args={[0.06, 0.15, 8]} />
                        <meshStandardMaterial {...accentMaterial} />
                    </mesh>
                </group>

                {/* Top Head Fluff (between ears) */}
                <group position={[0, 0.26, -0.05]}>
                    <mesh rotation={[0, 0, 0.2]} position={[-0.04, 0, 0]}><coneGeometry args={[0.04, 0.1, 8]} /><meshStandardMaterial {...accentMaterial} /></mesh>
                    <mesh rotation={[0, 0, -0.2]} position={[0.04, 0, 0]}><coneGeometry args={[0.04, 0.1, 8]} /><meshStandardMaterial {...accentMaterial} /></mesh>
                </group>

                {/* Dragon Horns (Level 50+) */}
                {stage.horns && (
                    <group>
                        <mesh castShadow position={[-0.12, 0.35, -0.15]} rotation={[-0.4, 0.2, -0.4]}>
                            <cylinderGeometry args={[0.015, 0.05, 0.5]} />
                            <meshStandardMaterial color={stage.accentColor} roughness={0.3} metalness={0.6} />
                        </mesh>
                        <mesh castShadow position={[0.12, 0.35, -0.15]} rotation={[-0.4, -0.2, 0.4]}>
                            <cylinderGeometry args={[0.015, 0.05, 0.5]} />
                            <meshStandardMaterial color={stage.accentColor} roughness={0.3} metalness={0.6} />
                        </mesh>
                    </group>
                )}

                {/* ===================== FACE EXPRESSIONS (With blinking wrapper) ===================== */}
                <group ref={faceRef} position={[0, 0.05, 0.25]}>
                    <group ref={eyeBlinkRef}>
                        {/* EYES */}
                        {face.eyes === 'closed' && (
                            <>
                                <mesh position={[-0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.015, 0.015, 0.1]} /><meshBasicMaterial color="#111" /></mesh>
                                <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.015, 0.015, 0.1]} /><meshBasicMaterial color="#111" /></mesh>
                            </>
                        )}
                        {face.eyes === 'sad' && (
                            <>
                                <mesh position={[-0.15, 0, 0]} rotation={[0, 0, 0.3]}><cylinderGeometry args={[0.015, 0.015, 0.1]} /><meshBasicMaterial color="#111" /></mesh>
                                <mesh position={[0.15, 0, 0]} rotation={[0, 0, -0.3]}><cylinderGeometry args={[0.015, 0.015, 0.1]} /><meshBasicMaterial color="#111" /></mesh>
                                <mesh position={[-0.15, -0.05, 0.02]}><sphereGeometry args={[0.02, 8, 8]} /><meshBasicMaterial color="#3b82f6" /></mesh>
                            </>
                        )}
                        {face.eyes === 'happy' && (
                            <>
                                <mesh position={[-0.15, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.04, 0.015, 8, 16, Math.PI]} /><meshBasicMaterial color="#111" /></mesh>
                                <mesh position={[0.15, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.04, 0.015, 8, 16, Math.PI]} /><meshBasicMaterial color="#111" /></mesh>
                            </>
                        )}
                        {face.eyes === 'wide' && (
                            <>
                                <mesh position={[-0.15, 0, 0]}><sphereGeometry args={[0.06, 16, 16]} /><meshBasicMaterial color="#111" /></mesh>
                                <mesh position={[0.15, 0, 0]}><sphereGeometry args={[0.06, 16, 16]} /><meshBasicMaterial color="#111" /></mesh>
                                {/* Catchlights */}
                                <mesh position={[-0.13, 0.02, 0.05]}><sphereGeometry args={[0.02, 8, 8]} /><meshBasicMaterial color="#fff" /></mesh>
                                <mesh position={[0.17, 0.02, 0.05]}><sphereGeometry args={[0.02, 8, 8]} /><meshBasicMaterial color="#fff" /></mesh>
                            </>
                        )}
                        {face.eyes === 'star' && (
                            <>
                                <group position={[-0.15, 0, 0]}>
                                    <mesh rotation={[0, 0, Math.PI / 4]}><cylinderGeometry args={[0.015, 0.015, 0.12]} /><meshBasicMaterial color="#111" /></mesh>
                                    <mesh rotation={[0, 0, -Math.PI / 4]}><cylinderGeometry args={[0.015, 0.015, 0.12]} /><meshBasicMaterial color="#111" /></mesh>
                                </group>
                                <group position={[0.15, 0, 0]}>
                                    <mesh rotation={[0, 0, Math.PI / 4]}><cylinderGeometry args={[0.015, 0.015, 0.12]} /><meshBasicMaterial color="#111" /></mesh>
                                    <mesh rotation={[0, 0, -Math.PI / 4]}><cylinderGeometry args={[0.015, 0.015, 0.12]} /><meshBasicMaterial color="#111" /></mesh>
                                </group>
                            </>
                        )}
                        {/* High-fidelity Normal Eyes (Puppy dog eyes) */}
                        {face.eyes === 'normal' && (
                            <>
                                {/* Left Eye Dark */}
                                <mesh position={[-0.15, 0, 0]} scale={[1, 1.2, 1]}>
                                    <sphereGeometry args={[0.045, 16, 16]} />
                                    <meshStandardMaterial color="#000" roughness={0.2} metalness={0.8} />
                                </mesh>
                                {/* Right Eye Dark */}
                                <mesh position={[0.15, 0, 0]} scale={[1, 1.2, 1]}>
                                    <sphereGeometry args={[0.045, 16, 16]} />
                                    <meshStandardMaterial color="#000" roughness={0.2} metalness={0.8} />
                                </mesh>
                                {/* Left Catchlight Main */}
                                <mesh position={[-0.13, 0.02, 0.04]}>
                                    <sphereGeometry args={[0.015, 8, 8]} />
                                    <meshBasicMaterial color="#fff" />
                                </mesh>
                                {/* Right Catchlight Main */}
                                <mesh position={[0.17, 0.02, 0.04]}>
                                    <sphereGeometry args={[0.015, 8, 8]} />
                                    <meshBasicMaterial color="#fff" />
                                </mesh>
                                {/* Second subtle catchlight */}
                                <mesh position={[-0.165, -0.015, 0.04]}>
                                    <sphereGeometry args={[0.007, 8, 8]} />
                                    <meshBasicMaterial color="#fff" opacity={0.6} transparent />
                                </mesh>
                                <mesh position={[0.135, -0.015, 0.04]}>
                                    <sphereGeometry args={[0.007, 8, 8]} />
                                    <meshBasicMaterial color="#fff" opacity={0.6} transparent />
                                </mesh>
                            </>
                        )}
                    </group>

                    {/* LOW MOUTH */}
                    <group position={[0, -0.15, 0]}>
                        {face.mouth === 'neutral' && <mesh position={[0, 0, 0.06]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.01, 0.01, 0.05]} /><meshBasicMaterial color="#111" /></mesh>}
                        {face.mouth === 'smile' && <mesh position={[0, 0.02, 0.06]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.04, 0.012, 8, 16, Math.PI]} /><meshBasicMaterial color="#111" /></mesh>}
                        {face.mouth === 'sad' && <mesh position={[0, -0.02, 0.06]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.03, 0.01, 8, 16, Math.PI]} /><meshBasicMaterial color="#111" /></mesh>}
                        {face.mouth === 'open' && <mesh position={[0, -0.02, 0.07]}><sphereGeometry args={[0.04, 16, 16]} /><meshBasicMaterial color="#ef4444" /></mesh>}
                        {face.mouth === 'sleep' && <mesh position={[0, 0, 0.06]}><sphereGeometry args={[0.02, 16, 16]} /><meshBasicMaterial color="#111" /></mesh>}
                    </group>
                </group>
            </group>

            {/* HALO */}
            {stage.halo && (
                <mesh position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.3, 0.02, 16, 32]} />
                    <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
                </mesh>
            )}

            {/* Stage Magic Aura Particles */}
            {stage.minLevel >= 5 && (
                <Sparkles count={stage.minLevel * 2} scale={2.5} size={4} color={stage.bodyColor} speed={0.4} />
            )}
            {stage.minLevel >= 20 && (
                <Sparkles count={40} scale={3} size={6} color={stage.accentColor} speed={0.8} />
            )}
        </group>
    );
};


// ==================== MAIN PET COMPANION COMPONENT ====================
const PetCompanion = ({ petLevel = 0, streak = 0, petXP = 0, xpPercent = 0, xpProgress = 0, xpNeeded = 100, onInteract }) => {
    const [debugLevel, setDebugLevel] = useState(petLevel);

    // Sync external props explicitly if they change outside debug mode
    useEffect(() => { setDebugLevel(petLevel); }, [petLevel]);

    const petStage = useMemo(() => getPetStage(debugLevel), [debugLevel]);
    const [currentAction, setCurrentAction] = useState('idle');
    const [interactFeedback, setInteractFeedback] = useState(null);
    const actionTimeoutRef = useRef(null);

    // Choose weighted random action based on streak
    const chooseAction = () => {
        let weights;
        if (streak === 0) weights = { idle: 10, sit: 10, sleep: 50, walk: 5 };
        else if (streak >= 7) weights = { idle: 5, walk: 15, run: 25, jump: 20, dance: 30, eat: 10 };
        else if (streak >= 3) weights = { idle: 15, walk: 25, jump: 15, dance: 10, sit: 10, run: 10, eat: 15 };
        else weights = { idle: 30, walk: 30, sit: 15, jump: 5, eat: 10, sleep: 10 };

        const all = Object.entries(weights);
        const total = all.reduce((sum, [, w]) => sum + w, 0);
        let r = Math.random() * total;
        for (const [action, weight] of all) {
            r -= weight;
            if (r <= 0) return action;
        }
        return 'idle';
    };

    // Autonomous loop
    useEffect(() => {
        const doNextAction = () => {
            const action = chooseAction();
            setCurrentAction(action);
            const duration = ACTION_DURATIONS[action] || 3500;
            actionTimeoutRef.current = setTimeout(doNextAction, duration + Math.random() * 2000);
        };
        doNextAction();
        return () => { if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current); };
    }, [streak]);

    // Click handler
    const handlePetClick = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.35);
                osc.connect(gain).connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.1);
                osc.stop(ctx.currentTime + i * 0.1 + 0.4);
            });
        } catch (e) { }

        setCurrentAction('dance');
        setInteractFeedback('+❤️');
        setTimeout(() => setInteractFeedback(null), 1500);
        if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
        actionTimeoutRef.current = setTimeout(() => setCurrentAction('idle'), 2800);
        if (onInteract) onInteract();
    };

    return (
        <div className="relative w-full" style={{ minHeight: 330 }}>
            {/* 3D Canvas Habitat */}
            <div className={`w-full rounded-2xl overflow-hidden relative cursor-pointer bg-gradient-to-b ${petStage.bg}`}
                style={{ height: 300, boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)' }}
                onClick={handlePetClick}
            >
                <Canvas camera={{ position: [2, 1, 3], fov: 40 }} shadows>
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
                    <pointLight position={[-3, 3, -3]} color={petStage.accentColor} intensity={0.8} />

                    <Environment preset="night" />
                    <Stars radius={50} depth={50} count={300} factor={4} saturation={0} fade speed={1} />

                    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                        {petStage.isEgg ? (
                            <EggModel color={petStage.bodyColor} />
                        ) : (
                            <ProceduralPetModel action={currentAction} stage={petStage} streak={streak} />
                        )}

                        {/* 3D Feedback Text */}
                        {interactFeedback && (
                            <Billboard position={[0, 1.2, 0]}>
                                <Text fontSize={0.3} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="black">
                                    {interactFeedback}
                                </Text>
                            </Billboard>
                        )}
                        {currentAction === 'sleep' && !petStage.isEgg && (
                            <Billboard position={[0.5, 0.8, 0]}>
                                <Text fontSize={0.2} color="white" anchorX="center" anchorY="middle" opacity={0.7} transparent>
                                    zZz
                                </Text>
                            </Billboard>
                        )}
                    </Float>

                    {/* Ground Shadow Platform */}
                    <ContactShadows position={[0, -0.6, 0]} opacity={0.6} scale={5} blur={2} far={2} />

                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        minPolarAngle={Math.PI / 3}
                        maxPolarAngle={Math.PI / 2.2}
                        autoRotate={currentAction === 'idle'}
                        autoRotateSpeed={0.5}
                    />
                </Canvas>

                {/* Subtitle Label (HTML overlay) */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/50 backdrop-blur-sm px-3 py-1 rounded-full bg-black/30 pointer-events-none uppercase tracking-widest border border-white/10">
                    {currentAction === 'walk' && 'Đang đi dạo'}{currentAction === 'run' && 'Chạy nhanh'}{currentAction === 'jump' && 'Nhảy'}{currentAction === 'sit' && 'Ngồi nghỉ'}{currentAction === 'sleep' && 'Đang ngủ'}{currentAction === 'dance' && 'Tiến hóa & Nhảy múa'}{currentAction === 'eat' && 'Đang ăn'}{currentAction === 'idle' && 'Thư giãn'}
                </div>
            </div>

            {/* Info UI & Admin Control */}
            <div className="flex items-center justify-between mt-3 px-2">
                <div className="flex items-center gap-2">
                    <button onClick={() => setDebugLevel(Math.max(0, debugLevel - 1))} className="text-gray-400 hover:text-indigo-500 font-bold active:scale-90 transition-transform px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">◀</button>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{petStage.name}</span>
                            <span className="text-[8px] bg-red-500/20 text-red-500 px-1 py-0.5 rounded uppercase font-bold">Admin Test</span>
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
                    style={{
                        width: `${xpPercent}%`,
                        background: `linear-gradient(90deg, ${petStage.bodyColor}, ${petStage.accentColor})`,
                        boxShadow: `0 0 10px ${petStage.bodyColor}80`
                    }} />
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
