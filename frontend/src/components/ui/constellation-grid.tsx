'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    baseX: number;
    baseY: number;
    radius: number;
    label: string;
    pulse: number;
}

export interface ConstellationGridProps {
    className?: string;
    showOverlay?: boolean;
    transparent?: boolean;
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
}

export default function ConstellationGrid({
    className = '',
    showOverlay = true,
    transparent = false,
    title = 'Constellation',
    subtitle = 'High-velocity dynamic mesh. Sweep your cursor quickly across the grid to unleash kinetic shockwaves.',
    children
}: ConstellationGridProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

    // Sync theme preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        let width = 0;
        let height = 0;

        // Mouse velocity & inertial tracking
        const mouse = {
            x: -1000,
            y: -1000,
            prevX: -1000,
            prevY: -1000,
            vx: 0,
            vy: 0,
            radius: 260,
        };

        let nodes: Node[] = [];

        const handleResize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(dpr, dpr);
            initNodes();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        const initNodes = () => {
            nodes = [];
            const spacing = 52; // Crisp density
            const cols = Math.ceil(width / spacing) + 1;
            const rows = Math.ceil(height / spacing) + 1;

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = i * spacing;
                    const y = j * spacing;
                    nodes.push({
                        x,
                        y,
                        vx: 0,
                        vy: 0,
                        baseX: x,
                        baseY: y,
                        radius: Math.random() * 1.5 + 1.2,
                        label: `${(i * 7).toString(16).toUpperCase()}:${(j * 11).toString(16).toUpperCase()}`,
                        pulse: Math.random() * Math.PI * 2,
                    });
                }
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        let lastTime = performance.now();

        const render = (now: number) => {
            // Normalize dt across high-refresh displays
            const dt = Math.min((now - lastTime) / 1000, 0.05);
            lastTime = now;

            // Mouse velocity calculation
            mouse.vx = (mouse.x - mouse.prevX) / (dt * 1000 || 1);
            mouse.vy = (mouse.y - mouse.prevY) / (dt * 1000 || 1);
            mouse.prevX = mouse.x;
            mouse.prevY = mouse.y;

            const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);

            // Background fill
            if (transparent) {
                ctx.clearRect(0, 0, width, height);
            } else {
                ctx.fillStyle = '#030407'; // Deep Obsidian
                ctx.fillRect(0, 0, width, height);
            }

            const nodeColor = '241, 245, 249'; // Bright Crisp Silver-White
            const accentColor = '56, 189, 248'; // Vivid Sky Cyan

            // Node Physics Engine (Hooke's Law Spring-Mass-Damping system)
            const SPRING_K = 18; // Spring stiffness
            const DAMPING = 0.82; // Velocity resistance

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                n.pulse += dt * 3;

                // Mouse distance vectors
                const dx = mouse.x - n.x;
                const dy = mouse.y - n.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Dynamic shockwave repulsion based on cursor speed
                if (dist < mouse.radius && dist > 0) {
                    const power = (1 - dist / mouse.radius);
                    const force = power * (1800 + speed * 180);
                    const angle = Math.atan2(dy, dx);

                    // Impulse force pushing node away from cursor
                    n.vx -= Math.cos(angle) * force * dt;
                    n.vy -= Math.sin(angle) * force * dt;
                }

                // Calculate restoring force back to home anchor point (baseX, baseY)
                const homeDx = n.baseX - n.x;
                const homeDy = n.baseY - n.y;

                n.vx += homeDx * SPRING_K * dt;
                n.vy += homeDy * SPRING_K * dt;

                // Apply Damping
                n.vx *= DAMPING;
                n.vy *= DAMPING;

                // Integrate position
                n.x += n.vx * dt * 60;
                n.y += n.vy * dt * 60;
            }

            // Draw Connections (Optimized Distance Culling)
            const MAX_CONN_DIST = 82;
            const MAX_CONN_DIST_SQ = MAX_CONN_DIST * MAX_CONN_DIST;

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];

                for (let j = i + 1; j < nodes.length; j++) {
                    const n2 = nodes[j];
                    const ndx = n.x - n2.x;
                    const ndy = n.y - n2.y;
                    const distSq = ndx * ndx + ndy * ndy;

                    if (distSq < MAX_CONN_DIST_SQ) {
                        const nDist = Math.sqrt(distSq);
                        const alpha = (1 - nDist / MAX_CONN_DIST) * 0.38;

                        ctx.strokeStyle = `rgba(${nodeColor}, ${alpha})`;
                        ctx.lineWidth = 0.85;
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.stroke();
                    }
                }
            }

            // Render Node Points & Interactive Highlights
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                const dx = mouse.x - n.x;
                const dy = mouse.y - n.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const isNear = dist < mouse.radius;

                // Node base opacity pulse
                const baseAlpha = isNear ? 1.0 : 0.45 + Math.sin(n.pulse) * 0.2;

                ctx.fillStyle = isNear
                    ? `rgba(${accentColor}, ${baseAlpha})`
                    : `rgba(${nodeColor}, ${baseAlpha})`;

                const currentRadius = isNear
                    ? n.radius * 2.3
                    : n.radius + Math.sin(n.pulse) * 0.35;

                ctx.beginPath();
                ctx.arc(n.x, n.y, Math.max(0.6, currentRadius), 0, Math.PI * 2);
                ctx.fill();

                // High-tech Spatial Radar Rings on active proximity
                if (dist < 110) {
                    const pulseRing = ((n.pulse * 24) % 36) + 4;
                    const ringAlpha = (1 - pulseRing / 40) * 0.6;

                    ctx.strokeStyle = `rgba(${accentColor}, ${ringAlpha})`;
                    ctx.lineWidth = 1.3;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, pulseRing, 0, Math.PI * 2);
                    ctx.stroke();

                    // Hex Coordinate Readout
                    ctx.font = '9px ui-monospace, SFMono-Regular, Consolas, monospace';
                    ctx.fillStyle = `rgba(${accentColor}, 0.95)`;
                    ctx.fillText(n.label, n.x + 10, n.y - 10);
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isDarkMode, transparent]);

    return (
        <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full pointer-events-none" />

            {/* Seamless overlay title (if enabled) */}
            {showOverlay && (
                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-4 pointer-events-none mix-blend-difference text-white py-16">
                    <h1 className="font-mono text-6xl md:text-9xl font-black tracking-tighter uppercase leading-none">
                        {title}
                    </h1>
                    <p className="mt-4 font-mono text-xs md:text-sm max-w-lg opacity-70">
                        {subtitle}
                    </p>
                </div>
            )}

            {/* Injected children layer */}
            {children && (
                <div className="relative z-10">
                    {children}
                </div>
            )}
        </div>
    );
}
