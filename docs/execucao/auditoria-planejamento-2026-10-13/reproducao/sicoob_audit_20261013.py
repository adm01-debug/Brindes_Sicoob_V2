from pathlib import Path
import csv, collections, hashlib, json, re, subprocess, zipfile, xml.etree.ElementTree as ET
import urllib.request, urllib.error

ROOT = Path('/home/joaquim_ataides/hermes-workspaces/auditoria-planos-20261013')
OUT = Path('/home/joaquim_ataides/auditorias/sicoob-2026-10-13')
OUT.mkdir(parents=True, exist_ok=True)
TEXT = OUT / 'textos-extraidos'
TEXT.mkdir(exist_ok=True)

def save(name, data):
    (OUT/name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')

def api(path, payload=None):
    token=(Path.home()/'.supabase/access-token').read_text().strip()
    req=urllib.request.Request('https://api.supabase.com/v1/projects/cfmzkthhgliqelozlmwu/'+path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=50) as response:
            return json.load(response)
    except urllib.error.HTTPError as err:
        return {'erro_http':err.code, 'detalhe':err.read().decode()[:200]}

def sql(name, query):
    data=api('database/query',{'query':query,'read_only':True})
    save(name+'.json',data)
    return data

def inventory():
    tracked=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT,text=True).strip('\0').split('\0')
    rows=[]; candidates=[]; refs=[]; docs=[]; problems=[]
    for file in tracked:
        p=ROOT/file; raw=p.read_bytes()
        row={'arquivo':file,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'extensao':p.suffix}
        is_doc=file.startswith('docs/') or p.suffix.lower() in ('.md','.txt','.pdf','.xlsx','.docx')
        txt=None
        try:
            if p.suffix.lower()=='.pdf':
                txt=subprocess.check_output(['pdftotext','-layout',str(p),'-'],text=True,stderr=subprocess.DEVNULL)
                row['metodo']='pdf-texto'
            elif p.suffix.lower()=='.xlsx':
                with zipfile.ZipFile(p) as z:
                    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    shared=[]
                    if 'xl/sharedStrings.xml' in z.namelist():
                        shared=[''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
                    chunks=[]
                    for sheet in sorted(n for n in z.namelist() if re.fullmatch(r'xl/worksheets/sheet\d+\.xml',n)):
                        chunks.append(sheet)
                        for rr in ET.fromstring(z.read(sheet)).findall('.//s:row',ns):
                            cells=[]
                            for c in rr.findall('s:c',ns):
                                v=c.find('s:v',ns)
                                value=v.text if v is not None else ''.join(c.itertext())
                                if c.get('t')=='s': value=shared[int(value)]
                                cells.append(value or '')
                            chunks.append('\t'.join(cells))
                    txt='\n'.join(chunks)
                row['metodo']='xlsx-xml-todas-planilhas'
            elif b'\0' not in raw[:8000]:
                txt=raw.decode('utf-8-sig')
                row['metodo']='texto-integral'
            else:
                row['metodo']='binario-inventariado'
        except Exception as err:
            row['metodo']='erro-extracao'; row['erro']=str(err); problems.append(row)
        if txt is not None:
            lines=txt.splitlines()
            row['linhas']=len(lines)
            row['checks_abertos']=len(re.findall(r'\[ \]',txt))
            row['checks_fechados']=len(re.findall(r'\[[xX]\]',txt))
            if is_doc:
                dest=TEXT/(file.replace('/','__')+'.txt')
                dest.write_text(txt)
                row['texto_extraido']=dest.name
                row['titulos']=[{'linha':i,'texto':line} for i,line in enumerate(lines,1) if re.match(r'^#{1,4}\s',line)]
                for i,line in enumerate(lines,1):
                    if re.search(r'\[ \]|penden|parcial|n[aã]o (implement|iniciad|conclu|execut)|TODO|FIXME|em breve|stub|mock|roadmap|backlog|fora d[eo] escopo|desativad|bloquead',line,re.I):
                        candidates.append({'arquivo':file,'linha':i,'texto':line[:1800]})
            elif file.startswith(('src/','supabase/functions/','supabase/migrations/','tests/','e2e/','.github/')):
                for i,line in enumerate(lines,1):
                    if re.search(r'\bTODO\b|\bFIXME\b|not implemented|n[aã]o implementad|em breve|status:\s*501|MOCK_|test\.skip|describe\.skip',line,re.I):
                        refs.append({'arquivo':file,'linha':i,'texto':line[:1500]})
        rows.append(row)
        if is_doc: docs.append(row)
    save('inventario-repositorio.json',rows)
    save('inventario-documentos.json',docs)
    save('marcadores-documentacao.json',candidates)
    save('marcadores-codigo.json',refs)
    save('erros-extracao.json',problems)
    summary={'sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'arquivos_versionados':len(rows),'docs':sum(x['arquivo'].startswith('docs/') for x in rows),'documentos_ampliados':len(docs),'metodos_docs':dict(collections.Counter(x['metodo'] for x in docs)),'marcadores_documentacao':len(candidates),'marcadores_codigo':len(refs),'erros':len(problems)}
    save('resumo-inventario.json',summary)
    print(json.dumps(summary,ensure_ascii=False))

if __name__=='__main__': inventory()
