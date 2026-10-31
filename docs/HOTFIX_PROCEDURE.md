# Procedimento de correção urgente

Este procedimento vale para os ambientes suportados do projeto. O estado
registrado do portal é **em construção**; não trate uma correção como incidente
de produção sem confirmar o ambiente afetado e o impacto real.

## Fluxo

1. **Classificar e reproduzir:** registre ambiente, SHA, impacto, horário e
   evidência. Para defeito reproduzível, crie ou atualize um teste que falhe
   antes da correção.
2. **Corrigir isoladamente:** crie branch a partir da `main` e faça a menor
   mudança que resolva a causa raiz. Não altere workflows, baselines, testes ou
   regras de lint/tipagem para mascarar falha.
3. **Validar:** rode os testes específicos e os gates aplicáveis do
   [guia de testes](./TESTING.md). Para smoke Playwright, o script existente é
   `npm run test:e2e:smoke` (o comando antigo test:smoke não existe).
4. **Revisar por PR:** abra PR para `main`, examine o diff e aguarde todos os
   checks obrigatórios configurados para o repositório. O workflow de qualidade
   versionado chama-se **Qualidade contínua**; seus nomes de jobs podem mudar,
   então consulte os checks exibidos no PR em vez de presumir um check chamado
   `quality`.
5. **Publicar e observar:** use apenas o fluxo autorizado para o ambiente
   afetado, confirme a execução remota e valide a jornada corrigida. Em caso de
   regressão, interrompa a publicação e reverta pela revisão normal do PR.
6. **Registrar:** documente causa raiz, impacto, SHA, links de execução, testes,
   mitigação e prevenção em `docs/incidents/`, quando houver incidente real.

## Restrições

- Não faça push direto em `main`, force push, nem contorne checks.
- Não aplique migrations ou publique funções por comando manual fora dos
  workflows allowlisted em [DEPLOYMENT.md](./DEPLOYMENT.md).
- Não use contas de produção como fixture de teste nem exponha secrets em logs,
  artefatos ou relatórios.
