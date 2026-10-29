# Backlog de evolução do portal

Todos os 42 itens estão propostos, sem implementação nesta análise. P0 bloqueia o piloto; P1 compõe a primeira compra completa; P2 depende do aprendizado operacional. A ordem segue dependências, não a numeração. A e D referem-se aos anexos técnicos A e B; números isolados identificam fontes de pesquisa.

## P0

| ID | Entrega | Critério de aceite | Dependências |
|---|---|---|---|
| B01 | Identificar produção e dois bancos | Inventário bate com metadados de deploy e saúde; conectores de outro projeto são excluídos | Nenhuma |
| B02 | Conter resposta de credenciais do migrate-helper | Código não devolve segredos; função publicada removida ou incapaz de expor; evidência de tratamento registrada | B01 |
| B03 | Restringir API externa a leitura | INSERT, UPDATE, DELETE, UPSERT e RPC mutante são negados pelo serviço; custo interno não é exposto indevidamente | B01 |
| B04 | Usar credencial externa de privilégio mínimo | ACL ou contrato do serviço confirma leitura; nenhum segredo chega ao navegador; sem escrita de teste no mestre | B03 |
| B05 | Conectar a fonte correta e mapear campos | Consulta real a dou retorna amostra mínima validada; portal distingue indisponibilidade de catálogo vazio | B04 |
| B06 | Unificar papéis e escopos | Matriz aprovada para piloto; não há aliases conflitantes no fluxo crítico; acesso deriva de vínculo ativo | B01 |
| B07 | Corrigir composição de rotas | Sessão real de cada papel acessa a jornada prevista; usuário sem permissão recebe estado claro | B06 |
| B08 | Corrigir autorização das RPCs | Tentativas de aprovador forjado, pedido de outra cooperativa e requisição incompatível são negadas | B06 |
| B09 | Validar isolamento real | Casos permitidos e negados passam com usuários autenticados distintos; resultados ligados ao schema e commit | B07,B08 |
| B10 | Restabelecer execução dos gates | CI executa checks aplicáveis e publica resultados reais; ausência de configuração obrigatória falha explicitamente | B01 |
| B11 | Tratar dependências de risco do piloto | Gate oficial passa conforme política do projeto; exceção exige justificativa, responsável e validade | B10 |
| B12 | Reduzir erros no fluxo crítico | Módulos críticos compilam com contratos corretos; dívida restante tem inventário, sem regressão por arquivo | B05,B07,B08 |

## P1

| ID | Entrega | Critério de aceite | Dependências |
|---|---|---|---|
| B13 | Limpar o acesso de produção | Build de produção não mostra correção de usuário, métricas inventadas ou provedor desativado; login funcional | B07 |
| B14 | Definir onboarding do piloto | Pessoa convidada entra na cooperativa correta; convite expirado ou revogado é negado; cadastro fechado é explicado | B06,B07 |
| B15 | Consolidar cooperativa, PA e competência | Nenhum orçamento depende de tabela/campo inexistente; competência e unidade corretas na tela | B01,B06 |
| B16 | Tornar compromisso e estorno atômicos | Concorrência não excede limite indevidamente; reenvio não duplica consumo; cancelamento estorna conforme regra | B08,B15 |
| B17 | Configurar regras por cooperativa | Duas políticas distintas operam sem alteração de código; pedido preserva a versão usada | B06,B15 |
| B18 | Curadoria por finalidade e restrições | Comprador encontra opções viáveis; mínimo, múltiplo e restrições são visíveis antes da proposta | B05 |
| B19 | Separar preço de custo e total entregue | Total fecha com itens; campo ausente exige cotação; custos internos não vazam para comprador | B05,B03 |
| B20 | Criar proposta versionada e válida | Reabertura do histórico reproduz exatamente a proposta; edição cria nova versão e não altera pedido aprovado | B19 |
| B21 | Criar campanha com briefing curto | Solicitante conclui briefing mínimo; campanha reúne itens, artes e entregas sem duplicar cadastro mestre | B18 |
| B22 | Aprovar arte exata para produção | Produção recebe somente arte aprovada; alteração invalida aceite aplicável e mantém histórico | B20,B21 |
| B23 | Separar arte e autorização de despesa | Aprovação de marketing não compromete verba sem poder correspondente; liberação depende de todos os aceites | B08,B16,B22 |
| B24 | Unificar estados e transições | UI e backend usam mesmos estados; transição inválida ou versão desatualizada é negada | B20,B23 |
| B25 | Distribuir por PA e destino | Soma das distribuições bate com total; destino exige permissão; calendário distingue evento e entrega | B21,B24 |
| B26 | Controlar entrega parcial e divergência | Pedido parcial não aparece encerrado; falta, avaria e troca têm responsável e evidência | B25 |
| B27 | Conciliar documentos e recebimento | Documento tem acesso restrito e vínculo correto; divergência impede encerramento indevido | B26 |
| B28 | Registrar decisões na transação | Falha de auditoria crítica não resulta em decisão sem rastro; histórico não pode ser alterado pelo comprador | B08,B16,B24 |
| B29 | Entregar avisos com estado verdadeiro | Canal anunciado tem evidência de envio; repetição controlada não duplica mensagens; erro operacional é visível | B28 |
| B30 | Aplicar identidade e ativos autorizados | Ativos carregam sob controle do portal; combinações de texto atendem critérios aplicáveis e não alegam oficialidade sem base | B13 |
| B31 | Validar jornadas críticas por teclado e móvel | Solicitar, revisar e aprovar funcionam por teclado, ampliação e leitor de tela; evidências por cenário | B23,B26,B30 |
| B32 | Estabelecer saúde e suporte | Alerta dispara em falha simulada controlada; responsável e procedimento de recuperação testados | B05,B28,B29 |
| B33 | Substituir promessas por evidências | Nenhum percentual ou selo depende de fallback fixo; relatório identifica ambiente, data, commit e denominador | B10,B28 |
| B34 | Executar primeiro pedido acompanhado | Domínio produtivo, comprador real, aprovações, faturamento e recebimento comprovados; sem escrita no catálogo | B09,B11,B12,B17,B27,B31,B32,B37,B41,B42 |
| B37 | Validar hipóteses com compradores e marketing | Problemas observados, tempo e retrabalho registrados; prioridades revisadas com evidência | B13,B21 |
| B41 | Controlar documentos e links compartilhados | Anexo privado de outra cooperativa e link revogado são negados; diagnósticos internos não são assets públicos | B06,B09 |
| B42 | Definir produção e promessa de prazo | Prazo prometido usa condições atuais e confirmações; indisponibilidade gera alternativa ou revisão de proposta | B19,B22,B25 |

## P2

| ID | Entrega | Critério de aceite | Dependências |
|---|---|---|---|
| B35 | Repetir a partir do histórico | Preço vencido, produto inativo e arte alterada são sinalizados; histórico anterior permanece imutável | B20,B26,B34 |
| B36 | Validar exportação ERP/SISBR | Arquivo aceito em processo homologado; nenhuma promessa de API sem especificação e autorização | B27,B34 |
| B38 | Medir eficiência e prazo reais | Dashboard reconcilia com amostra de pedidos; ausência de dados aparece como não medido | B28,B34 |
| B39 | Onboardar segunda cooperativa | Isolamento e jornada passam sem fork por cooperativa; diferenças documentadas | B17,B34,B37 |
| B40 | Oferecer curadoria baseada em evidência | Sugestão informa critério e não inventa probabilidade; resultado observado orienta evolução | B18,B38 |
