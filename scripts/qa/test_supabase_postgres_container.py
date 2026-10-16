"""Testes do fallback de registry usado pelos simuladores PostgreSQL."""

from pathlib import Path
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from supabase_postgres_container import DEFAULT_IMAGES, candidate_images, start_supabase_postgres


class Result:
    def __init__(self, returncode: int, stderr: str = ""):
        self.returncode = returncode
        self.stderr = stderr
        self.stdout = ""


class SupabasePostgresContainerTest(unittest.TestCase):
    def test_troca_para_docker_hub_quando_ecr_falha(self):
        calls: list[list[str]] = []

        def command(args, **_kwargs):
            calls.append(args)
            if args[:3] == ["docker", "rm", "-f"]:
                return Result(0)
            return Result(0 if DEFAULT_IMAGES[1] in args else 1, "limite do registry")

        image = start_supabase_postgres(command, "teste", attempts_per_image=1, sleep_fn=lambda _: None)

        self.assertEqual(image, DEFAULT_IMAGES[1])
        run_images = [args[args.index("postgres") - 1] for args in calls if args[:2] == ["docker", "run"]]
        self.assertEqual(run_images, list(DEFAULT_IMAGES))

    def test_override_tem_prioridade_sem_duplicar_imagem(self):
        with patch.dict(os.environ, {"SICOOB_SUPABASE_POSTGRES_IMAGE": DEFAULT_IMAGES[1]}):
            self.assertEqual(candidate_images(), (DEFAULT_IMAGES[1], DEFAULT_IMAGES[0]))

    def test_informa_erros_de_todos_os_registries(self):
        def command(args, **_kwargs):
            if args[:3] == ["docker", "rm", "-f"]:
                return Result(0)
            return Result(1, "indisponível")

        with self.assertRaisesRegex(RuntimeError, "todos os registries") as raised:
            start_supabase_postgres(command, "teste", attempts_per_image=1, sleep_fn=lambda _: None)
        for image in DEFAULT_IMAGES:
            self.assertIn(image, str(raised.exception))


if __name__ == "__main__":
    unittest.main()
