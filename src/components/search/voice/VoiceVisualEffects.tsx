import { useMemo, useId } from 'react';
import { motion } from 'framer-motion';
import type { PhaseColors } from './usePhaseColors';

/* ------------------------------------------------------------------ */
/*  Deterministic pseudo-random — stable across re-renders             */
/* ------------------------------------------------------------------ */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createWavePaths(radius: number, amplitude: number, waves: number) {
  return Array.from({ length: waves }).map((_, waveIndex) => {
    const points: string[] = [];
    const segments = 100;
    for (let index = 0; index <= segments; index++) {
      const angle = (index / segments) * Math.PI * 2;
      const waveOffset =
        Math.sin(angle * (3 + waveIndex) + waveIndex * 1.5) * amplitude * (1 + waveIndex * 0.25);
      const pointRadius = radius - 8 + waveOffset;
      points.push(
        `${radius + pointRadius * Math.cos(angle)},${radius + pointRadius * Math.sin(angle)}`,
      );
    }
    return points.join(' ');
  });
}

/* ------------------------------------------------------------------ */
/*  Flowing Wave Ring — SVG animated wave loops                        */
/* ------------------------------------------------------------------ */
interface FlowingWaveRingProps {
  radius: number;
  color: string;
  speed: number;
  amplitude: number;
  waves: number;
  opacity: number;
  strokeWidth?: number;
  reverse?: boolean;
}

