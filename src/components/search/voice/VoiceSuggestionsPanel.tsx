/**
 * VoiceSuggestionsPanel — Shows command suggestions or recent commands + text input.
 */
import { useRef, useState, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Keyboard, X } from 'lucide-react';
import type { VoiceAgentPhase } from '@/hooks/useVoiceAgent';
import type { VoiceHistoryEntry } from '@/hooks/voice/useVoiceHistory';

const SUGGESTION_COMMANDS = [
  'Quero canetas azuis baratas',
  'Mostra mochilas ecológicas',
  'Pergunte ao Flow qual o melhor brinde',
  'Abre os orçamentos',
];

interface VoiceSuggestionsPanelProps {
  phase: VoiceAgentPhase;
  isBooting: boolean;
  recentCommands?: VoiceHistoryEntry[];
  onCommandSelect?: (command: string) => void;
  onSimulateCommand?: (command: string) => void;
  onClose: () => void;
}

function CommandSuggestions({
  recentCommands,
  onSelect,
}: Pick<VoiceSuggestionsPanelProps, 'recentCommands'> & { onSelect?: (command: string) => void }) {
  const commands = recentCommands?.length
    ? recentCommands
        .slice(0, 4)
        .map(({ timestamp, transcript }) => ({ key: timestamp, text: transcript }))
    : SUGGESTION_COMMANDS.map((text) => ({ key: text, text }));
  return (
    <motion.div
      initial={{ y: 15, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.25 }}
      className="w-full space-y-3 text-center"
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-white/25">
        {recentCommands?.length ? 'Comandos recentes' : 'Experimente dizer'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {commands.map(({ key, text }) => (
          <button
            key={key}
            onClick={() => onSelect?.(text)}
            className="group cursor-pointer rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-xs text-white/35 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.08] hover:text-white/70 hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]"
          >
            <span className="transition-all duration-200 group-hover:tracking-wide">"{text}"</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

interface TextCommandProps {
  phase: VoiceAgentPhase;
  visible: boolean;
  value: string;
  inputRef: RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

function TextCommandInput({
  phase,
  visible,
  value,
  inputRef,
  onChange,
  onSubmit,
}: TextCommandProps) {
  const disabled = phase === 'processing' || phase === 'speaking';
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="w-full overflow-hidden"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Digite um comando..."
              className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/10"
              autoFocus
              disabled={disabled}
            />
            <button
              type="submit"
              disabled={!value.trim() || disabled}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/20 text-primary transition-colors hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VoiceFooter({
  onToggleInput,
  onClose,
}: {
  onToggleInput: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-1 flex w-full items-center justify-between">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-[10px] text-white/20"
      >
        <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[9px]">
          ESC
        </kbd>{' '}
        fechar
        <span className="mx-1.5 text-white/10">·</span>
        <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[9px]">
          SPACE
        </kbd>{' '}
        ativar
      </motion.p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleInput}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
          aria-label="Digitar comando"
          title="Digitar comando (sem microfone)"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
          aria-label="Fechar assistente de voz"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function VoiceSuggestionsPanel({
  phase,
  isBooting,
  recentCommands,
  onCommandSelect,
  onSimulateCommand,
  onClose,
}: VoiceSuggestionsPanelProps) {
  const [showTextInput, setShowTextInput] = useState(false);
  const [textCommand, setTextCommand] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);
  const toggleInput = () => {
    setShowTextInput((visible) => !visible);
    if (!showTextInput) setTimeout(() => textInputRef.current?.focus(), 100);
  };
  const submit = () => {
    if (!textCommand.trim() || !onSimulateCommand) return;
    onSimulateCommand(textCommand.trim());
    setTextCommand('');
    setShowTextInput(false);
  };
  return (
    <>
      {phase === 'idle' && !isBooting ? (
        <CommandSuggestions recentCommands={recentCommands} onSelect={onCommandSelect} />
      ) : null}
      <TextCommandInput
        phase={phase}
        visible={showTextInput}
        value={textCommand}
        inputRef={textInputRef}
        onChange={setTextCommand}
        onSubmit={submit}
      />
      <VoiceFooter onToggleInput={toggleInput} onClose={onClose} />
    </>
  );
}
