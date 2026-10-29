import { pathToFileURL } from 'node:url';

export const PROTECTED_SUPABASE_PROJECT_IDS = new Set([
  'cfmzkthhgliqelozlmwu',
  'doufsxqlfjyuvxuezpln',
]);

export function validateE2ESupabaseTarget({ url, projectId, publishableKey }) {
  if (!url || !projectId || !publishableKey) {
    return { ok: false, reason: 'configuração ausente' };
  }

  if (PROTECTED_SUPABASE_PROJECT_IDS.has(projectId)) {
    return { ok: false, reason: 'o projeto informado é protegido e não pode receber testes E2E' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { ok: false, reason: 'URL Supabase inválida' };
  }

  const projectHost = parsedUrl.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/i);
  if (parsedUrl.protocol !== 'https:' || !projectHost) {
    return { ok: false, reason: 'a URL precisa usar HTTPS e o domínio padrão do Supabase' };
  }

  if (projectHost[1] !== projectId) {
    return { ok: false, reason: 'URL e identificador do projeto não correspondem' };
  }

  return { ok: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateE2ESupabaseTarget({
    url: process.env.VITE_SUPABASE_URL,
    projectId: process.env.E2E_SUPABASE_PROJECT_ID,
    publishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.ok) {
    console.error(`Projeto E2E não validado: ${result.reason}. Secrets e variável devem apontar para o mesmo projeto isolado.`);
    process.exitCode = 1;
  }
}
