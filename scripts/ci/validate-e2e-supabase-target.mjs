import { pathToFileURL } from 'node:url';

const CANONICAL_PROJECT_ID = 'cfmzkthhgliqelozlmwu';

export function validateE2eSupabaseTarget({
  url,
  expectedProjectId,
  configuredProjectId,
  publishableKey,
  serviceRoleKey,
}) {
  const errors = [];
  let actualProjectId = null;

  if (!expectedProjectId?.trim()) {
    errors.push('Configure a variável E2E_SUPABASE_PROJECT_ID com o ref do projeto de homologação.');
  }
  if (!configuredProjectId?.trim()) {
    errors.push('Configure o secret VITE_SUPABASE_PROJECT_ID para o projeto de homologação.');
  }
  if (!publishableKey?.trim() || !serviceRoleKey?.trim()) {
    errors.push('Configure as chaves publicável e administrativa do projeto de homologação.');
  }

  try {
    const parsedUrl = new URL(url);
    const match = /^([a-z0-9-]+)\.supabase\.co$/i.exec(parsedUrl.hostname);
    if (parsedUrl.protocol !== 'https:' || !match || parsedUrl.username || parsedUrl.password) {
      errors.push('VITE_SUPABASE_URL deve ser HTTPS e usar o domínio padrão do Supabase.');
    } else {
      actualProjectId = match[1].toLowerCase();
    }
  } catch {
    errors.push('VITE_SUPABASE_URL está ausente ou inválida.');
  }

  if (actualProjectId && expectedProjectId?.trim() !== actualProjectId) {
    errors.push('E2E_SUPABASE_PROJECT_ID não corresponde ao projeto indicado pela URL.');
  }
  if (actualProjectId && configuredProjectId?.trim() !== actualProjectId) {
    errors.push('VITE_SUPABASE_PROJECT_ID não corresponde ao projeto indicado pela URL.');
  }
  if (actualProjectId === CANONICAL_PROJECT_ID) {
    errors.push('O E2E remoto não pode apontar para o banco canônico do projeto.');
  }

  return { ok: errors.length === 0, errors, actualProjectId };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateE2eSupabaseTarget({
    url: process.env.VITE_SUPABASE_URL,
    expectedProjectId: process.env.E2E_SUPABASE_PROJECT_ID,
    configuredProjectId: process.env.VITE_SUPABASE_PROJECT_ID,
    publishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey: process.env.SUPABASE_SECRET_KEY,
  });

  if (!result.ok) {
    for (const error of result.errors) console.error(`::error::${error}`);
    process.exitCode = 1;
  }
}
