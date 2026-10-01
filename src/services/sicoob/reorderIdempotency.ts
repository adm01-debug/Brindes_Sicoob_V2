const STORAGE_PREFIX = "sicoob-reorder-intent:";
const memoryKeys = new Map<string, string>();

function storageKey(intent: string): string {
  return `${STORAGE_PREFIX}${intent}`;
}

function readPersisted(intent: string): string | null | undefined {
  try {
    if (!globalThis.sessionStorage) return undefined;
    const value = globalThis.sessionStorage.getItem(storageKey(intent));
    if (!value) memoryKeys.delete(intent);
    return value;
  } catch {
    return undefined;
  }
}

function persist(intent: string, idempotencyKey: string): void {
  memoryKeys.set(intent, idempotencyKey);
  try {
    globalThis.sessionStorage?.setItem(storageKey(intent), idempotencyKey);
  } catch {
    // O mapa em memória mantém a proteção quando o storage está indisponível.
  }
}

export function beginReorderIntent(
  intent: string,
  suppliedKey?: string,
): { idempotencyKey: string; managed: boolean } {
  if (suppliedKey) return { idempotencyKey: suppliedKey, managed: false };

  const persisted = readPersisted(intent);
  const existing = persisted === undefined ? memoryKeys.get(intent) : persisted;
  if (existing) {
    memoryKeys.set(intent, existing);
    return { idempotencyKey: existing, managed: true };
  }

  const idempotencyKey = crypto.randomUUID();
  persist(intent, idempotencyKey);
  return { idempotencyKey, managed: true };
}

export function completeReorderIntent(
  intent: string,
  idempotencyKey: string,
  managed: boolean,
): void {
  if (!managed || memoryKeys.get(intent) !== idempotencyKey) return;
  memoryKeys.delete(intent);
  try {
    if (globalThis.sessionStorage?.getItem(storageKey(intent)) === idempotencyKey) {
      globalThis.sessionStorage.removeItem(storageKey(intent));
    }
  } catch {
    // A limpeza em memória já ocorreu; storage indisponível não invalida o sucesso.
  }
}
