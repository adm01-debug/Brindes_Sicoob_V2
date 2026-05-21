import { GateValue, GateFlagProvider } from './types';

const TRUTHY = new Set(['true', '1', 'on', 'yes']);
const FALSY = new Set(['false', '0', 'off', 'no']);

/**
 * Utilitário para parsear strings em valores do Gate.
 */
export function parseGateFlag(raw: unknown): GateValue {
  if (typeof raw !== 'string') return 'auto';
  const v = raw.trim().toLowerCase();
  if (v === '' || v === 'auto') return 'auto';
  if (TRUTHY.has(v)) return true;
  if (FALSY.has(v)) return false;
  return 'auto';
}

/**
 * Provedor de flag baseado em variáveis de ambiente do Vite.
 */
export class EnvGateProvider implements GateFlagProvider {
  getFlag(): GateValue {
    try {
      // Vite substitui `import.meta.env` em build-time, então a leitura é barata.
      // Não cacheamos estaticamente: um cache estático nunca-invalidado congela o
      // valor para todo o ciclo de vida do módulo e vaza estado entre instâncias.
      const raw = import.meta.env.VITE_SHOW_DEV_INFRA_MESSAGES;
      return parseGateFlag(raw);
    } catch {
      return 'auto';
    }
  }
}

/**
 * Provedor de flag baseado em localStorage.
 */
export class LocalStorageGateProvider implements GateFlagProvider {
  private lastValue: GateValue | null = null;
  private lastRaw: string | null = null;

  constructor(private readonly key: string = 'show_dev_infra_messages') {}

  getFlag(): GateValue {
    if (typeof window === 'undefined' || !window.localStorage) return 'auto';
    
    try {
      const raw = window.localStorage.getItem(this.key);
      // Otimização: Evitar parsing se o valor bruto no localStorage não mudou
      if (raw === this.lastRaw && this.lastValue !== null) {
        return this.lastValue;
      }
      
      this.lastRaw = raw;
      this.lastValue = parseGateFlag(raw);
      return this.lastValue;
    } catch {
      return 'auto';
    }
  }
}