export function FlowingWaveRing({
  radius,
  color,
  speed,
  amplitude,
  waves,
  opacity,
  strokeWidth = 1.5,
  reverse = false,
}: FlowingWaveRingProps) {
  const filterId = useId();

  const paths = useMemo(
    () => createWavePaths(radius, amplitude, waves),
    [radius, amplitude, waves],
  );

  return (
    <motion.div
      className="absolute"
      style={{
        width: radius * 2,
        height: radius * 2,
        left: `calc(50% - ${radius}px)`,
        top: `calc(50% - ${radius}px)`,
      }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
    >
      <WaveSvg
        radius={radius}
        filterId={filterId}
        paths={paths}
        color={color}
        opacity={opacity}
        strokeWidth={strokeWidth}
      />
    </motion.div>
  );
}

function WaveSvg({
  radius,
  filterId,
  paths,
  color,
  opacity,
  strokeWidth,
}: {
  radius: number;
  filterId: string;
  paths: string[];
  color: string;
  opacity: number;
  strokeWidth: number;
}) {
  return (
    <svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
      <defs>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {paths.map((points, w) => (
        <motion.polyline
          key={w}
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          animate={{
            opacity: [opacity * (1 - w * 0.12), opacity * 0.3, opacity * (1 - w * 0.12)],
          }}
          transition={{ duration: 2.5 + w * 0.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Particle Field — sparkling dots orbiting the core                  */
/* ------------------------------------------------------------------ */
export function ParticleField({
  colors,
  count,
  radius,
  isActive,
}: {
  colors: string[];
  count: number;
  radius: number;
  isActive: boolean;
}) {
  const particles = useMemo(() => createParticles(colors, count, radius), [colors, count, radius]);

  return (
    <>
      {particles.map((particle, index) => (
        <Particle key={index} particle={particle} isActive={isActive} />
      ))}
    </>
  );
}

function createParticles(colors: string[], count: number, radius: number) {
  const random = seededRandom(42 + count);
  return Array.from({ length: count }).map((_, index) => ({
    angle: (index / count) * 360 + random() * 25,
    dist: radius * 0.4 + random() * radius * 0.65,
    size: 1 + random() * 3.5,
    color: colors[index % colors.length],
    speed: 1.8 + random() * 3,
    delay: random() * 2.5,
  }));
}

type ParticleData = ReturnType<typeof createParticles>[number];

function Particle({ particle, isActive }: { particle: ParticleData; isActive: boolean }) {
  const radians = (particle.angle * Math.PI) / 180;
  const x = Math.cos(radians) * particle.dist;
  const y = Math.sin(radians) * particle.dist;
  const animate = isActive
    ? {
        opacity: [0.15, 1, 0.15],
        scale: [0.4, 2, 0.4],
        x: [0, Math.cos(radians) * 10, 0],
        y: [0, Math.sin(radians) * 10, 0],
      }
    : { opacity: [0.1, 0.5, 0.1], scale: [0.7, 1.3, 0.7] };
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: particle.size,
        height: particle.size,
        background: particle.color,
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        boxShadow: `0 0 ${particle.size * 4}px ${particle.color}`,
      }}
      animate={animate}
      transition={{
        duration: particle.speed,
        repeat: Infinity,
        delay: particle.delay,
        ease: 'easeInOut',
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Light Rays — radial beams shooting from the core                   */
/* ------------------------------------------------------------------ */
export function LightRays({
  color1,
  color2,
  count,
  isActive,
}: {
  color1: string;
  color2: string;
  count: number;
  isActive: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360;
        const color = i % 2 === 0 ? color1 : color2;
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: 1.5,
              background: `linear-gradient(to top, ${color}, transparent)`,
              left: '50%',
              top: '50%',
              transformOrigin: 'bottom center',
              transform: `rotate(${angle}deg) translateY(-50px)`,
              borderRadius: 2,
            }}
            animate={{
              opacity: isActive ? [0.05, 0.6, 0.05] : [0.03, 0.25, 0.03],
              height: isActive ? [25, 55, 25] : [12, 25, 12],
            }}
            transition={{
              duration: 1.2 + (i % 4) * 0.3,
              repeat: Infinity,
              delay: i * 0.12,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </motion.div>
  );
}

function getSpectrumHeight(
  index: number,
  count: number,
  isActive: boolean,
  isSpeaking: boolean,
): number {
  const center = (count - 1) / 2;
  const distance = Math.abs(index - center) / center;
  if (!isActive) return 10 - distance * 5;
  return isSpeaking ? 22 - distance * 8 : 26 - distance * 12;
}

function getSpectrumColor(index: number, colors: PhaseColors): string {
  const palette = [colors.primary, colors.secondary, colors.accent];
  return palette[index % palette.length] ?? colors.primary;
}

function getSpectrumDuration(isActive: boolean, isSpeaking: boolean, offset: number): number {
  if (!isActive) return 1 + offset * 2;
  return isSpeaking ? 0.55 + offset * 0.5 : 0.35 + offset;
}

/* ------------------------------------------------------------------ */
/*  Spectrum Waveform — brilliant animated bars                        */
/* ------------------------------------------------------------------ */
export function SpectrumWaveform({
  colors,
  isActive,
  isSpeaking,
}: {
  colors: PhaseColors;
  isActive: boolean;
  isSpeaking?: boolean;
}) {
  const barCount = 15;

  // Pre-compute stable random offsets
  const barOffsets = useMemo(() => {
    const rand = seededRandom(777);
    return Array.from({ length: barCount }).map(() => rand() * 0.25);
  }, [barCount]);

  return (
    <div className="flex h-8 items-center justify-center gap-[3px]">
      {Array.from({ length: barCount }).map((_, i) => {
        const speaking = Boolean(isSpeaking);
        const maxH = getSpectrumHeight(i, barCount, isActive, speaking);
        const minH = isSpeaking ? 5 : 3;
        const color = getSpectrumColor(i, colors);
        const offset = barOffsets[i] ?? 0;

        return (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: isSpeaking ? 3 : 2.5,
              background: `linear-gradient(to top, ${color}, ${colors.accent})`,
              boxShadow: `0 0 ${isSpeaking ? 8 : 6}px ${color}50`,
            }}
            animate={{ height: [minH, maxH, minH] }}
            transition={{
              duration: getSpectrumDuration(isActive, speaking, offset),
              repeat: Infinity,
              delay: isSpeaking ? i * 0.08 : i * 0.05, // Speaking: staggered wave effect
              ease: isSpeaking ? 'easeInOut' : 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
}
