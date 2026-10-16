export type KitPersistenceIntent = 'automatic' | 'manual';

export interface KitPersistenceExecutionResult {
  targetId?: string | null;
}

export interface KitPersistenceResult extends KitPersistenceExecutionResult {
  stale: boolean;
  executed: boolean;
  snapshot: string;
}

interface EnqueueInput {
  snapshot: string;
  execute: (targetId: string | null) => Promise<KitPersistenceExecutionResult>;
  adoptTarget?: boolean;
  adoptBaseline?: boolean;
}

/**
 * Serializa todas as gravações de uma instância do Kit Builder.
 * A geração é monotônica: voltar de A para B e depois para A cria três escopos
 * distintos, portanto uma resposta atrasada do primeiro A nunca é adotada.
 */
export class KitPersistenceCoordinator {
  private generation = 0;
  private scopeKey: string | null = null;
  private targetId: string | null = null;
  private persistedSnapshot = '';
  private queues = new Map<number, Promise<void>>();

  activateScope(scopeKey: string, targetId: string | null, baselineSnapshot: string): number {
    if (scopeKey === this.scopeKey) return this.generation;
    this.generation += 1;
    this.scopeKey = scopeKey;
    this.targetId = targetId;
    this.persistedSnapshot = baselineSnapshot;
    return this.generation;
  }

  getGeneration(): number {
    return this.generation;
  }

  getTargetId(): string | null {
    return this.targetId;
  }

  getPersistedSnapshot(): string {
    return this.persistedSnapshot;
  }

  isDirty(snapshot: string): boolean {
    return snapshot !== this.persistedSnapshot;
  }

  adoptBaseline(snapshot: string, expectedGeneration = this.generation): boolean {
    if (expectedGeneration !== this.generation) return false;
    this.persistedSnapshot = snapshot;
    return true;
  }

  enqueue(input: EnqueueInput): Promise<KitPersistenceResult> {
    const operationGeneration = this.generation;
    const previous = this.queues.get(operationGeneration) ?? Promise.resolve();
    const operation = previous.then(async (): Promise<KitPersistenceResult> => {
      if (operationGeneration !== this.generation) {
        return { stale: true, executed: false, snapshot: input.snapshot };
      }

      const result = await input.execute(this.targetId);
      if (operationGeneration !== this.generation) {
        return { ...result, stale: true, executed: true, snapshot: input.snapshot };
      }

      if (input.adoptTarget !== false && result.targetId) this.targetId = result.targetId;
      if (input.adoptBaseline !== false) this.persistedSnapshot = input.snapshot;
      return { ...result, stale: false, executed: true, snapshot: input.snapshot };
    });

    const tail = operation.then(() => undefined, () => undefined);
    this.queues.set(operationGeneration, tail);
    void tail.then(() => {
      if (this.queues.get(operationGeneration) === tail) {
        this.queues.delete(operationGeneration);
      }
    });
    return operation;
  }
}
