/**
 * Structured Logger SSOT — Client
 * ----------------------------------------------------------------
 * Logger estruturado JSON com correlação (request_id) que:
 *  - imprime no console em DEV de forma legível;
 *  - emite JSON em PROD (interceptável por collectors);
 *  - integra com Sentry: WARN vira `captureMessage`, ERROR vira `captureException`;
 *  - propaga `request_id` como tag no Sentry.
 *
 * Uso típico em rotas críticas (auth, checkout, orçamentos, MCP):
 *   const log = createClientLogger('auth.signIn');
 *   log.info('signin_start', { method: 'password' });
 *   try { ... } catch (err) { log.error('signin_failed', { err }); }
 */

import { captureException } from '@/lib/sentry';
import { newRequestId, REQUEST_ID_HEADER } from '@/lib/telemetry/requestId';

const browserConsole = globalThis.console;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ClientLogger {
  scope: string;
  requestId: string;
  debug: (event: string, fields?: Record<string, unknown>) => void;
  info: (event: string, fields?: Record<string, unknown>) => void;
  warn: (event: string, fields?: Record<string, unknown>) => void;
  error: (event: string, fields?: Record<string, unknown>) => void;
  child: (subScope: string, extra?: Record<string, unknown>) => ClientLogger;
  /** Header pronto para incluir em fetch/invoke e correlacionar com edge logs. */
  headers: () => Record<string, string>;
}

interface LoggerOptions {
  requestId?: string;
  base?: Record<string, unknown>;
}

function serializeErr(value: unknown): Record<string, unknown> {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return { value: String(value) };
}

function appendFields(
  payload: Record<string, unknown>,
  fields: Record<string, unknown> | undefined,
): void {
  if (!fields) return;
  for (const [key, value] of Object.entries(fields)) {
    payload[key] = ['err', 'error'].includes(key) ? serializeErr(value) : value;
  }
}

function emitToConsole(level: LogLevel, tag: string, payload: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    const logger = level === 'warn'
      ? browserConsole.warn
      : level === 'error' ? browserConsole.error : browserConsole.log;
    logger(tag, payload);
    return;
  }
  const json = JSON.stringify(payload);
  if (level === 'error') console.error(json);
  else if (level === 'warn') console.warn(json);
  else browserConsole.log(json);
}

interface LogEventContext {
  level: LogLevel;
  scope: string;
  requestId: string;
  event: string;
  fields?: Record<string, unknown>;
}

function forwardErrorToSentry(context: LogEventContext, payload: Record<string, unknown>): void {
  const { level, scope, requestId, event, fields } = context;
  if (level !== 'error') return;
  const error = fields?.err ?? fields?.error;
  const errorObject = error instanceof Error ? error : new Error(`${scope}.${event}`);
  captureException(errorObject, { tags: { scope, event, request_id: requestId }, extra: payload });
}

function emit(context: LogEventContext, base: Record<string, unknown>): void {
  const { level, scope, requestId, event, fields } = context;
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    scope,
    request_id: requestId,
    event,
    ...base,
  };
  appendFields(payload, fields);
  const tag = `[${scope}:${event}]`;
  emitToConsole(level, tag, payload);
  forwardErrorToSentry(context, payload);
}

export function createClientLogger(scope: string, opts: LoggerOptions = {}): ClientLogger {
  const requestId = opts.requestId ?? newRequestId();
  const base = opts.base ?? {};

  const build = (s: string, b: Record<string, unknown>): ClientLogger => ({
    scope: s,
    requestId,
    debug: (event, fields) => emit({ level: 'debug', scope: s, requestId, event, fields }, b),
    info: (event, fields) => emit({ level: 'info', scope: s, requestId, event, fields }, b),
    warn: (event, fields) => emit({ level: 'warn', scope: s, requestId, event, fields }, b),
    error: (event, fields) => emit({ level: 'error', scope: s, requestId, event, fields }, b),
    child: (sub, extra) => build(`${s}.${sub}`, { ...b, ...(extra ?? {}) }),
    headers: () => ({ [REQUEST_ID_HEADER]: requestId }),
  });

  return build(scope, base);
}
