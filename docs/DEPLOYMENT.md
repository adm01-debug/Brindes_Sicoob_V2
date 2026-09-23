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

3. Aplicar migrations somente após revisão, primeiro no ambiente de construção:
```bash
npx supabase db push --linked
```

4. Compilar:
```bash
npm run build
```

5. Publicar o frontend pelo provedor configurado e cada Edge Function pelo CLI Supabase autenticado. Não existe script `npm run deploy` neste repositório.

## Production Checklist
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] SSL certificates installed
- [ ] CDN configured
- [ ] Monitoring enabled
