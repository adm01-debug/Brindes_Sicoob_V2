## Auditoria Estratégica de Cor — Sistema Sicoob

> **Escopo:** análise de Product Design Strategy. Nenhuma linha de código será alterada nesta etapa. Entrega: diagnóstico, recomendações priorizadas e proposta de tokens.

---

### 1. Leitura da peça oficial Sicoob (referência anexa)

A peça "Poupança Premiada Sicoob 2024" estabelece a linguagem visual atual da marca:

| Papel | Cor (estimada) | HSL aprox. | Uso na peça |
|---|---|---|---|
| **Verde-marca dominante** | `#00AE9D` (teal vibrante) | `175 100% 34%` | Fundo principal, "respiração" da marca |
| **Verde escuro institucional** | `#003641` | `190 100% 13%` | Logo, base tipográfica, contraste |
| **Verde-lima ação** | `#7DB61C` | `82 73% 41%` | CTAs secundários, badges "Participe!" |
| **Amarelo-ouro destaque** | `#FFBB00` | `44 100% 50%` | Moedas, urgência, prêmios |
| **Roxo accent raro** | `#5C2D91` | `271 53% 37%` | Selo "Cada R$200 = 1 cupom" |
| **Off-white tipografia** | `#F8F8F8` | `0 0% 97%` | Texto sobre verde |

**Insight estratégico:** o Sicoob NÃO é uma marca verde-escura. Ele é uma marca **verde-teal vibrante** que usa o verde escuro `#003641` apenas como **âncora institucional** (logo + tipografia). Essa é a inversão crítica que o sistema atual erra.

---

### 2. Diagnóstico da paleta atual do sistema

#### 2.1 O que está correto ✅
- Tokens HSL semânticos bem estruturados (`--primary`, `--secondary`, `--accent`).
- Verde escuro `190 100% 13%` (= `#003641`) **fiel** ao institucional.
- Amarelo `#FFBB00` correto como destaque.
- Verde-lima `#7DB61C` correto como secundário.
- Dark mode separado, com glow tokens.

#### 2.2 Problemas críticos identificados ❌

**P1 — Ausência do verde-teal vibrante (a cor mais Sicoob que existe).**
A peça é dominada por `#00AE9D`. No sistema, esse tom **não existe como token**. O que se vê é uma paleta dominada por verde quase preto (`#003641`), que comunica peso bancário tradicional, não a energia cooperativa moderna que a marca Sicoob 2024 expressa.

**P2 — Hierarquia invertida.**
- Sicoob real: teal vibrante = 60% + escuro = 25% + amarelo = 10% + lima = 5%.
- Sistema atual: escuro = 70% + lima = 15% + amarelo = 10% + neutros = 5%.
- Resultado: interface percebida como "fintech genérica escura", não como Sicoob.

**P3 — Verde-lima sobrecarregado.**
`#7DB61C` está fazendo trabalho de "secundário + interactive + sidebar accent + success-light". Isso confunde papel e canibaliza o `--success` real. Na peça oficial, o lima aparece em ≤ 2 elementos.

**P4 — Cores hardcoded em fluxos Sicoob (26 ocorrências mapeadas).**
`OrderAuditTimeline`, `OrderPilotApprovalsTab`, `OrderPaymentsTab`, `LogisticsReportPage`, `SellerPanelPage`, `OrderDetailPage` usam `text-emerald-500/600`, `bg-amber-500`, `text-emerald-600` direto. Isso:
- Quebra dark mode (emerald-500 não muda).
- Impede troca de skin.
- Viola a regra de memória "no hardcoded colors".

**P5 — `--success` = verde puro genérico (`142 71% 45%`).**
Não dialoga com a paleta Sicoob. Resultado: badge "Aprovado" parece de outro produto.

**P6 — `--accent-foreground` no escuro com baixo contraste.**
`44 100% 50%` (amarelo) sobre `--accent-foreground: 210 40% 98%` (quase branco) — falha WCAG AA. Combinação correta seria amarelo sobre verde-escuro (já usado no light mode).

