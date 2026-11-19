const fs=require('fs'),path=require('path'),cp=require('child_process');
const ts=require('/home/joaquim_ataides/hermes-workspaces/chat-h8111165/node_modules/typescript');
const root='/home/joaquim_ataides/hermes-workspaces/auditoria-planos-20261013';
const out='/home/joaquim_ataides/auditorias/sicoob-2026-10-13';
const files=cp.execFileSync('git',['ls-files','-z','src'],{cwd:root,encoding:'utf8'}).split('\0').filter(x=>/\.(tsx?|jsx?)$/.test(x));
const fileSet=new Set(files),edges={},routes=[],refs=[],missed=[];
function resolve(from,spec){
 let base=spec.startsWith('@/')?'src/'+spec.slice(2):spec.startsWith('.')?path.posix.normalize(path.posix.join(path.posix.dirname(from),spec)):null;
 if(!base)return null;
 for(const x of [base,...['.ts','.tsx','.js','.jsx','/index.ts','/index.tsx','/index.js'].map(ext=>base+ext)]) if(fileSet.has(x))return x;
 return null;
}
for(const f of files){
 const source=fs.readFileSync(path.join(root,f),'utf8');
 const ast=ts.createSourceFile(f,source,ts.ScriptTarget.Latest,true);edges[f]=[];
 function visit(n){
  let mod=null,kind=null;
  if(ts.isImportDeclaration(n)&&!n.importClause?.isTypeOnly){mod=n.moduleSpecifier;kind='import';}
  if(ts.isExportDeclaration(n)&&!n.isTypeOnly){mod=n.moduleSpecifier;kind='export';}
  if(ts.isCallExpression(n)&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||n.expression.getText(ast)==='require')){mod=n.arguments[0];kind='dynamic';}
  if(mod&&ts.isStringLiteralLike(mod)){
   const target=resolve(f,mod.text);if(target)edges[f].push(target);
   else if(mod.text.startsWith('@/')||mod.text.startsWith('.'))missed.push({arquivo:f,modulo:mod.text,kind});
  }
  if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='path'&&ts.isStringLiteralLike(n.initializer)&&f.startsWith('src/routes/'))routes.push({rota:n.initializer.text,arquivo:f,linha:ast.getLineAndCharacterOfPosition(n.getStart()).line+1});
  if(ts.isJsxAttribute(n)&&n.name.getText(ast)==='path'&&n.initializer&&ts.isStringLiteralLike(n.initializer))routes.push({rota:n.initializer.text,arquivo:f,linha:ast.getLineAndCharacterOfPosition(n.getStart()).line+1});
  if(ts.isStringLiteralLike(n)&&n.text.startsWith('/')&&!n.text.startsWith('//')&&n.text.length<150)refs.push({valor:n.text,arquivo:f,linha:ast.getLineAndCharacterOfPosition(n.getStart()).line+1});
  ts.forEachChild(n,visit);
 }
 visit(ast);
}
const reachable=new Set(),stack=['src/main.tsx'];
while(stack.length){const f=stack.pop();if(reachable.has(f))continue;reachable.add(f);for(const d of edges[f]||[])stack.push(d);}
const orphans=files.filter(f=>!reachable.has(f)&&!f.endsWith('.d.ts'));
const directMissing=[];
const matchers=routes.filter(x=>x.rota.startsWith('/')&&!x.rota.includes('*')).map(x=>new RegExp('^'+x.rota.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/:[^/]+/g,'[^/]+')+'/?$'));
for(const ref of refs){
 const p=ref.valor.split('?')[0].split('#')[0];
 if(reachable.has(ref.arquivo)&&!matchers.some(r=>r.test(p))&&!/\.[a-z]{2,5}$/.test(p))directMissing.push(ref);
}
for(const [name,value] of Object.entries({'grafo-importacoes':{files,edges,reachable:[...reachable],orphans,unresolved:missed},'rotas-registradas':routes,'destinos-candidatos-sem-rota':directMissing}))fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2));
console.log(JSON.stringify({arquivos_ts:files.length,alcancaveis:reachable.size,nao_alcancaveis_por_import:orphans.length,rotas:routes.length,destinos_candidatos:directMissing.length,limite:'Importação de tipos e barrels podem incluir falsos positivos; caminho literal não prova link ativo.'}));
