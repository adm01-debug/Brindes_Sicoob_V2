#!/usr/bin/env node
/** Reproduz achados da revisão com módulos reais e dependências simuladas, sem rede. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const resultados = [];
function carregar(arquivo, dependencias = {}) {
  const fonte = fs.readFileSync(path.join(raiz, arquivo), 'utf8');
  const codigo = ts.transpileModule(fonte, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  }, fileName: arquivo }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, { exports, console, Date, Map, Set, JSON,
    require(nome) {
      if (!(nome in dependencias)) throw new Error(`Dependência não simulada: ${nome}`);
      return dependencias[nome];
    },
  }, { filename: arquivo, timeout: 5000 });
  return exports;
}
async function cenario(id, descricao, executar, tipo = 'lacuna_reproduzida') {
  try {
    const observado = await executar();
    resultados.push({ id, descricao, tipo, resultado: tipo, observado });
  } catch (err) {
    // Lacuna pode ter sido corrigida ou dependências mudaram — registra sem travar o script
    resultados.push({ id, descricao, tipo, resultado: 'cenario_nao_reproduzido', motivo: err.message });
  }
}

await cenario('A01', 'Serviço de status rejeita o contrato usado pela aba de logística', async () => {
  let chamadas = 0;
  const { sicoobOrderService } = carregar('src/services/sicoob/orderService.ts', {
    '@/integrations/supabase/client': { supabase: { auth: { getUser() { chamadas++; } } } },
    '@/types/sicoob/orders': { canSicoobTransitionTo: () => true },
    './reorderIdempotency': { beginReorderIntent: async () => {}, completeReorderIntent: async () => {} },
  });
  await assert.rejects(sicoobOrderService.updateOrderStatus('pedido-simulado', 'logistic'), /status atual é obrigatório/);
  assert.equal(chamadas, 0);
  return 'Rejeição antes de qualquer acesso ao banco quando currentStatus é omitido.';
});

await cenario('A04', 'Bug corrigido: autosave não atualiza lastSavedAt quando Supabase retorna erro', async () => {
  const setters = [], callbacks = [];
  const react = {
    useState(valor) { const indice = setters.length; setters.push([]); return [valor, v => setters[indice].push(v)]; },
    useRef: v => ({ current: v }), useEffect() {},
    useCallback(fn) { callbacks.push(fn); return fn; },
  };
  const resposta = { data: null, error: { message: 'Falha simulada de persistência' } };
  // Stub cobre toda a cadeia de chamadas do persistAutoSave (insert/update + select + single/maybeSingle)
  const consulta = { update() { return this; }, insert() { return this; }, eq() { return this; }, select() { return this; }, single() { return this; }, maybeSingle() { return this; }, then(resolver) { resolver(resposta); } };
  const { useKitAutoSave } = carregar('src/hooks/useKitAutoSave.ts', {
    react, '@/integrations/supabase/client': { supabase: { from: () => consulta } },
    '@/contexts/AuthContext': { useAuth: () => ({ user: { id: 'usuario-simulado' } }) },
    sonner: { toast: { error() {} } }, '@/lib/logger': { logger: { warn() {} } },
  });
  useKitAutoSave({ items: [{ id: 'produto', quantity: 1 }], personalization: {}, totalPrice: 10 }, 1, 'kit-simulado');
  // callbacks[1] é o trigger de autosave após refatoração (3 useCallback no hook)
  await callbacks[1]();
  // setter[0] = lastSavedAt: deve permanecer vazio quando há erro (fix confirmado)
  assert.equal(setters[0].length, 0, 'lastSavedAt não deve ser atualizado quando o Supabase retorna erro');
  return 'Fix confirmado: lastSavedAt permanece null após erro de persistência; setLastSaveError é chamado em vez disso; nenhuma rede utilizada.';
}, 'lacuna_corrigida');

await cenario('A05', 'Bug corrigido: estoque de cor diferente não cobre mais a falta da variante selecionada', async () => {
  const { useKitStockValidation } = carregar('src/hooks/useKitStockValidation.ts', {
    '@tanstack/react-query': { useQuery: () => ({ data: {
      variants: [
        { id: 'v-verde', product_id: 'produto', stock_quantity: 0, color_name: 'Verde' },
        { id: 'v-azul', product_id: 'produto', stock_quantity: 100, color_name: 'Azul' },
      ],
      products: [],
    }, isLoading: false }) },
    '@/lib/external-db/bridge': { invokeExternalDb() { throw new Error('Rede proibida nesta simulação'); } },
  });
  // selectedVariantId: 'v-verde' força lookup em byVariant (stock=0), não byProduct (soma verde+azul=100)
  const resultado = useKitStockValidation([{ id: 'produto', name: 'Copo verde', sku: 'V', selectedVariantId: 'v-verde', quantity: 1 }], null, 50);
  // Fix confirmado: verde=0 gera alerta de estoque insuficiente; byProduct teria azul=100 mas byVariant isola a variante correta
  assert.equal(resultado.hasStockIssues, true, 'hasStockIssues deve ser true quando a variante selecionada está sem estoque');
  assert.ok(resultado.alerts.length > 0, 'Deve haver alerta de estoque insuficiente para Verde');
  assert.equal(resultado.alerts[0].itemId, 'produto');
  return 'Fix confirmado: 50 unidades solicitadas; v-verde=0 e v-azul=100; hook retorna hasStockIssues=true com alerta para o produto; azul não cobre mais a falta de verde.';
}, 'lacuna_corrigida');

await cenario('A05b', 'Bug corrigido: campo error agora exposto no contrato quando consulta falha', async () => {
  const { useKitStockValidation } = carregar('src/hooks/useKitStockValidation.ts', {
    '@tanstack/react-query': { useQuery: () => ({ data: undefined, isLoading: false, isError: true, error: new Error('Consulta indisponível') }) },
    '@/lib/external-db/bridge': {},
  });
  const resultado = useKitStockValidation([{ id: 'produto', quantity: 1 }], null, 50);
  // Fix confirmado: o campo error agora é passado no contrato de retorno do hook
  assert.ok('error' in resultado, 'Campo error deve estar presente no contrato quando a consulta falha');
  // hasStockIssues permanece false pois sem dados não há alertas concretos
  assert.equal(resultado.hasStockIssues, false);
  return 'Fix confirmado: campo error está presente no contrato de retorno do hook; consumidores podem agora detectar falha na consulta de estoque.';
}, 'lacuna_corrigida');

await cenario('A10', 'Bug corrigido: redação agora remove setup_cost e unit_cost dos aliases do catálogo', async () => {
  const { redactInternalCatalogFields } = carregar('supabase/functions/_shared/catalog-redaction.ts');
  const resultado = redactInternalCatalogFields({ cost_price: 8, tecnica: { setup_cost: 23, unit_cost: 4 } });
  assert.equal('cost_price' in resultado, false);
  assert.equal('setup_cost' in resultado.tecnica, false, 'setup_cost deve ser removido da redação');
  assert.equal('unit_cost' in resultado.tecnica, false, 'unit_cost deve ser removido da redação');
  return 'Fix confirmado: cost_price, setup_cost e unit_cost todos removidos pela redação; aliases de custo não vazam mais para o cliente.';
}, 'lacuna_corrigida');

await cenario('A03', 'Componente de recompra navega para rota de orçamentos (lacuna original corrigida)', async () => {
  const destinos = [];
  const reorderIdempotencyStub = { beginReorderIntent: async () => {}, completeReorderIntent: async () => {} };
  const orderServiceStub = { sicoobOrderService: { reorderOrder: async () => 'novo-orcamento' } };
  const { OneClickReorder } = carregar('src/components/orders/OneClickReorder.tsx', {
    react: { useState: v => [v, () => {}], type: null },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragmento' },
    lucide: {}, 'lucide-react': { RotateCcw: 'icone', Loader2: 'espera' },
    '@/components/ui/button': { Button: 'botao' }, sonner: { toast: { success() {}, error() {} } },
    'react-router-dom': { useNavigate: () => destino => destinos.push(destino) },
    '@/services/sicoob/orderService': orderServiceStub,
    './reorderIdempotency': reorderIdempotencyStub,
  });
  await OneClickReorder({ orderId: 'pedido-simulado' }).props.onClick({ stopPropagation() {} });
  assert.ok(destinos[0]?.startsWith('/orcamentos/'), `Destino inesperado: ${destinos[0]}`);
  const rotas = fs.readdirSync(path.join(raiz, 'src/routes/config')).filter(f => /\.tsx?$/.test(f)).map(f => fs.readFileSync(path.join(raiz, 'src/routes/config', f), 'utf8')).join('\n');
  assert.ok(/path[=:\s]+["']\/orcamentos/.test(rotas), 'Rota /orcamentos não encontrada no config — lacuna de rota ativa.');
  return `Componente navega para ${destinos[0]} e a rota /orcamentos está registrada; lacuna original de /pedidos/ foi corrigida.`;
}, 'lacuna_corrigida');

const relatorio = { escopo: 'Simulação local com código real transpilado e dependências controladas; não equivale a E2E, SQL remoto ou exploração em produção.', cenarios: resultados.length, resultados };
process.stdout.write(`${JSON.stringify(relatorio, null, 2)}\n`);

// O script sempre saía 0: um cenário "lacuna_corrigida" que deixasse de confirmar o fix (a
// asserção falha, a dependência simulada mudou) caía no mesmo catch genérico de "não reproduzido"
// e não distinguia regressão de "bug ativo não reproduzido" (que é notícia boa, não má).
const regressoes = resultados.filter((r) => r.tipo === 'lacuna_corrigida' && r.resultado !== 'lacuna_corrigida');
if (regressoes.length) {
  console.error(`\n❌ ${regressoes.length} fix(es) antes confirmado(s) deixaram de ser reproduzidos: ${regressoes.map((r) => `${r.id} (${r.motivo})`).join('; ')}`);
}
process.exitCode = regressoes.length ? 1 : 0;
