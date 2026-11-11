"""Sincronização robusta com o servidor final das imagens oficiais PostgreSQL.

Importado por todas as simulações de `scripts/qa/`. Além de esperar o Postgres
descartável, este módulo decide o que acontece quando não há Docker:

- no CI (`CI`/`GITHUB_ACTIONS`), a simulação é uma prova obrigatória: sem Docker
  ela FALHA (exit 1). Sair 0 ali deixava o job verde sem afirmar nada;
- fora do CI, sai 0 com aviso — máquina local sem Docker não trava o fluxo;
- `QA_ALLOW_SKIP=1` libera o pulo também no CI (decisão explícita);
- `QA_REQUIRE_DOCKER=1` exige Docker também fora do CI.
"""
import os
import signal
import subprocess
import sys
import threading
import time

DOCKER_INFO_TIMEOUT_SECONDS = 30
_TRUTHY = {"1", "true", "yes"}


def _flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in _TRUTHY


def docker_is_mandatory() -> bool:
    """A simulação pode ser pulada sem Docker? No CI, não — salvo opt-in explícito."""
    if _flag("QA_ALLOW_SKIP"):
        return False
    return _flag("QA_REQUIRE_DOCKER") or _flag("CI") or _flag("GITHUB_ACTIONS")


def _docker_unavailable(reason: str) -> None:
    if docker_is_mandatory():
        print(
            f"❌ {reason} — a simulação é obrigatória neste ambiente e NÃO foi executada. "
            "Para pular de propósito, defina QA_ALLOW_SKIP=1.",
            file=sys.stderr,
        )
        sys.exit(1)
    print(
        f"⚠️  {reason} — script ignorado (ambiente local sem Docker; nada foi verificado).",
        file=sys.stderr,
    )
    sys.exit(0)


def _require_docker() -> None:
    """Sem daemon Docker acessível: falha onde a prova é obrigatória, pula onde não é."""
    try:
        result = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            timeout=DOCKER_INFO_TIMEOUT_SECONDS,
            text=True,
        )
    except FileNotFoundError:
        _docker_unavailable("Docker não encontrado no PATH")
    except subprocess.TimeoutExpired:
        _docker_unavailable(
            f"Docker daemon não respondeu em {DOCKER_INFO_TIMEOUT_SECONDS}s"
        )
    else:
        if result.returncode != 0:
            _docker_unavailable(
                f"Docker CLI falhou: {result.stderr.strip() or result.stdout.strip()}"
            )


def _exit_on_sigterm(signum, _frame) -> None:
    # SIGTERM (cancelamento do job, `timeout`) não dispara `finally` sozinho: sem isto
    # o container descartável da simulação ficava de pé.
    sys.exit(128 + signum)


_require_docker()
if threading.current_thread() is threading.main_thread():
    signal.signal(signal.SIGTERM, _exit_on_sigterm)


def _tail(text: str, lines: int = 15) -> str:
    return "\n".join(text.strip().splitlines()[-lines:])


def wait_for_postgres(command, container: str, attempts: int = 120) -> None:
    """Evita executar fixtures no servidor temporário usado durante o initdb."""
    marker = "PostgreSQL init process complete; ready for start up."
    last_logs = ""
    for _ in range(attempts):
        logs = command(["docker", "logs", container], check=False)
        if logs.returncode == 0:
            last_logs = f"{logs.stdout}\n{logs.stderr}"
        state = command(
            ["docker", "inspect", "-f", "{{.State.Running}}", container], check=False
        )
        if state.returncode != 0 or state.stdout.strip() != "true":
            # Container com `--rm` some ao morrer: esperar mais 30s não muda o desfecho.
            raise RuntimeError(
                "PostgreSQL descartável encerrou antes de ficar pronto. Últimas linhas do log:\n"
                + (_tail(last_logs) or "(sem log: containers `--rm` somem ao morrer; reexecute sem `--rm` para ver o motivo)")
            )
        initialized = marker in last_logs
        ready = command(
            ["docker", "exec", container, "pg_isready", "-U", "postgres"],
            check=False,
        ).returncode == 0
        if initialized and ready:
            return
        time.sleep(0.25)
    raise RuntimeError(
        "PostgreSQL descartável não concluiu a inicialização. Últimas linhas do log:\n"
        + (_tail(last_logs) or "(sem log capturado)")
    )


def run_overlapping(
    container: str,
    first_sql: str,
    second_sql: str,
    *,
    hold_seconds: float = 2.0,
    psql_flags=("-XqAt", "-v", "ON_ERROR_STOP=1"),
    timeout: int = 60,
):
    """Executa duas sessões psql com sobreposição GARANTIDA de transação.

    Dois `Popen` soltos não provam concorrência: o statement dura milissegundos e o
    `docker exec` da segunda sessão leva ~100 ms, então a primeira costuma terminar antes
    (um teste de lock passa mesmo sem o lock). Aqui a sessão 1 abre a transação, executa
    `first_sql` e a SEGURA aberta com `pg_sleep`; a sessão 2 só inicia depois de
    `pg_stat_activity` confirmar que a 1 está dentro desse sleep.

    Devolve `{"first": (rc, stdout, stderr), "second": (...), "second_ms": int}`, onde
    `second_ms` é o tempo da sessão 2 desde que a 1 estava segurando a transação: valor
    próximo de `hold_seconds` indica que ela esperou pelo lock.
    """
    import uuid

    marker = f"qa_hold_{uuid.uuid4().hex}"

    def psql(stdin_pipe=True):
        return subprocess.Popen(
            ["docker", "exec", "-i", container, "psql", "-U", "postgres", *psql_flags],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )

    first = psql()
    first.stdin.write(
        f"BEGIN;\n{first_sql}\nSELECT pg_sleep({hold_seconds}) /* {marker} */;\nCOMMIT;\n"
    )
    first.stdin.close()
    # Python < 3.13: `communicate()` chama `stdin.flush()` num stdin já fechado e levanta
    # ValueError ("I/O operation on closed file"). O runner do CI usa 3.12; o 3.13 local passava.
    first.stdin = None

    probe = (
        "SELECT count(*) FROM pg_stat_activity WHERE state='active' "
        f"AND pid <> pg_backend_pid() AND query LIKE '%{marker}%';"
    )
    deadline = time.time() + 20
    holding = False
    while time.time() < deadline and first.poll() is None:
        out = subprocess.run(
            ["docker", "exec", container, "psql", "-U", "postgres", "-XqAt", "-c", probe],
            capture_output=True, text=True,
        ).stdout.strip()
        if out == "1":
            holding = True
            break
        time.sleep(0.05)
    if not holding:
        first.kill()
        stdout, stderr = first.communicate()
        raise RuntimeError(
            "A sessão 1 não chegou a segurar a transação (a sobreposição não foi estabelecida):\n"
            f"{stderr or stdout}"
        )

    started = time.time()
    second = psql()
    second_out = second.communicate(second_sql, timeout=timeout)
    second_ms = int((time.time() - started) * 1000)
    first_out = first.communicate(timeout=timeout)
    return {
        "first": (first.returncode, *first_out),
        "second": (second.returncode, *second_out),
        "second_ms": second_ms,
    }
