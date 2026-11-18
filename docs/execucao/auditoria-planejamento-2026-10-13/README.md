# Auditoria do planejamento — 13/10/2026

Referência auditada: `fff0b4cb60b23715661d5782cdf747df4ef0027d`. Este pacote registra o estado encontrado e não declara que as correções foram implementadas.

- [Relatório completo](RELATORIO.md): 56 frentes, evidência delimitada e encaminhamento de cada uma.
- [Estratégia de implementação](ESTRATEGIA_IMPLEMENTACAO.md): sequência recomendada, dependências e critérios de encerramento.
- [Frentes consolidadas](achados-consolidados.csv), [registros reconciliados](revisao-682-registros.csv), [matriz de etapas](matriz-100-etapas.csv) e [checklist de subetapas](checklist-1000-subetapas.csv).
- [Cobertura documental](cobertura-documentos.csv), [inventário de arquivos](cobertura-repositorio.csv) e [referências dos achados](referencias-dos-achados.csv).
- [Métodos e scripts originais de reprodução](reproducao/LEIA-ME.md).

## O que foi recuperado, e o que ficou de fora

Este pacote vem da PR #105, fechada sem merge. Foi trazido para a `main` em
18/11/2026 com **75 dos 87 arquivos originais**. Três artefatos **gerados**
ficaram de fora, somando 13,3 MB dos 20 MB do pacote:

| arquivo | tamanho | por que ficou de fora |
|---|---|---|
| `marcadores-documentacao.json` | 10,5 MB | índice de marcadores de documentação varridos do repositório; sem juízo analítico |
| `inventario-repositorio.json` | 1,8 MB | listagem de arquivos do repositório naquele commit |
| `consulta.html` | 968 KB | visão navegável dos mesmos dados que estão nos CSV/JSON preservados |

Nenhum deles é trabalho de análise: os três são **saída de script**, e os
scripts que os produzem estão aqui, em `reproducao/`
(`sicoob_audit_20261013.py` gera os dois inventários;
`sicoob_relatorio_20261013.py` gera a consulta). Quem precisar deles regenera a
partir do commit auditado. Os originais também continuam acessíveis para sempre
na referência da PR fechada (`refs/pull/105/head`).

O que carrega juízo — relatório das 56 frentes, estratégia de implementação,
achados consolidados, os 682 registros reconciliados, a matriz de 100 etapas, o
checklist de 1.000 subetapas, os retratos `bd-*` do banco, as simulações, os
`.sql` capturados do canônico e os scripts de reprodução — **veio inteiro**.

Verificado antes de trazer, por ser repositório público: nenhum JWT (`eyJ…`),
nenhuma chave de API, nenhum CPF ou CNPJ, nenhum e-mail pessoal. Os endereços
presentes são duas contas de teste, dois endereços institucionais e o suporte
do GitHub; as configurações de segredo registram **nome e presença**, nunca
valor.

## Evidências

Os JSONs `bd-*` registram metadados e consultas somente leitura. As configurações de segredo contêm nomes ou presença, sem valores. `github-*` e `http-publico.json` registram a situação consultada; não devem ser interpretados como monitoramento permanente.

As simulações estão nos arquivos `simulacao-*.json` e `simular-*.py.json`. Foram executadas com dados sintéticos; as simulações de banco usaram PostgreSQL descartável sem rede. `validacao-consulta.json` testa a consulta HTML da auditoria, não o portal.

`local-AUDITORIA.md` e `local-PLANO_100.md` preservam documentos locais anteriores, ainda não rastreados no checkout original. São fontes históricas de outra base. Os scripts em `reproducao/` também são os originais da coleta, incluindo os caminhos do ambiente utilizado; não são uma suíte portátil já incorporada ao CI.

## Integridade e publicação

Os dois manifestos são **documentos históricos da coleta de 13/10/2026** e foram mantidos como estavam: [manifesto-entrega.json](manifesto-entrega.json) traz os hashes dos entregáveis originais e [manifesto-publicacao.json](manifesto-publicacao.json) registra cada arquivo da coleta e o destino previsto **naquela data**. Eles não descrevem este pacote publicado, e conferi-los contra os arquivos daqui acusa duas diferenças — ambas desta publicação, não da coleta:

| arquivo | no manifesto histórico | nesta publicação |
|---|---|---|
| `RELATORIO.md` | 85470 bytes, `13e50a6f…` | 85554 bytes, `e1ce863c7bbc78c1701003fb318ca09a6efdb9f6f0f465b52e03e1c6fdb63303` — os links para os três arquivos omitidos foram removidos, senão apontariam para o nada |
| `consulta.html` | listado como versionado | **ausente** (968 KB), junto de `marcadores-documentacao.json` (10,5 MB) e `inventario-repositorio.json` (1,8 MB) |

Os outros 79 arquivos conferem byte a byte com o manifesto de entrega. A proveniência original fica preservada justamente por não reescrever os manifestos: o que mudou está nesta tabela.

O `.gitattributes` deste diretório impede normalização dos CSVs e preserva o espaçamento de duas capturas históricas. Isso mantém seus hashes; não altera regras do código da aplicação nem a varredura de segredos.

As 501 extrações textuais são caches regeneráveis de documentos já presentes no commit auditado. O bundle compilado temporário da função de e-mail também é cache; seu hash está em `edge-verify-email-paridade.json` e a fonte do handler já está no repositório. Esses 502 caches são identificados no manifesto, evitando duplicar as fontes. Todos os relatórios, matrizes, inventários, metadados, resultados e scripts originais da auditoria estão versionados.

A frase do relatório sobre arquivos mantidos localmente descreve o momento da auditoria. Esta publicação posterior acrescenta os metadados ao repositório privado, preservando o conteúdo original. Nada foi colocado em `public/`.

Os 682 registros incluem sobreposições, propostas, decisões de escopo e diagnósticos históricos. Não são 682 defeitos independentes comprovados. A classificação por nível de prova e as ressalvas fazem parte da conclusão.
