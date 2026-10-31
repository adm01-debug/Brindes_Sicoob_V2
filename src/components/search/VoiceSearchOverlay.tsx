import React, { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { VoiceAgentAction, VoiceAgentPhase } from "@/hooks/useVoiceAgent";
import { usePhaseColors } from "./voice/usePhaseColors";
import {
  playStartSound,
  playStopSound,
  playErrorSound,
  playProcessingSound,
  playSpeakingSound,
} from "@/hooks/voice/feedbackSounds";
import { SpectrumWaveform } from "./voice/VoiceVisualEffects";
import { VoiceOrb } from "./voice/VoiceOrb";
import { FloatingParticles } from "./voice/FloatingParticles";
import { VoiceTranscriptPanel } from "./voice/VoiceTranscriptPanel";
import { VoiceSuggestionsPanel } from "./voice/VoiceSuggestionsPanel";
import type { VoiceHistoryEntry } from "@/hooks/voice/useVoiceHistory";

interface VoiceSearchOverlayProps {
  isOpen: boolean;
  phase: VoiceAgentPhase;
  partialTranscript: string;
  finalTranscript: string;
  agentResponse: string;
  error?: string | null;
  recentCommands?: VoiceHistoryEntry[];
  currentAction?: VoiceAgentAction | null;
  onClose: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking: () => void;
  onCommandSelect?: (command: string) => void;
  onSimulateCommand?: (command: string) => void;
}

const PHASE_META: Record<VoiceAgentPhase, { title: string; subtitle: string; emoji: string }> = {
  idle: { title: "Assistente de Voz", subtitle: "Toque no orbe para começar", emoji: "✨" },
  listening: { title: "Ouvindo…", subtitle: "Diga o que você precisa", emoji: "🎙️" },
  processing: { title: "Processando…", subtitle: "IA interpretando seu comando", emoji: "⚡" },
  speaking: { title: "Respondendo…", subtitle: "Ouvindo a resposta", emoji: "💬" },
  error: { title: "Erro", subtitle: "Toque para tentar novamente", emoji: "⚠️" },
};

function useClosingTransition(isOpen: boolean): boolean {
  const [isClosing, setIsClosing] = useState(false);
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen) { wasOpenRef.current = true; setIsClosing(false); return; }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    setIsClosing(true);
    const timer = setTimeout(() => setIsClosing(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);
  return isClosing;
}

function useAutoListening(isOpen: boolean, phase: VoiceAgentPhase, onStartListening: () => void): boolean {
  const [autoStarting, setAutoStarting] = useState(false);
  const previousPhase = useRef<VoiceAgentPhase>('idle');
  const hasStarted = useRef(false);
  const startRef = useRef(onStartListening);
  useEffect(() => { startRef.current = onStartListening; }, [onStartListening]);
  useEffect(() => {
    if (!isOpen) { hasStarted.current = false; previousPhase.current = 'idle'; setAutoStarting(false); return; }
    if (phase === 'idle' && !hasStarted.current) { hasStarted.current = true; setAutoStarting(true); const timer = window.setTimeout(() => startRef.current(), 120); return () => clearTimeout(timer); }
    if (phase === 'idle' && previousPhase.current === 'speaking') { setAutoStarting(true); previousPhase.current = phase; const timer = window.setTimeout(() => startRef.current(), 800); return () => clearTimeout(timer); }
    if (phase !== 'idle') { setAutoStarting(false); hasStarted.current = true; }
    previousPhase.current = phase;
  }, [isOpen, phase]);
  return autoStarting;
}

function useBootingTimeout(isOpen: boolean, booting: boolean): boolean {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isOpen) { setTimedOut(false); return; }
    if (!booting) { setTimedOut(false); return; }
    const timer = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [isOpen, booting]);
  return timedOut;
}

