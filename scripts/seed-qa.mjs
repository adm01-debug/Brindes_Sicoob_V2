import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY não definidos.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSeed() {
  const scenario = process.argv[2] || 'default';
  console.log(`Iniciando seed QA para o cenário: ${scenario}...`);

  const { data, error } = await supabase.functions.invoke('sicoob-seed-qa', {
    body: { scenario }
  });

  if (error) {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  }

  console.log('Seed finalizado com sucesso!');
  console.log(JSON.stringify(data, null, 2));
}

runSeed();
