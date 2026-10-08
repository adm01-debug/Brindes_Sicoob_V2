import React, { useRef, useEffect } from "react";
import type { VoiceAgentPhase } from "@/hooks/useVoiceAgent";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
  life: number;
  maxLife: number;
}

interface FloatingParticlesProps {
  phase: VoiceAgentPhase;
  isBooting: boolean;
}

type PhaseConfigKey = VoiceAgentPhase | "booting";
type PhaseConfig = typeof PHASE_CONFIG["idle"];

interface CanvasSize {
  width: number;
  height: number;
}

interface ParticleConnection {
  first: Particle;
  second: Particle;
  firstAlpha: number;
  secondAlpha: number;
}

interface ParticleRenderState {
  particles: Particle[];
  alphas: number[];
}

const PHASE_CONFIG: Record<PhaseConfigKey, { count: number; speed: number; hueRange: [number, number]; sizeRange: [number, number] }> = {
  idle: { count: 20, speed: 0.3, hueRange: [220, 260], sizeRange: [1, 2.5] },
  listening: { count: 40, speed: 0.6, hueRange: [250, 290], sizeRange: [1.5, 3.5] },
  processing: { count: 35, speed: 0.8, hueRange: [270, 310], sizeRange: [1, 3] },
  speaking: { count: 50, speed: 0.5, hueRange: [200, 270], sizeRange: [1.5, 4] },
  error: { count: 25, speed: 0.4, hueRange: [0, 30], sizeRange: [1, 2.5] },
  booting: { count: 15, speed: 0.2, hueRange: [220, 260], sizeRange: [1, 2] },
};

const CONNECTION_DIST = 120;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function createParticle(width: number, height: number, config: PhaseConfig): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = (Math.random() * 0.5 + 0.5) * config.speed;
  return { x: Math.random() * width, y: Math.random() * height, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: lerp(config.sizeRange[0], config.sizeRange[1], Math.random()), opacity: Math.random() * 0.4 + 0.1, hue: lerp(config.hueRange[0], config.hueRange[1], Math.random()), life: 0, maxLife: 200 + Math.random() * 300 };
}

function resizeCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.parentElement?.getBoundingClientRect();
  if (!rect) return;
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function syncParticles(particles: Particle[], count: number, size: CanvasSize, config: PhaseConfig) {
  while (particles.length < count) particles.push(createParticle(size.width, size.height, config));
  if (particles.length > count + 10) particles.splice(count);
}

function particleAlpha(particle: Particle): number {
  const ratio = particle.life / particle.maxLife;
  if (ratio < 0.1) return particle.opacity * ratio / 0.1;
  if (ratio > 0.8) return particle.opacity * (1 - ratio) / 0.2;
  return particle.opacity;
}

function updateParticles(particles: Particle[], width: number, height: number): number[] {
  return particles.map(particle => {
    particle.life++;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx += (Math.random() - 0.5) * 0.02;
    particle.vy += (Math.random() - 0.5) * 0.02;
    if (particle.x < -10) particle.x = width + 10;
    if (particle.x > width + 10) particle.x = -10;
    if (particle.y < -10) particle.y = height + 10;
    if (particle.y > height + 10) particle.y = -10;
    return particleAlpha(particle);
  });
}

function drawConnection(context: CanvasRenderingContext2D, connection: ParticleConnection) {
  const { first, second, firstAlpha, secondAlpha } = connection;
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance >= CONNECTION_DIST) return;
  const lineAlpha = (1 - distance / CONNECTION_DIST) * Math.min(firstAlpha, secondAlpha) * 0.6;
  context.strokeStyle = `hsla(${(first.hue + second.hue) / 2}, 60%, 60%, ${lineAlpha})`;
  context.beginPath();
  context.moveTo(first.x, first.y);
  context.lineTo(second.x, second.y);
  context.stroke();
}

function drawConnections(context: CanvasRenderingContext2D, particles: Particle[], alphas: number[]) {
  context.lineWidth = 0.8;
  particles.forEach((first, index) => particles.slice(index + 1).forEach(second => drawConnection(context, {
    first,
    second,
    firstAlpha: alphas[index] ?? 0,
    secondAlpha: alphas[particles.indexOf(second)] ?? 0,
  })));
}

function drawParticle(context: CanvasRenderingContext2D, particle: Particle, alpha: number) {
  const gradient = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 3);
  gradient.addColorStop(0, `hsla(${particle.hue}, 80%, 70%, ${alpha})`);
  gradient.addColorStop(0.5, `hsla(${particle.hue}, 60%, 50%, ${alpha * 0.3})`);
  gradient.addColorStop(1, `hsla(${particle.hue}, 40%, 30%, 0)`);
  context.beginPath();
  context.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  context.beginPath();
  context.arc(particle.x, particle.y, particle.size * 0.6, 0, Math.PI * 2);
  context.fillStyle = `hsla(${particle.hue}, 90%, 80%, ${alpha * 0.8})`;
  context.fill();
}

function drawParticles(context: CanvasRenderingContext2D, state: ParticleRenderState, size: CanvasSize, config: PhaseConfig) {
  const { particles, alphas } = state;
  particles.forEach((particle, index) => {
    drawParticle(context, particle, alphas[index] ?? 0);
    if (particle.life >= particle.maxLife) particles[index] = createParticle(size.width, size.height, config);
  });
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = React.memo(({ phase, isBooting }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const configKey: PhaseConfigKey = isBooting ? "booting" : phase;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => resizeCanvas(canvas, ctx);
    resize();

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.width / ratio;
      const height = canvas.height / ratio;
      const size = { width, height };
      const config = PHASE_CONFIG[configKey];
      const particles = particlesRef.current;
      ctx.clearRect(0, 0, width, height);
      syncParticles(particles, config.count, size, config);
      const alphas = updateParticles(particles, width, height);
      drawConnections(ctx, particles, alphas);
      drawParticles(ctx, { particles, alphas }, size, config);
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [configKey]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.7 }}
      aria-hidden="true"
    />
  );
});

FloatingParticles.displayName = "FloatingParticles";
