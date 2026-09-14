/**
 * Browser API type extensions.
 * Eliminates (window as any) patterns for vendor-prefixed APIs.
 *
 * Precisa de `import type` (DiagnosticsManager) pra tipar
 * `window.__DIAGNOSTICS__` — isso torna o arquivo um módulo, então a
 * fusão de interface global exige `declare global` explícito em vez do
 * script ambiente implícito que este arquivo usava antes.
 */
import type { DiagnosticsManager } from "@/lib/diagnostics";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    /** Web Speech API (standard + webkit prefix) */
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
    /** Safari standalone mode detection */
    navigator: Navigator & {
      standalone?: boolean;
    };
    /** Exposto em dev/prod pra inspeção manual no console (src/lib/diagnostics.ts). */
    __DIAGNOSTICS__?: DiagnosticsManager;
  }

  interface Navigator {
    /** Device memory in GB (Chrome/Edge only) */
    deviceMemory?: number;
    /** Safari standalone mode */
    standalone?: boolean;
  }
}
