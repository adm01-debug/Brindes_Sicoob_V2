# Distribuição de PptxGenJS para o navegador

Esta pasta preserva, sem alterações, o módulo ESM, as declarações TypeScript e a licença MIT do pacote oficial PptxGenJS 4.0.1. Os hashes e a origem estão em `proveniencia.json`.

O manifesto local inclui apenas `jszip`, importado pelo módulo ESM. A dependência `image-size` do manifesto original não é importada por esse módulo, é explicitamente desabilitada pelo campo `browser` do pacote oficial e possui avisos de segurança sem versão corrigida na data desta revisão. Removemos essa dependência da distribuição usada pelo portal, preservando a exportação PPTX existente. Não foi criado um analisador de imagens substituto.

O pacote local é privado e se destina à exportação pelo navegador. Não representa uma correção publicada pelo mantenedor nem suporte aos demais pontos de entrada Node/CJS do pacote original. O código licenciado permanece integral; apenas o manifesto de empacotamento é local.

Ao atualizar PptxGenJS, compare os imports efetivos, a licença, os hashes e o teste de geração/abertura do arquivo PPTX. Quando o pacote oficial remover ou corrigir a dependência, prefira voltar à distribuição oficial completa.

Referências: [PptxGenJS 4.0.1](https://www.npmjs.com/package/pptxgenjs/v/4.0.1), [aviso ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr), [aviso JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq).
