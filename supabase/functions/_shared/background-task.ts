/**
 * Mantém tarefas secundárias em execução depois que a resposta da Edge Function
 * é devolvida. No runtime do Supabase, `waitUntil` prolonga a vida do worker;
 * em testes e em runtimes sem essa API, a Promise continua protegida contra
 * rejeições não tratadas.
 */
type EdgeRuntimeLike = {
  waitUntil(promise: Promise<unknown>): void;
};

function getEdgeRuntime(): EdgeRuntimeLike | undefined {
  return (globalThis as typeof globalThis & { EdgeRuntime?: EdgeRuntimeLike })
    .EdgeRuntime;
}

export function deferBackgroundTask(
  task: Promise<unknown>,
  context: string,
): void {
  const protectedTask = task.catch((error) => {
    console.warn(
      `[background-task] ${context}:`,
      error instanceof Error ? error.message : error,
    );
  });

  const runtime = getEdgeRuntime();
  if (runtime?.waitUntil) {
    runtime.waitUntil(protectedTask);
  }
}
