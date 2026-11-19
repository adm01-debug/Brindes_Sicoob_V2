const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('/home/joaquim_ataides/hermes-workspaces/chat-h8111165/node_modules/typescript');
const raiz = '/home/joaquim_ataides/hermes-workspaces/auditoria-planos-20261013';
const cache = new Map();
function carregar(nome, origem=raiz) {
  let alvo = nome.startsWith('@/') ? path.join(raiz,'src',nome.slice(2)) : path.resolve(origem,nome);
  alvo = [alvo,alvo+'.ts',alvo+'.tsx',path.join(alvo,'index.ts')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
  if(!alvo) throw new Error('Módulo local ausente: '+nome);
  if(cache.has(alvo)) return cache.get(alvo).exports;
  const modulo={exports:{}}; cache.set(alvo,modulo);
  const codigo=ts.transpileModule(fs.readFileSync(alvo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(codigo,{module:modulo,exports:modulo.exports,require:n=>carregar(n,path.dirname(alvo)),console,Set,Map,URLSearchParams});
  return modulo.exports;
}
const {applyProductFilters,countActiveFilters}=carregar('@/pages/filters/filters-page-helpers');
const arrays='colorGroups colorVariations colorNuances colors categories suppliers publicoAlvo datasComemorativas endomarketing ramosAtividade segmentosAtividade materialGroups materialTypes materiais techniques tags gender sizes'.split(' ');
const flags='inStock isKit featured isNew hasPersonalization hasCommercialPackaging'.split(' ');
const base={...Object.fromEntries(arrays.map(k=>[k,[]])),...Object.fromEntries(flags.map(k=>[k,false])),priceRange:[0,9999],minStock:0,sortBy:'name',search:''};
const produtos=[{id:'a',name:'Caneta laser',sku:'a',price:10,stock:20,materials:[],tags:{},featured:true,isNew:true,hasPersonalization:true,gender:'feminino',sizes:['M'],techniques:['laser']},{id:'b',name:'Bloco simples',sku:'b',price:20,stock:20,materials:[],tags:{},featured:false,isNew:false,hasPersonalization:false,gender:'masculino',sizes:['G'],techniques:['silk']}];
const casos=[['techniques',['laser']],['tags',['exclusiva']],['gender',['feminino']],['sizes',['M']],['featured',true],['isNew',true],['hasPersonalization',true],['search','Caneta']];
const resultados=casos.map(([chave,valor])=>{
 const filters={...base,[chave]:valor};
 const result=applyProductFilters({filters,products:produtos,materialIds:new Set(),categoryIds:new Set(),colorIds:new Set(),hasMaterialFilter:false,hasCategoryFilter:false,hasColorFilter:false,loadingMaterial:false,loadingCategory:false,loadingColor:false,sortBy:'name',skipSort:false});
 return {filtro:chave,contagem_ativos:countActiveFilters(filters),produtos_devolvidos:result.map(x=>x.id),observacao:chave==='search'?'Controle positivo: busca reduz conjunto':'Filtro anunciado não altera o conjunto neste cenário'};
});
const saida={metodo:'Funções reais transpiladas em memória, inclusive sortProducts; produtos sintéticos, sem rede',resultados};
fs.writeFileSync('/home/joaquim_ataides/auditorias/sicoob-2026-10-13/simulacao-filtros.json',JSON.stringify(saida,null,2)+'\n');
console.log(JSON.stringify(saida));
