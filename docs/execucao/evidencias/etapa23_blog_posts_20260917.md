# Etapa 23 — `blog_posts`

Zero rotas em `src/routes/config/*.ts` referenciando blog. Zero uso em código de aplicação — a única ocorrência do nome é em `src/integrations/supabase/types.ts` (gerado a partir do schema, não é "uso" real). Não existe nenhuma feature de blog no app, nem UI, nem rota, nem hook.

**Recomendação:** candidata segura a remoção — sem feature associada, sem risco de quebrar nada. Não removida nesta sessão (decisão de retenção fica pra quem aprovar).
