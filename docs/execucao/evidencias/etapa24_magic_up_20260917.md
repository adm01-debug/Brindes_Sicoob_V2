# Etapa 24 — "Magic Up": 3 de 6 tabelas nunca usadas

## Usadas (confirmado via grep de `.from("magic_up_...")`)
`magic_up_generations` (CRUD completo: select/update/delete, favoritar), `magic_up_campaigns` (CRUD completo), `magic_up_brand_kits` (CRUD completo) — todas em `src/hooks/useMagicUpGeneration.ts` e `useMagicUpState.ts`.

## Não usadas
`magic_up_comments`, `magic_up_public_shares`, `magic_up_reactions` — zero ocorrência em qualquer hook/componente/página. Verifiquei especificamente se havia UI parcialmente ligada (botão de compartilhar/comentar sem back-end real, um padrão comum de feature incompleta): o único botão "Share" em `AdImageResult.tsx` (`Share2` ícone) é **compartilhamento via WhatsApp** (ação genérica do navegador), não um link público rastreado pela tabela `magic_up_public_shares` — não é a mesma coisa, é falso-positivo de nome.

## Conclusão
Diferente da hipótese inicial de "feature incompleta com UI pendurada", a evidência aponta pra **schema provisionado antecipadamente pra uma feature de colaboração (comentários, compartilhamento público rastreável, reações) que nunca chegou a ser iniciada no frontend** — não há nenhum vestígio de UI, nem começado nem abandonado.

**Recomendação:** decisão de produto — (a) construir a feature de colaboração usando esse schema já pronto, ou (b) remover as 3 tabelas se a feature não está mais nos planos. Não é conserto mecânico, fica como pendência registrada.
