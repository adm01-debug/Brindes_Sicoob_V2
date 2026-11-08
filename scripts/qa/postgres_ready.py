"""Sincronização robusta com o servidor final das imagens oficiais PostgreSQL."""
import subprocess
import sys
import time


def _require_docker() -> None:
    """Termina graciosamente se o daemon Docker não estiver acessível."""
    try:
        result = subprocess.run(
            ["docker", "info"], capture_output=True, timeout=5
        )
        if result.returncode != 0:
            print(
                "❌ Docker daemon não está rodando. Inicie o Docker para executar este script.",
                file=sys.stderr,
            )
            sys.exit(1)
    except FileNotFoundError:
        print(
            "❌ Docker não encontrado no PATH. Instale o Docker para executar este script.",
            file=sys.stderr,
        )
        sys.exit(1)
    except subprocess.TimeoutExpired:
        print(
            "❌ Docker daemon não respondeu a tempo. Verifique se o serviço está ativo.",
            file=sys.stderr,
        )
        sys.exit(1)


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
