"""Relaciona as 32 melhorias do benchmark ao plano original e à revisão."""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PASTA = RAIZ/'docs/execucao/revisao-implementacao'
fonte = (RAIZ/'docs/pesquisa/2026-09-11/benchmark-promo-gifts-v4.md').read_text().splitlines()
inicio = next(i for i,s in enumerate(fonte) if '] Expor histórico de busca' in s)
fim = next(i for i,s in enumerate(fonte) if '] Personalização do catálogo por cooperativa' in s)
acoes = [s for s in fonte[inicio:fim+1] if s.startswith('- [')]
notas = [
('E023 E044 E025','Parcial','UI pronta; histórico global precisa de isolamento e limpeza entre contas. A09.'),
('E024 E043','Local delimitado','Atalhos por orçamento unitário implementados; não representam custo entregue firme.'),
('E032 E043','Local delimitado','Trilhos móveis compactos implementados; sem homologação com aparelhos reais.'),
('E003','Local delimitado','Contrato local bloqueia escrita; privilégio mínimo da identidade remota não confirmado.'),
('E003 E048 E086','Parcial','Seis campos removidos; setup_cost/unit_cost persistem. A10.'),
('E017 E018 E059 E061','Parcial','Verba/aprovação transacionais; versionamento e envio integral ainda incompletos. A07/A15.'),
('E026 E087','Local delimitado','Noindex, robots e retirada de sitemap aplicados no código revisado.'),
('E003 E096','Validação externa','ACL da identidade no mestre não foi inspecionada administrativamente.'),
('E015 E091','Validação externa','Sem jornada autenticada real comprovada; E2E remoto falha. A14.'),
('E008 E017 E065 E069','Validação externa','Documentos históricos não substituem política vigente e aceite local.'),
('E081','Parcial','Axe em amostras locais; teclado, zoom e leitor da compra inteira não homologados.'),
('E007 E043 E073','Validação externa','SLA e responsabilidade por dados comerciais ainda não confirmados.'),
('E035 E043 E046','Parcial','Cores existentes; card por variante e validade de estoque precisam de contrato íntegro.'),
('E025 E050','Parcial','Store de vistos existe, mas chave global; revisar usuário, organização e logout.'),
('E049 E060','Parcial','Comparador de produtos existe; decisão institucional exige dimensões e cotações equivalentes.'),
('E027 E055 E057','Parcial','Há autosave de kit; falha silenciosa reproduzida. Recuperação de orçamento integral pendente. A04.'),
('E043 E046 E073','Parcial','Componentes de atualidade existem; timestamp e reconfirmação não uniformes.'),
('E051 E055','Parcial','Templates de kits existem; curadoria por orçamento precisa de validação comercial e estoque.'),
('E047 E055','Não demonstrado','Cálculos clientes não substituem validação completa no servidor.'),
('E032 E057','Parcial','Kit possui resumos responsivos; cobertura da solicitação completa e foco ainda parcial.'),
('E059 E068 E070','Parcial','Históricos existem em modelos distintos; linha canônica completa ausente.'),
('E013 E050 E065','Parcial','Tokens, validade e revogação existem; escopo e decisão formal não homologados.'),
('E009 E089','Parcial','Persistem números fixos, projeção artificial e contador aleatório. A06.'),
('E084 E098','Parcial','Lighthouse local/CI mede login; domínio de homologação e campo ainda pendentes.'),
('E022 E044 E089','Parcial','Sugestões existentes; histórico e regras explicáveis não validados pelo público.'),
('E073 E089','Não demonstrado','Forecast na interface não comprova modelo validado nem intervalo de confiança.'),
('E079','Parcial','Duplicação existe; botão usa legado, rota inválida e preços antigos. A03.'),
('E051 E052','Parcial','Campanha genérica existe; modelo por cooperativa com marcos/destinos incompleto.'),
('E051 E055','Não demonstrado','Não foi demonstrado assistente de briefing institucional com dados e restrições suficientes.'),
('E053 E054 E065','Parcial','Mockups existentes; prova técnica e versão imutável vinculada ao aceite não asseguradas.'),
('E056 E074 E076 E078','Não demonstrado','Consolidação não equivale a distribuição por destino e conciliação. A16.'),
('E008 E025 E099','Parcial','Membership existe; política/curadoria por cooperativa e troca segura ainda incompletas. A08.'),
]
assert len(acoes) == len(notas) == 32
linhas=[]
for i,(acao,(etapas,situacao,diagnostico)) in enumerate(zip(acoes,notas),1):
    linhas.append({'id':f'B{i:02d}','melhoria':acao.split('] ',1)[1],'etapas':etapas.split(),'situacao':situacao,'diagnostico':diagnostico,'conclusao_formal':False})
(PASTA/'benchmark-32-melhorias.json').write_text(json.dumps(linhas,ensure_ascii=False,indent=2)+'\n')
md=['# Revisão das 32 melhorias do benchmark Promo Gifts', '', 'As marcas anteriores eram um resumo de execução local. Três foram reabertas: histórico isolado, ocultação de custos e atomicidade integral. Componentes herdados existentes não foram classificados como ausentes apenas por ainda estarem desmarcados.', '', '| ID | Melhoria | Plano | Situação | Diagnóstico |','|---|---|---|---|---|']
md += ['| '+' | '.join([r['id'],r['melhoria'],' '.join(r['etapas']),r['situacao'],r['diagnostico']])+' |' for r in linhas]
(PASTA/'benchmark-32-melhorias.md').write_text('\n'.join(md)+'\n')
print('32 melhorias do benchmark revisadas e relacionadas ao plano.')
