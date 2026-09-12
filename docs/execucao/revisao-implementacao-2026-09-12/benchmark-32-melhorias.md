# Reavaliação das 32 melhorias Promo Gifts → Sicoob

Nenhuma conclusão formal ou implantação é concedida por esta tabela.

| ID | Melhoria | Antes | Agora | Diagnóstico |
|---|---|---|---|---|
| B01 | Expor histórico de busca com seleção e limpeza. | Parcial | Local delimitado | Histórico principal agora segmentado por usuário/cooperativa/PA, com seleção e limpeza testadas. Não inclui vistos recentemente. |
| B02 | Permitir entrada por faixa de orçamento no catálogo. | Local delimitado | Local delimitado | Atalhos por orçamento unitário implementados; não representam custo entregue firme. |
| B03 | Compactar atalhos de intenção e orçamento no mobile. | Local delimitado | Local delimitado | Trilhos móveis compactos implementados; sem homologação com aparelhos reais. |
| B04 | Manter catálogo externo protegido por contrato somente leitura. | Local delimitado | Local delimitado | Contrato local bloqueia escrita; privilégio mínimo da identidade remota não confirmado. |
| B05 | Remover custo e margem das respostas ao comprador. | Parcial | Local delimitado | Redação recursiva de custos/margem/fornecedor corrigida e testada; ACL e respostas reais da origem ainda não homologadas. |
| B06 | Garantir orçamento/pedido atômico com versão e idempotência. | Parcial | Parcial | Versão de proposta e status/verba são transacionais. Recompra/criação integral continuam separadas; política e composição aprovadas têm lacunas S01–S06. |
| B07 | Bloquear indexação do portal privado e remover sitemap provisório. | Local delimitado | Local delimitado | Noindex, robots e retirada de sitemap aplicados no código revisado. |
| B08 | Confirmar privilégios somente leitura da identidade no banco de catálogo. | Validação externa | Validação externa | ACL da identidade no mestre não foi inspecionada administrativamente. |
| B09 | Executar login, busca, primeiro orçamento e aprovação em homologação real. | Validação externa | Validação externa | CI passou, mas projetos autenticados são excluídos sem credenciais. Login→compra→aprovação com schema real não foi homologado. |
| B10 | Validar política de verba, alçada, arte e cancelamento com responsáveis. | Validação externa | Validação externa | Documentos históricos não substituem política vigente e aceite local. |
| B11 | Revisar toda a jornada real por teclado, zoom 200/400% e leitor de tela. | Parcial | Parcial | Axe em amostras locais; teclado, zoom e leitor da compra inteira não homologados. |
| B12 | Definir SLA e origem do dado de preço, estoque e prazo mostrados ao comprador. | Validação externa | Validação externa | SLA e responsabilidade por dados comerciais ainda não confirmados. |
| B13 | Levar seleção de cor ao card com estoque por variante. | Parcial | Parcial | Cores existentes; card por variante e validade de estoque precisam de contrato íntegro. |
| B14 | Criar vistos recentemente por usuário. | Parcial | Parcial | Chave global; logout remove storage, mas não limpa store em memória (S09). Falta segregação por usuário/cooperativa e ciclo de sessão real. |
| B15 | Ajustar comparação às dimensões de decisão Sicoob. | Parcial | Parcial | Comparador de produtos existe; decisão institucional exige dimensões e cotações equivalentes. |
| B16 | Criar autosave e recuperação do orçamento com estado explícito. | Parcial | Parcial | Erro explícito de autosave corrigido; S08 ainda reproduz falso salvo sem linha atualizada. Recuperação do orçamento integral e concorrência pendentes. |
| B17 | Exibir validade do preço e timestamp da consulta de estoque. | Parcial | Parcial | Componentes de atualidade existem; timestamp e reconfirmação não uniformes. |
| B18 | Implementar modelos de kit por ocasião e faixa de orçamento. | Parcial | Parcial | Templates de kits existem; curadoria por orçamento precisa de validação comercial e estoque. |
| B19 | Validar capacidade de embalagem, preço e estoque do kit no servidor. | Não demonstrado | Não demonstrado | Validação integral de capacidade, preço e estoque no servidor não demonstrada. Cliente respeita variante escolhida, mas demanda repetida não é agregada (S07). |
| B20 | Criar resumo fixo desktop e barra de ação mobile sem cobrir conteúdo. | Parcial | Parcial | Kit possui resumos responsivos; cobertura da solicitação completa e foco ainda parcial. |
| B21 | Exibir linha do tempo única de orçamento, verba, arte, pedido e entrega. | Parcial | Parcial | Status/histórico/avisos Sicoob são atômicos; notas legadas, piloto/pagamentos provisórios e ausência de destinos impedem linha única completa. |
| B22 | Implementar compartilhamento seguro e expirável para aprovação. | Parcial | Parcial | Rotas canônicas corrigidas e mocks públicos passam; asserções genéricas, revogação e isolamento real ainda não sustentam aceite. |
| B23 | Adicionar métricas do funil sem dados fictícios. | Parcial | Parcial | Dados artificiais saíram de pedidos; statsService conserva meta/fallback e agregados têm valores fixos. Funil real ainda não conciliado. |
| B24 | Medir Core Web Vitals no domínio de homologação. | Parcial | Parcial | Shell pesado saiu do login e Lighthouse CI passou; faltam jornadas autenticadas, domínio alvo e métricas de campo. |
| B25 | Recomendações por ocasião, histórico e regras comerciais explicáveis. | Parcial | Parcial | Sugestões existentes; histórico e regras explicáveis não validados pelo público. |
| B26 | Estoque futuro com níveis de confiança. | Não demonstrado | Não demonstrado | Forecast na interface não comprova modelo validado nem intervalo de confiança. |
| B27 | Recompra com nova consulta de preço e disponibilidade. | Parcial | Parcial | Serviço/rota corrigidos e nova consulta de preço/estoque-base realizada no código. Variante, mínimo, múltiplo, endereço e criação atômica continuam pendentes. |
| B28 | Modelos de campanha salvos pela cooperativa. | Parcial | Parcial | Campanha genérica existe; modelo por cooperativa com marcos/destinos incompleto. |
| B29 | Assistente de briefing para kits e campanhas. | Não demonstrado | Não demonstrado | Não foi demonstrado assistente de briefing institucional com dados e restrições suficientes. |
| B30 | Mockup assistido com versionamento de arte. | Parcial | Parcial | Mockups existentes; prova técnica e versão imutável vinculada ao aceite não asseguradas. |
| B31 | Entrega distribuída entre unidades com reconciliação de quantidades. | Não demonstrado | Não demonstrado | Página usa lotes fixos, RPC só cria grupo e remessa é única por pedido. Divisão/reconciliação por destino ainda não implementada (A16). |
| B32 | Personalização do catálogo por cooperativa sem bifurcar código. | Parcial | Parcial | Políticas por cooperativa existem, mas snapshot/precedência falham (S01–S04). Troca explícita de papel foi corrigida; carregamento de contexto continua sujeito a resposta antiga. |
