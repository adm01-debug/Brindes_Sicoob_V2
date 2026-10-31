/**
 * VoiceTranscriptPanel — exibe transcrição e resposta do agente no painel de voz.
 */
import type { ElementType, ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpDown, Filter, HelpCircle, MicOff, Navigation, Search, Trash2 } from 'lucide-react';
import type { VoiceAgentAction, VoiceAgentPhase } from '@/hooks/useVoiceAgent';

type ActionMetaKey = 'search' | 'filter' | 'navigate' | 'sort' | 'clear' | 'answer';

const ACTION_META: Record<ActionMetaKey, { icon: ElementType; label: string; color: string }> = {
  search: { icon: Search, label: 'Busca', color: 'text-primary' },
  filter: { icon: Filter, label: 'Filtro', color: 'text-accent-foreground' },
  navigate: { icon: Navigation, label: 'Navegação', color: 'text-success' },
  sort: { icon: ArrowUpDown, label: 'Ordenação', color: 'text-orange' },
  clear: { icon: Trash2, label: 'Limpar', color: 'text-destructive' },
  answer: { icon: HelpCircle, label: 'Resposta', color: 'text-secondary-foreground' },
};

function getActionMeta(action?: string): (typeof ACTION_META)[ActionMetaKey] {
  return action && action in ACTION_META
    ? ACTION_META[action as ActionMetaKey]
    : ACTION_META.answer;
}

interface VoiceTranscriptPanelProps {
  phase: VoiceAgentPhase;
  partialTranscript: string;
  finalTranscript: string;
  agentResponse: string;
  error?: string | null;
  currentAction?: VoiceAgentAction | null;
}

function Transcript({
  phase,
  partial,
  final,
}: {
  phase: VoiceAgentPhase;
  partial: string;
  final: string;
}) {
  const transcript = partial || final;
  return (
    <AnimatePresence mode="wait">
      {transcript && (
        <motion.div
          key="transcript"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] px-5 py-4 backdrop-blur-sm">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/35">
              {phase === 'listening' ? '🎙️ Você está dizendo:' : '✅ Você disse:'}
            </p>
            <p className="font-display text-[15px] font-medium leading-relaxed text-white/90">
              "{transcript}"
              {phase === 'listening' && partial && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="ml-0.5 text-primary"
                >
                  |
                </motion.span>
              )}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ActionIcon({ action }: { action?: string }) {
  const meta = getActionMeta(action);
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 10, stiffness: 200 }}
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.08]"
    >
      <Icon className={`h-4 w-4 ${meta.color}`} />
    </motion.div>
  );
}

function AgentResponse({
  phase,
  response,
  currentAction,
}: {
  phase: VoiceAgentPhase;
  response: string;
  currentAction?: VoiceAgentAction | null;
}) {
  const visible = Boolean(response) && (phase === 'speaking' || phase === 'idle');
  const meta = getActionMeta(currentAction?.action);
  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key="agent-response"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="w-full"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] px-5 py-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <ActionIcon action={currentAction?.action} />
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/35">
                    Assistente
                  </p>
                  {currentAction && currentAction.action !== 'answer' && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`rounded-full border border-white/[0.1] bg-white/[0.06] px-2 py-0.5 text-[9px] font-medium ${meta.color}`}
                    >
                      {meta.label}
                    </motion.span>
                  )}
                </div>
                <p className="font-display text-sm leading-relaxed text-white/90">{response}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VoiceError({ error }: { error?: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full rounded-2xl border border-destructive/20 bg-destructive/10 px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/20">
              <MicOff className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="mt-1 text-xs text-white/40">Toque no orbe para tentar novamente</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function VoiceTranscriptPanel({
  phase,
  partialTranscript,
  finalTranscript,
  agentResponse,
  error,
  currentAction,
}: VoiceTranscriptPanelProps): ReactElement {
  return (
    <>
      <Transcript phase={phase} partial={partialTranscript} final={finalTranscript} />
      <AgentResponse phase={phase} response={agentResponse} currentAction={currentAction} />
      <VoiceError error={error} />
    </>
  );
}
