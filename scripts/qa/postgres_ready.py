"""Sincronização robusta com o servidor final das imagens oficiais PostgreSQL."""
import subprocess
import sys
import time


def _require_docker() -> None:
    """Pula graciosamente se o daemon Docker não estiver acessível (ex: CI sem Docker)."""
    try:
        result = subprocess.run(
            ["docker", "info"], capture_output=True, timeout=5
        )
        if result.returncode != 0:
            print(
                "⚠️  Docker daemon não está rodando — script ignorado (ambiente sem Docker).",
                file=sys.stderr,
            )
            sys.exit(0)
    except FileNotFoundError:
        print(
            "⚠️  Docker não encontrado no PATH — script ignorado (ambiente sem Docker).",
            file=sys.stderr,
        )
        sys.exit(0)
    except subprocess.TimeoutExpired:
        print(
            "⚠️  Docker daemon não respondeu a tempo — script ignorado (ambiente sem Docker).",
            file=sys.stderr,
        )
        sys.exit(0)


_require_docker()


def wait_for_postgres(command, container: str, attempts: int = 120) -> None:
    """Evita executar fixtures no servidor temporário usado durante o initdb."""
    marker = "PostgreSQL init process complete; ready for start up."
    for _ in range(attempts):
        logs = command(["docker", "logs", container], check=False)
        initialized = marker in f"{logs.stdout}\n{logs.stderr}"
        ready = command(
            ["docker", "exec", container, "pg_isready", "-U", "postgres"],
            check=False,
        ).returncode == 0
        if initialized and ready:
            return
        time.sleep(0.25)
    raise RuntimeError("PostgreSQL descartável não concluiu a inicialização")
