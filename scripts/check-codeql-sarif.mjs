#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function markdown(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll(/\r?\n/g, ' ')
    .trim();
}

function ruleMap(run) {
  const rules = [
    ...(run.tool?.driver?.rules ?? []),
    ...(run.tool?.extensions ?? []).flatMap(extension => extension.rules ?? []),
  ];
  return new Map(rules.map(rule => [rule.id, rule]));
}

function findingFrom(result, rules) {
  const rule = rules.get(result.ruleId) ?? {};
  const location = result.locations?.[0]?.physicalLocation;
  const region = location?.region;
  const securitySeverity = result.properties?.['security-severity']
    ?? rule.properties?.['security-severity'];
  const severity = securitySeverity
    ? `security-severity ${securitySeverity}`
    : result.level ?? rule.defaultConfiguration?.level ?? 'não informada';

  return {
    rule: result.ruleId ?? rule.id ?? 'regra não informada',
    severity,
    file: location?.artifactLocation?.uri ?? 'local não informado',
    line: region?.startLine,
    message: result.message?.text ?? result.message?.markdown ?? 'sem descrição',
  };
}

export async function inspectSarif(directory) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  const files = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.sarif'))
    .map(entry => resolve(entry.parentPath, entry.name));

  if (files.length === 0) {
    throw new Error('CodeQL não gerou arquivo SARIF.');
  }

  const findings = [];
  let runCount = 0;

  for (const file of files) {
    const document = JSON.parse(await readFile(file, 'utf8'));
    const runs = document.runs ?? [];
    runCount += runs.length;
    for (const run of runs) {
      const rules = ruleMap(run);
      findings.push(...(run.results ?? []).map(result => findingFrom(result, rules)));
    }
  }

  if (runCount === 0) {
    throw new Error('CodeQL gerou SARIF sem execução analisável.');
  }

  return { files: files.length, runs: runCount, findings };
}

export function summaryMarkdown(report) {
  const lines = [
    '## CodeQL — resultado SARIF',
    '',
    `- Arquivos analisados: **${report.files}**`,
    `- Execuções: **${report.runs}**`,
    `- Achados: **${report.findings.length}**`,
  ];

  if (report.findings.length > 0) {
    lines.push(
      '',
      '> O workflow usa a suíte `security-extended`; por isso, qualquer achado bloqueia o merge até correção ou triagem explícita.',
      '',
      '| Regra | Severidade | Local | Mensagem |',
      '|---|---|---|---|',
      ...report.findings.slice(0, 50).map(finding => {
        const location = `${finding.file}${finding.line ? `:${finding.line}` : ''}`;
        return `| ${markdown(finding.rule)} | ${markdown(finding.severity)} | ${markdown(location)} | ${markdown(finding.message)} |`;
      }),
    );
    if (report.findings.length > 50) {
      lines.push('', `Mais ${report.findings.length - 50} achado(s) permanecem no artefato SARIF.`);
    }
  } else {
    lines.push('', 'Nenhum achado foi produzido pela análise `security-extended`.');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  // O diretório é deliberadamente fixo: o gate não aceita caminhos fornecidos
  // pela linha de comando e só lê a saída produzida pelo passo CodeQL anterior.
  const directory = resolve('sarif-results');
  const report = await inspectSarif(directory);
  const summary = summaryMarkdown(report);
  process.stdout.write(summary);

  if (report.findings.length > 0) {
    throw new Error(`CodeQL encontrou ${report.findings.length} achado(s) de segurança.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
