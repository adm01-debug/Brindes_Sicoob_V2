# Guia de deploy

## Pré-requisitos
- Node.js 24+
- Projeto Supabase vinculado ao ambiente de construção
- Segredos configurados no painel/Vault do ambiente; nunca em `.env` versionado

## Etapas

1. Instalar dependências reproduzíveis:
```bash
npm ci
```

2. Configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no provedor de hospedagem. Este repositório não possui `.env.example` e não deve receber segredos administrativos em arquivos locais versionados.

3. Antes das migrations de operações internas, configurar `INTERNAL_FUNCTION_SECRET`
   nas Edge Functions e os segredos `sicoob_project_url` e
   `sicoob_internal_function_secret` no Vault. Os dois segredos internos devem
   ter o mesmo valor aleatório de pelo menos 32 caracteres.

4. Aplicar migrations somente após revisão, primeiro no ambiente de construção:
```bash
npx supabase db push --linked
```

5. Compilar:
```bash
npm run build
```

6. Publicar o frontend pelo provedor configurado e cada Edge Function pelo CLI Supabase autenticado. Não existe script `npm run deploy` neste repositório.

## Production Checklist
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] SSL certificates installed
- [ ] CDN configured
- [ ] Monitoring enabled
