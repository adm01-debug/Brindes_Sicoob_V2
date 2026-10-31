import { motion } from 'framer-motion';
import { Volume2, Mic, Loader2, Sparkles } from 'lucide-react';
import type { VoiceAgentPhase } from '@/hooks/useVoiceAgent';
import { usePhaseColors, type PhaseColors } from './usePhaseColors';
import { FlowingWaveRing, ParticleField, LightRays } from './VoiceVisualEffects';

function getCoreAnimation(phase: VoiceAgentPhase | 'booting', active: boolean) {
  if (active) return { scale: [1, 1.18, 0.86, 1.12, 1] };
  if (phase === 'processing' || phase === 'booting') {
    return { scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] };
  }
  return { scale: [1, 1.06, 1] };
}

function ListeningIcon() {
  return (
    <motion.div
      className="absolute flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.3, rotate: -30 }}
      animate={{ opacity: 1, scale: [1, 1.15, 1], rotate: 0 }}
      transition={{
        scale: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration: 0.25 },
        rotate: { duration: 0.35 },
      }}
    >
      <Mic className="h-6 w-6 text-white drop-shadow-lg" />
    </motion.div>
  );
}

function SpeakingIcon() {
  return (
    <motion.div
      className="absolute flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: [1, 1.1, 1] }}
      transition={{
        scale: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
        type: 'spring',
        damping: 12,
        stiffness: 200,
      }}
    >
      <Volume2 className="h-6 w-6 text-white drop-shadow-lg" />
    </motion.div>
  );
}

function ProcessingIcon() {
  return (
    <motion.div
      className="absolute flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, rotate: 360 }}
      transition={{
        rotate: { duration: 1.2, repeat: Infinity, ease: 'linear' },
        opacity: { duration: 0.25 },
      }}
    >
      <Loader2 className="h-6 w-6 text-white/80 drop-shadow-lg" />
    </motion.div>
  );
}

function IdleIcon() {
  return (
    <motion.div
      className="absolute flex items-center justify-center"
      animate={{ opacity: [0.45, 0.95, 0.45], scale: [0.88, 1.08, 0.88] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Sparkles className="h-5 w-5 text-white/70 drop-shadow-lg" />
    </motion.div>
  );
}

function PhaseIcon({ phase }: { phase: VoiceAgentPhase | 'booting' }) {
  if (phase === 'listening') {
    return <ListeningIcon />;
  }
  if (phase === 'speaking') {
    return <SpeakingIcon />;
  }
  if (phase === 'processing') {
    return <ProcessingIcon />;
  }
  return <IdleIcon />;
}

function VoiceField({ colors, active }: { colors: PhaseColors; active: boolean }) {
  const rayCount = active ? 22 : 16;
  const particleCount = active ? 45 : 24;
  return (
    <>
      <FlowingWaveRing
        radius={100}
        color={colors.primary}
        speed={8}
        amplitude={9}
        waves={4}
        opacity={0.55}
        strokeWidth={1.8}
      />
      <FlowingWaveRing
        radius={84}
        color={colors.secondary}
        speed={12}
        amplitude={6}
        waves={3}
        opacity={0.35}
        strokeWidth={1.3}
        reverse
      />
      <FlowingWaveRing
        radius={70}
        color={colors.accent}
        speed={16}
        amplitude={4}
        waves={2}
        opacity={0.25}
        strokeWidth={0.9}
      />
      <LightRays
        color1={colors.primary}
        color2={colors.secondary}
        count={rayCount}
        isActive={active}
      />
      <ParticleField
        colors={colors.particles}
        count={particleCount}
        radius={98}
        isActive={active}
      />
    </>
  );
}

function AmbientGlows({
  colors,
  active,
  size,
}: {
  colors: PhaseColors;
  active: boolean;
  size: number;
}) {
  return (
    <>
      <PrimaryGlow colors={colors} size={size} active={active} />
      <SecondaryGlow colors={colors} size={size} />
      <ConicGlow colors={colors} size={size} />
    </>
  );
}

interface GlowProps {
  colors: PhaseColors;
  size: number;
}

function PrimaryGlow({ colors, size, active }: GlowProps & { active: boolean }) {
  const animation = active
    ? { scale: [1, 1.35, 0.88, 1.22, 1], opacity: [0.3, 0.85, 0.3] }
    : { scale: [1, 1.15, 1], opacity: [0.18, 0.38, 0.18] };
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size + 140,
        height: size + 140,
        background: `radial-gradient(circle, ${colors.glow1} 0%, ${colors.glow2} 25%, transparent 60%)`,
        filter: 'blur(35px)',
      }}
      animate={animation}
      transition={{ duration: active ? 1.1 : 4, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function SecondaryGlow({ colors, size }: GlowProps) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size + 90,
        height: size + 90,
        background: `radial-gradient(circle, ${colors.glow2} 0%, transparent 55%)`,
        filter: 'blur(45px)',
      }}
      animate={{ scale: [1.1, 0.88, 1.1], opacity: [0.12, 0.28, 0.12], rotate: [0, 180, 360] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
    />
  );
}

function ConicGlow({ colors, size }: GlowProps) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size + 50,
        height: size + 50,
        background: `conic-gradient(from 0deg, ${colors.primary}22, ${colors.secondary}33, ${colors.accent}22, ${colors.primary}11)`,
        filter: 'blur(20px)',
      }}
      animate={{ rotate: [0, 360], opacity: [0.2, 0.45, 0.2] }}
      transition={{
        rotate: { duration: 12, repeat: Infinity, ease: 'linear' },
        opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      }}
    />
  );
}

function OrbCore({
  colors,
  phase,
  active,
}: {
  colors: PhaseColors;
  phase: VoiceAgentPhase | 'booting';
  active: boolean;
}) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 78,
        height: 78,
        background: `radial-gradient(circle at 38% 28%, ${colors.accent}, ${colors.primary} 40%, ${colors.secondary} 85%)`,
        boxShadow: `0 0 35px ${colors.glow1}, 0 0 70px ${colors.glow1}, 0 0 110px ${colors.glow2}, inset 0 0 30px rgba(255,255,255,0.08)`,
      }}
      animate={getCoreAnimation(phase, active)}
      transition={{ duration: active ? 0.65 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function CoreDecorations({ primary }: { primary: string }) {
  return (
    <>
      <motion.div
        className="absolute rounded-full border"
        style={{ width: 94, height: 94, borderColor: `${primary}20` }}
        animate={{ rotate: [0, 360], opacity: [0.15, 0.4, 0.15] }}
        transition={{
          rotate: { duration: 15, repeat: Infinity, ease: 'linear' },
          opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
        }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 38,
          height: 38,
          background:
            'radial-gradient(circle at 40% 28%, rgba(255,255,255,0.45), rgba(255,255,255,0.02) 55%, transparent)',
          marginTop: -4,
          marginLeft: -4,
        }}
        animate={{ opacity: [0.35, 0.9, 0.35], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </>
  );
}

export function VoiceOrb({ phase, isBooting }: { phase: VoiceAgentPhase; isBooting: boolean }) {
  const effectivePhase = isBooting ? 'booting' : phase;
  const colors = usePhaseColors(phase, isBooting);
  const isActive = effectivePhase === 'listening' || effectivePhase === 'speaking';
  const SIZE = 220;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
    >
      <AmbientGlows colors={colors} active={isActive} size={SIZE} />
      <VoiceField colors={colors} active={isActive} />
      <OrbCore colors={colors} phase={effectivePhase} active={isActive} />
      <CoreDecorations primary={colors.primary} />
      <PhaseIcon phase={effectivePhase} />
    </div>
  );
}
