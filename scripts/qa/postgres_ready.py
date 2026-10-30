"""Sincronização robusta com o servidor final das imagens oficiais PostgreSQL."""
import time

POSTGRES_IMAGE = (
    "ghcr.io/supabase/postgres:17.6.1.063"
    "@sha256:178f0976b54a39237096bfa310c1a352dbc82fb1b08dda45cdb8acb5d40c1426"
)


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
