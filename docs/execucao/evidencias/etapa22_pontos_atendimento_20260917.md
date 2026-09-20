# Etapa 22 — Família `pontos_atendimento`/`singulares`/`pa_singularidades`

## Dados
Todas as 5 tabelas relevantes estão com **0 linhas** hoje (nenhum dado de piloto ainda, consistente com o resto da auditoria):
`pontos_atendimento`, `singulares`, `pa_singularidades`, `postos_atendimento`, `cooperativas`.

## FK
Única FK envolvendo o cluster antigo: `pontos_atendimento.singular_id → pa_singularidades.id` — **autocontida dentro do próprio cluster antigo**, nada de fora referencia essas 3 tabelas.

## Uso em código — investigado linha por linha
Um grep inicial por `pontos_atendimento|singulares|pa_singularidades` bate em `AdminPAsPage.tsx`, `AdminSingularesPage.tsx`, `SidebarReorganized.tsx`, `admin.ts`, `QuickTestLogin.tsx` — **mas são falsos-positivos de palavra**: essas páginas usam `singulares`/`pa` como nome de variável local/título de UI (terminologia do domínio Sicoob), e exclusivamente fazem `.from('postos_atendimento')` e `.from('cooperativas')` — **nunca** `.from('pontos_atendimento')`, `.from('singulares')` ou `.from('pa_singularidades')`. Confirmado via `grep -n` linha a linha nos dois arquivos citados.

## Recomendação
`pontos_atendimento`, `singulares`, `pa_singularidades` são resíduo de uma iteração de nomenclatura anterior, genuinamente sem uso — 0 linhas, 0 referência real em código, FK autocontida. Candidatas seguras a arquivamento/remoção (sem risco de perda de dado, já que estão vazias) — seguir o mesmo protocolo cauteloso da Etapa 41 do plano principal (confirmar 0 referências, `DROP` em migration com comentário, ou mover pra schema `deprecated`). Não removido nesta sessão — fica para quando alguém aprovar a limpeza.
