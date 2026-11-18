# E030 — Portão G1: Checklist de Conformidade

**Fase:** F03 — Conformidade, LGPD e Regras do WhatsApp  
**Data:** 2026-10-16  
**Versão:** 1.0  
**Status:** Aguardando preenchimento e aprovações

---

> **O Portão G1 deve ser aprovado ANTES de instalar qualquer webhook ou tabela em produção.**  
> **Condição de passe: todos os itens marcados com check e aprovações assinadas.**

---

## LGPD

- [ ] RIPD simplificado (E022) revisado e aprovado por Joaquim
- [ ] Aviso de privacidade (E025) aprovado por Joaquim
- [ ] Aviso publicado no perfil do WhatsApp Business
- [ ] Mecanismo de opt-out (E023 + E027) implementado e testado no sandbox
- [ ] Política de retenção (E024) revisada por Joaquim
- [ ] Job de limpeza pg_cron configurado e testado no sandbox
- [ ] DPA da Anthropic aceito digitalmente por Joaquim (evidência arquivada)
- [ ] DPA dos demais provedores identificados e aceitos (se aplicável)
- [ ] Encarregado (DPO) nomeado formalmente e contato publicado
- [ ] Registro de operações de tratamento criado (art. 37 LGPD)

## WhatsApp / Meta

- [ ] Confirmado por teste: a IA nunca envia mensagem sem ação humana explícita do vendedor
- [ ] Número `wpp2` tem número reserva configurado e testado
- [ ] ChannelAdapter abstrai a Evolution API (troca para Cloud API não requer reescrita)
- [ ] Plano de resposta a ban documentado (E021 seção 6) e revisado
- [ ] Monitoramento de sinais de ban configurado (alertas ativos)
- [ ] Conta WhatsApp Business com perfil atualizado (incluindo aviso de IA)

## Segurança

- [ ] RLS habilitado e testado em todas as tabelas `copilot_*` (E029 controle C1)
- [ ] Pseudonimização antes do LLM implementada e testada com casos reais (E029 controle C2)
- [ ] Filtro de PII no prompt implementado e validado (E029 controle C3)
- [ ] Nenhum CPF, CNPJ ou dado bancário aparece nos logs de prompts
- [ ] Rate limiting de chamadas LLM configurado (max 10/min/conversa)
- [ ] TLS verificado em todas as conexões externas
- [ ] Acesso ao banco de produção restrito a IPs autorizados

## Trilha de Auditoria

- [ ] Tabela `copilot_events` criada com schema correto (E028)
- [ ] Todos os eventos obrigatórios sendo registrados (opt-out, LLM call, retenção)
- [ ] Checksums de integridade configurados
- [ ] Relatório de auditoria testado (query de histórico por cooperado funciona)

## Operacional

- [ ] Vendedores treinados: o que é o Sussurro, como funciona o opt-out, o que NÃO delegar à IA
- [ ] Documentação interna disponível para a equipe de vendas
- [ ] Procedimento de resposta a solicitação de titular (LGPD art. 18) documentado
- [ ] Contato do DPO publicado e funcional

---

## Aprovações

| Papel | Nome | Assinatura | Data |
|-------|------|-----------|------|
| Responsável pelo projeto (Promo Brindes) | Joaquim | _______________ | ___/___/______ |
| Responsável pelo WhatsApp | ___________ | _______________ | ___/___/______ |
| Encarregado (DPO) | ___________ | _______________ | ___/___/______ |

---

## Condições de Falha (impedem o G1)

Se qualquer um dos itens abaixo não estiver resolvido, o G1 **não passa**:

1. IA consegue enviar mensagem sem ação do vendedor → **BLOQUEADOR CRÍTICO**
2. Opt-out não funciona (cooperado envia PARAR e sugestão continua aparecendo) → **BLOQUEADOR CRÍTICO**
3. CPF ou dado bancário aparece em prompt enviado ao LLM → **BLOQUEADOR CRÍTICO**
4. RLS não habilitado (vendedor consegue ver conversa de outro vendedor) → **BLOQUEADOR CRÍTICO**
5. DPA da Anthropic não aceito formalmente → **BLOQUEADOR ALTO**

---

## Histórico de Revisões do Checklist

| Versão | Data | Alteração | Autor |
|--------|------|-----------|-------|
| 1.0 | 2026-10-16 | Versão inicial — criado na F03 | Claude Code (Sussurro) |
