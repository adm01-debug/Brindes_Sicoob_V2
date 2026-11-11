/**
 * Trava de processo único por PID (sem IA, sem rede).
 *
 * `mkdirSync(lockDir)` seguido de `writeFileSync(lockDir/pid, ...)` em dois passos deixa uma
 * janela entre criar a trava e gravar o pid: um 2º processo vê a trava já existindo, lê o
 * arquivo de pid (que ainda não existe nessa janela), conclui pid=0/morta e apaga a trava do 1º
 * antes dele terminar de escrever — os dois seguem rodando como donos ao mesmo tempo. Usar
 * `writeFileSync(lockFile, pid, { flag: 'wx' })` cria o arquivo E grava o pid em UMA chamada só
 * (O_CREAT|O_EXCL do SO), sem essa janela.
 */
import { writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';

/**
 * @param {string} lockFile caminho do arquivo de trava
 * @returns {{ busy: true, pid: number|null, message: string } | { busy: false, release: () => void }}
 */
export function acquireLock(lockFile) {
  for (let i = 0; i < 2; i++) {
    try {
      writeFileSync(lockFile, String(process.pid), { flag: 'wx' });
      return { busy: false, release: () => { try { rmSync(lockFile, { force: true }); } catch { /* já removida */ } } };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      const pid = Number(existsSync(lockFile) ? readFileSync(lockFile, 'utf8') : 0);
      let alive = false;
      try { if (pid) { process.kill(pid, 0); alive = true; } } catch { /* morto */ }
      if (alive) return { busy: true, pid, message: `já está rodando (pid ${pid}).` };
      try { rmSync(lockFile, { force: true }); } catch { /* removida por outro processo nesse meio-tempo */ }
    }
  }
  return { busy: true, pid: null, message: 'não foi possível obter a trava.' };
}