function buildBorderGlow(primary: string) {
  const match = primary.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  const [hue, saturation, lightness] = match ? [match[1], match[2], match[3]] : ['220', '80', '55'];
  return { border: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.35)`, shadowDim: `0 0 12px 1px hsla(${hue}, ${saturation}%, ${lightness}%, 0.15), 0 0 30px 4px hsla(${hue}, ${saturation}%, ${lightness}%, 0.08), inset 0 0 10px 0px hsla(${hue}, ${saturation}%, ${lightness}%, 0.05)`, shadowBright: `0 0 25px 5px hsla(${hue}, ${saturation}%, ${lightness}%, 0.35), 0 0 60px 10px hsla(${hue}, ${saturation}%, ${lightness}%, 0.15), inset 0 0 18px 0px hsla(${hue}, ${saturation}%, ${lightness}%, 0.1)`, borderDim: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.3)`, borderBright: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)` };
}

function usePhaseFeedback(phase: VoiceAgentPhase, vibrate: (pattern: number | number[]) => void) {
  const previousPhase = useRef(phase);
  useEffect(() => {
    if (phase === previousPhase.current) return;
    if (phase === 'listening') { vibrate(10); playStartSound(); }
    else if (phase === 'processing') playProcessingSound();
    else if (phase === 'speaking') { vibrate([10, 50, 10]); playSpeakingSound(); }
    else if (phase === 'error') { vibrate([30, 80, 30]); playErrorSound(); }
    else if (phase === 'idle' && previousPhase.current === 'listening') playStopSound();
    previousPhase.current = phase;
  }, [phase, vibrate]);
}

function orbLabel(phase: VoiceAgentPhase, booting: boolean): string {
  if (booting) return 'Ativando microfone';
  if (phase === 'listening') return 'Parar de ouvir';
  if (phase === 'processing') return 'Processando comando';
  if (phase === 'speaking') return 'Parar resposta';
  return 'Iniciar microfone';
}

function voiceLabels(meta: typeof PHASE_META[VoiceAgentPhase], booting: boolean, timedOut: boolean) {
  if (!booting) return { title: meta.title, subtitle: meta.subtitle };
  if (timedOut) return { title: 'Microfone indisponível', subtitle: 'Verifique as permissões do navegador' };
  return { title: 'Ativando microfone…', subtitle: 'Preparando sua conversa por voz' };
}

function VoiceWaveform({ phase, booting, colors }: { phase: VoiceAgentPhase; booting: boolean; colors: ReturnType<typeof usePhaseColors> }) {
  const active = ['listening', 'speaking'].includes(phase) || booting;
  if (!active) return null;
  return <motion.div key="spectrum" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><SpectrumWaveform colors={colors} isActive isSpeaking={phase === 'speaking'} /></motion.div>;
}

function VoiceLiveRegion({ phase, booting, finalTranscript, agentResponse, error }: { phase: VoiceAgentPhase; booting: boolean; finalTranscript: string; agentResponse: string; error?: string | null }) {
  let message = '';
  if (booting) message = 'Ativando microfone.';
  else if (phase === 'listening') message = 'Ouvindo. Fale seu comando.';
  else if (phase === 'processing') message = `Processando: ${finalTranscript}`;
  else if (phase === 'speaking') message = `Resposta: ${agentResponse}`;
  else if (phase === 'error') message = `Erro: ${error}`;
  return <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message}</div>;
}

function VoiceDialog({ props, showBooting, bootingTimedOut, colors, borderGlow, onOrbClick, dialogRef }: { props: VoiceSearchOverlayProps; showBooting: boolean; bootingTimedOut: boolean; colors: ReturnType<typeof usePhaseColors>; borderGlow: ReturnType<typeof buildBorderGlow>; onOrbClick: () => void; dialogRef: React.ForwardedRef<HTMLDivElement> }) {
  const { phase, partialTranscript, finalTranscript, agentResponse, error, recentCommands, currentAction, onClose, onCommandSelect, onSimulateCommand } = props;
  const meta = PHASE_META[phase] ?? PHASE_META.idle;
  const labels = voiceLabels(meta, showBooting, bootingTimedOut);
  return <motion.div ref={dialogRef} data-testid="voice-search-dialog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Assistente de Voz"><motion.div className="absolute inset-0 backdrop-blur-xl" animate={{ backgroundColor: ["rgba(2,2,10,0.20)", "rgba(2,2,10,0.65)", "rgba(2,2,10,0.20)"] }} transition={{ duration: 6.6, repeat: Infinity, ease: "easeInOut" }} onClick={onClose} /><FloatingParticles phase={phase} isBooting={showBooting} /><div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none"><motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} transition={{ type: "spring", damping: 25, stiffness: 250 }} className="relative max-w-xs w-full pointer-events-auto"><motion.div className="relative flex flex-col items-center gap-4 w-full px-6 py-7 rounded-3xl max-h-[90vh] overflow-hidden" style={{ background: "rgba(8,8,18,0.95)" }} animate={{ boxShadow: [borderGlow.shadowDim, borderGlow.shadowBright, borderGlow.shadowDim], borderColor: [borderGlow.borderDim, borderGlow.borderBright, borderGlow.borderDim], border: `1.5px solid ${borderGlow.border}` }} transition={{ boxShadow: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }, borderColor: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }, border: { duration: 0.8, ease: "easeInOut" } }}><motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center space-y-1"><h2 className="font-display text-sm font-semibold text-white/70 tracking-wide">{labels.title}</h2><p className="text-white/30 text-[11px] tracking-wider">{labels.subtitle}</p></motion.div><motion.div className="cursor-pointer select-none" onClick={onOrbClick} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} role="button" aria-label={orbLabel(phase, showBooting)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onOrbClick(); }}><VoiceOrb phase={phase} isBooting={showBooting} /></motion.div><AnimatePresence mode="wait"><VoiceWaveform phase={phase} booting={showBooting} colors={colors} /></AnimatePresence><VoiceTranscriptPanel phase={phase} partialTranscript={partialTranscript} finalTranscript={finalTranscript} agentResponse={agentResponse} error={error} currentAction={currentAction} /><VoiceSuggestionsPanel phase={phase} isBooting={showBooting} recentCommands={recentCommands} onCommandSelect={onCommandSelect} onSimulateCommand={onSimulateCommand} onClose={onClose} /></motion.div></motion.div></div><VoiceLiveRegion phase={phase} booting={showBooting} finalTranscript={finalTranscript} agentResponse={agentResponse} error={error} /></motion.div>;
}

export const VoiceSearchOverlay = React.forwardRef<HTMLDivElement, VoiceSearchOverlayProps>(function VoiceSearchOverlay(props, ref) {
  const { isOpen, phase, onClose, onStartListening, onStopListening, onStopSpeaking } = props;
  const isClosing = useClosingTransition(isOpen);
  const isAutoStarting = useAutoListening(isOpen, phase, onStartListening);
  const booting = isAutoStarting && phase === 'idle';
  const bootingTimedOut = useBootingTimeout(isOpen, booting);
  const showBooting = booting || isClosing;
  const colors = usePhaseColors(phase, showBooting);
  const borderGlow = useMemo(() => buildBorderGlow(colors.primary), [colors.primary]);
  const vibrate = useCallback((pattern: number | number[]) => { try { navigator?.vibrate?.(pattern); } catch { /* unsupported */ } }, []);
  const handleOrbClick = useCallback(() => {
    if (showBooting || phase === 'processing') return;
    vibrate(15);
    if (phase === 'listening') onStopListening();
    else if (phase === 'speaking') onStopSpeaking();
    else if (phase === 'idle' || phase === 'error') onStartListening();
  }, [phase, showBooting, vibrate, onStartListening, onStopListening, onStopSpeaking]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') { onClose(); return; }
      const isTyping = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key === ' ' && !isTyping) { event.preventDefault(); handleOrbClick(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleOrbClick, isOpen, onClose]);
  usePhaseFeedback(phase, vibrate);
  return createPortal(<AnimatePresence>{isOpen && <VoiceDialog props={props} showBooting={showBooting} bootingTimedOut={bootingTimedOut} colors={colors} borderGlow={borderGlow} onOrbClick={handleOrbClick} dialogRef={ref} />}</AnimatePresence>, document.body);
});
