"""Inicialização resiliente do PostgreSQL Supabase usado nos gates descartáveis."""

from collections.abc import Callable
import os
import subprocess
import time

DEFAULT_IMAGES = (
    "public.ecr.aws/supabase/postgres:17.6.1.063",
    "supabase/postgres:17.6.1.063",
)


def candidate_images() -> tuple[str, ...]:
    """Prioriza override explícito e mantém dois registries oficiais como fallback."""
    override = os.getenv("SICOOB_SUPABASE_POSTGRES_IMAGE", "").strip()
    return tuple(dict.fromkeys(filter(None, (override, *DEFAULT_IMAGES))))


def start_supabase_postgres(
    command: Callable[..., subprocess.CompletedProcess[str]],
    container: str,
    *,
    attempts_per_image: int = 2,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> str:
    """Inicia o container e troca de registry quando o download está indisponível."""
    errors: list[str] = []
    for image in candidate_images():
        args = [
            "docker", "run", "--rm", "-d", "--name", container,
            "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
            image, "postgres", "-D", "/var/lib/postgresql/data",
        ]
        for attempt in range(attempts_per_image):
            result = command(args, check=False)
            if result.returncode == 0:
                return image
            detail = result.stderr.strip() or result.stdout.strip()
            errors.append(f"{image} (tentativa {attempt + 1}): {detail}")
            command(["docker", "rm", "-f", container], check=False)
            if attempt + 1 < attempts_per_image:
                sleep_fn(2)
    raise RuntimeError("docker run falhou em todos os registries: " + " | ".join(errors))