**P7 — Sombras sem identidade.**
`--shadow-glow-warning` usa `38 92% 50%` (laranja). O Sicoob não tem laranja. Deveria ser amarelo `44 100% 50%`.

**P8 — Roxo do selo "1 cupom" não tem token.**
A peça usa um roxo `#5C2D91` como cor "premium/recompensa". O sistema não tem token equivalente. Oportunidade para `--reward` ou `--premium`.

**P9 — Charts pouco Sicoob.**
`--chart-1: 24 100% 50%` (laranja Sicoob-not). Os 5 chart slots não foram pensados para harmonizar com a paleta institucional.

**P10 — Roles do Kanban Sicoob sem cor própria.**
`fulfillment_status` (`in_production`, `in_separation`, `in_transit`, `delivered`, `completed`, `cancelled`) usa cores ad-hoc por arquivo. Não há `--status-production`, `--status-transit`, etc.

---

### 3. Recomendações estratégicas priorizadas

#### Onda 1 — Foundation (alto impacto, baixo risco)

**R1.** Introduzir o **verde-teal Sicoob 2024** como `--brand-teal`:
- Light: `175 100% 34%` (#00AE9D)
- Dark: `175 90% 38%`
- Foreground: `0 0% 100%`
- Hover: `175 100% 28%`

**R2.** Reposicionar `--primary`:
- Manter `#003641` como `--primary` (institucional/headers).
- Adicionar `--brand` apontando para o teal vibrante (CTAs principais, hero, ações de conversão).
- Documentar: "primary = institucional, brand = ação".

**R3.** Criar `--success-sicoob`:
- Light: `155 60% 38%` (teal-success, harmoniza com brand-teal).
- Substituir `--success` puro genérico em fluxos Sicoob.

**R4.** Criar `--reward` (roxo institucional do selo):
- Light: `271 53% 37%` (#5C2D91)
- Dark: `271 60% 55%`
- Uso: badges de promoção, pontos Coopera, cupons.

#### Onda 2 — Tokens semânticos do domínio Sicoob

**R5.** Criar tokens de status do workflow:
```
--status-production: 38 92% 50%   (amarelo trabalho)
--status-separation: 200 85% 55%  (azul logística)
--status-transit: 271 53% 47%     (roxo movimento)
--status-delivered: 155 60% 38%   (success-sicoob)
--status-completed: 190 100% 13%  (primary-institucional)
--status-cancelled: 0 72% 51%     (destructive)
```
Cada um com `-foreground` e `-bg` (variante 10% opacity).

**R6.** Tokens de papel hierárquico:
```
--role-dev: 271 53% 47%        (roxo)
--role-supervisor: 190 100% 13% (verde-escuro)
--role-gerente-pa: 175 100% 34% (brand-teal)
--role-vendedor: 82 73% 41%    (verde-lima)
--role-agente: 220 12% 46%     (neutro)
```

#### Onda 3 — Limpeza e governance

**R7.** Migrar 26 ocorrências hardcoded `text-emerald-*`/`bg-amber-*` para tokens semânticos (`text-success`, `bg-warning`, `text-status-delivered`, etc.).

**R8.** Configurar Tailwind config para expor:
- `bg-brand`, `text-brand`, `border-brand`
- `bg-reward`, `text-reward`
- `bg-status-{production|separation|transit|delivered|completed|cancelled}`

**R9.** Atualizar `--chart-*` para harmonizar com paleta Sicoob:
```
--chart-1: 175 100% 34% (teal-brand)
--chart-2: 190 100% 13% (primary)
--chart-3: 44 100% 50%  (amarelo)
--chart-4: 82 73% 41%   (lima)
--chart-5: 271 53% 47%  (roxo-reward)
```

**R10.** Corrigir `--accent-foreground` no dark (`44 100% 50%` deve ter foreground `190 100% 13%`, nunca branco).

#### Onda 4 — Refinamento e documentação

**R11.** Criar página interna `/admin/design-system/colors` listando tokens, contraste WCAG e exemplos de uso.

**R12.** Adicionar variantes "soft" para fundos sutis:
- `--brand-soft: 175 100% 34% / 0.08`
- `--reward-soft: 271 53% 47% / 0.08`
- (já existe padrão `bg-amber-500/10` no código — precisa de equivalente tokenizado)

**R13.** Validar contraste WCAG AA em todas as combinações foreground/background. Pontos suspeitos:
- `--brand-teal` sobre `--background` em texto pequeno → calcular.
- `--accent` (amarelo) sobre `--surface` light → texto escuro obrigatório.
- `--reward` em modo dark sobre `--background` → checar legibilidade.

**R14.** Definir regras de **uso percentual por tela** (60/30/10):
- 60% neutros (background, surface).
- 30% primary OU brand (não ambos dominando).
- 10% accent (amarelo) + reward (roxo) somados.

---

### 4. Tokens propostos (versão final consolidada)

```
:root {
  /* INSTITUCIONAL */
  --primary: 190 100% 13%;        /* #003641 — logo, headers */
  --primary-hover: 190 100% 10%;
  --primary-foreground: 0 0% 100%;

  /* MARCA / AÇÃO (NOVO) */
  --brand: 175 100% 34%;          /* #00AE9D — CTAs, hero */
  --brand-hover: 175 100% 28%;
  --brand-glow: 175 100% 42%;
  --brand-soft: 175 100% 34% / 0.08;
  --brand-foreground: 0 0% 100%;

  /* SECUNDÁRIO */
  --secondary: 82 73% 41%;        /* #7DB61C — uso pontual */
  --secondary-foreground: 190 100% 13%;

  /* ACCENT */
  --accent: 44 100% 50%;          /* #FFBB00 — destaques */
  --accent-foreground: 190 100% 13%;
  --accent-soft: 44 100% 50% / 0.12;

  /* REWARD (NOVO) */
  --reward: 271 53% 37%;          /* #5C2D91 — pontos, cupons */
  --reward-hover: 271 53% 30%;
  --reward-soft: 271 53% 37% / 0.10;
  --reward-foreground: 0 0% 100%;

  /* SUCCESS HARMONIZADO */
  --success: 155 60% 38%;
  --success-soft: 155 60% 38% / 0.12;

  /* STATUS DO WORKFLOW SICOOB */
  --status-production: 38 92% 50%;
  --status-separation: 200 85% 55%;
  --status-transit: 271 53% 47%;
  --status-delivered: 155 60% 38%;
  --status-completed: 190 100% 13%;
  --status-cancelled: 0 72% 51%;
}
```

---

### 5. Critérios de sucesso

- Zero `text-emerald-*`, `bg-amber-*` hardcoded em `src/pages/sicoob/**` e `src/components/sicoob/**`.
- 100% dos badges de status renderizando via `bg-status-{X}/10 text-status-{X}`.
- Contraste WCAG AA validado em todos os pares foreground/background.
- Página de demonstração `/admin/design-system/colors` publicada.
- Memória do projeto atualizada com a nova policy de cor (`mem://design/sicoob-color-system`).
- Hero, CTAs principais e tela de login refletindo o **teal vibrante**, não o verde-quase-preto.

---

### 6. Riscos e mitigações

- **Risco:** mudança brusca de identidade percebida pelos usuários atuais.
  - **Mitigação:** rollout em duas fases (Onda 1 + 2 primeiro, validação visual antes de Onda 3).
- **Risco:** quebrar contraste em telas dark sensíveis.
  - **Mitigação:** auditoria WCAG automatizada antes do merge.
- **Risco:** divergência futura entre marca atualizada e tokens.
  - **Mitigação:** memória `sicoob-color-system` + página de governance.

---

### 7. Próximo passo (após aprovação)

Confirmar:
1. Aceita o reposicionamento `primary = institucional`, `brand = ação`?
2. Inclui o **roxo `--reward`** ou prefere ficar só com 4 cores (sem o roxo do selo)?
3. Onda 1 imediata ou prefere começar pela criação dos tokens de status (Onda 2)?
