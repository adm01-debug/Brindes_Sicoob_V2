# Auditoria do planejamento — 13/10/2026

Referência auditada: `fff0b4cb60b23715661d5782cdf747df4ef0027d`. Este pacote registra o estado encontrado e não declara que as correções foram implementadas.

- [Relatório completo](RELATORIO.md): 56 frentes, evidência delimitada e encaminhamento de cada uma.
- [Estratégia de implementação](ESTRATEGIA_IMPLEMENTACAO.md): sequência recomendada, dependências e critérios de encerramento.
- [Consulta pesquisável offline](consulta.html): busca nas frentes, nos 682 registros históricos e nas 100 etapas. O GitHub mostra o código HTML; o arquivo funciona ao ser aberto localmente no navegador.
- [Frentes consolidadas](achados-consolidados.csv), [registros reconciliados](revisao-682-registros.csv), [matriz de etapas](matriz-100-etapas.csv) e [checklist de subetapas](checklist-1000-subetapas.csv).
- [Cobertura documental](cobertura-documentos.csv), [inventário de arquivos](cobertura-repositorio.csv) e [referências dos achados](referencias-dos-achados.csv).
- [Métodos e scripts originais de reprodução](reproducao/LEIA-ME.md).

## Evidências

Os JSONs `bd-*` registram metadados e consultas somente leitura. As configurações de segredo contêm nomes ou presença, sem valores. `github-*` e `http-publico.json` registram a situação consultada; não devem ser interpretados como monitoramento permanente.

As simulações estão nos arquivos `simulacao-*.json` e `simular-*.py.json`. Foram executadas com dados sintéticos; as simulações de banco usaram PostgreSQL descartável sem rede. `validacao-consulta.json` testa a consulta HTML da auditoria, não o portal.

`local-AUDITORIA.md` e `local-PLANO_100.md` preservam documentos locais anteriores, ainda não rastreados no checkout original. São fontes históricas de outra base. Os scripts em `reproducao/` também são os originais da coleta, incluindo os caminhos do ambiente utilizado; não são uma suíte portátil já incorporada ao CI.

## Integridade e publicação

Os 82 arquivos originais deste pacote foram preservados byte a byte. [manifesto-entrega.json](manifesto-entrega.json) contém os hashes dos entregáveis principais; [manifesto-publicacao.json](manifesto-publicacao.json) registra cada arquivo da coleta e seu destino.

O `.gitattributes` deste diretório impede normalização dos CSVs e preserva o espaçamento de duas capturas históricas. Isso mantém seus hashes; não altera regras do código da aplicação nem a varredura de segredos.

As 501 extrações textuais são caches regeneráveis de documentos já presentes no commit auditado. O bundle compilado temporário da função de e-mail também é cache; seu hash está em `edge-verify-email-paridade.json` e a fonte do handler já está no repositório. Esses 502 caches são identificados no manifesto, evitando duplicar as fontes. Todos os relatórios, matrizes, inventários, metadados, resultados e scripts originais da auditoria estão versionados.

A frase do relatório sobre arquivos mantidos localmente descreve o momento da auditoria. Esta publicação posterior acrescenta os metadados ao repositório privado, preservando o conteúdo original. Nada foi colocado em `public/`.

Os 682 registros incluem sobreposições, propostas, decisões de escopo e diagnósticos históricos. Não são 682 defeitos independentes comprovados. A classificação por nível de prova e as ressalvas fazem parte da conclusão.
