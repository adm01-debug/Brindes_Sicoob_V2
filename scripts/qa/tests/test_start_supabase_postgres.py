"""Prova a queda para o espelho quando o registry estoura a cota.

Roda sem Docker: `command` e `sleep` são substituídos por dublês.
"""
import os
import sys
import types
import unittest
from unittest import mock

QA = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, QA)

# `postgres_ready` exige Docker ao ser importado; aqui só a função de subida interessa.
with mock.patch("subprocess.run", return_value=types.SimpleNamespace(returncode=0, stdout="", stderr="")):
    import postgres_ready


def resultado(returncode, stderr=""):
    return types.SimpleNamespace(returncode=returncode, stdout="", stderr=stderr)


class FakeDocker:
    """Devolve as respostas na ordem dada, só para os `docker run`."""

    def __init__(self, respostas):
        self.respostas = list(respostas)
        self.imagens = []

    def __call__(self, args, check=True, stdin=None):
        if args[:2] != ["docker", "run"]:
            return resultado(0)
        self.imagens.append(args[-4])
        return self.respostas.pop(0)


class TestStartSupabasePostgres(unittest.TestCase):
    def test_cota_do_ecr_cai_para_o_espelho(self):
        # backoff=(0, 0) => 3 tentativas por imagem: as três do ECR falham.
        docker = FakeDocker([
            resultado(1, "error from registry: Data limit exceeded"),
            resultado(1, "error from registry: Data limit exceeded"),
            resultado(1, "error from registry: Data limit exceeded"),
            resultado(0),
        ])
        esperas = []

        imagem = postgres_ready.start_supabase_postgres(
            docker, "c1", backoff=(0, 0), sleep=esperas.append
        )

        self.assertEqual(imagem, "supabase/postgres:17.6.1.063")
        self.assertEqual(docker.imagens[0], "public.ecr.aws/supabase/postgres:17.6.1.063")
        self.assertEqual(len(esperas), 2, "deve esperar entre as tentativas do mesmo registry")

    def test_sucesso_de_primeira_nao_espera_nem_troca_de_registry(self):
        docker = FakeDocker([resultado(0)])
        esperas = []

        imagem = postgres_ready.start_supabase_postgres(
            docker, "c1", backoff=(0, 0), sleep=esperas.append
        )

        self.assertEqual(imagem, "public.ecr.aws/supabase/postgres:17.6.1.063")
        self.assertEqual(len(docker.imagens), 1)
        self.assertEqual(esperas, [])

    def test_erro_definitivo_nao_gasta_backoff(self):
        docker = FakeDocker([
            resultado(1, "manifest for ... not found: manifest unknown"),
            resultado(1, "manifest for ... not found: manifest unknown"),
        ])
        esperas = []

        with self.assertRaises(RuntimeError) as erro:
            postgres_ready.start_supabase_postgres(
                docker, "c1", backoff=(0, 0), sleep=esperas.append
            )

        self.assertEqual(len(docker.imagens), 2, "um `docker run` por imagem, sem repetir")
        self.assertEqual(esperas, [])
        self.assertIn("manifest unknown", str(erro.exception))

    def test_esgotar_as_duas_fontes_falha_dizendo_o_motivo(self):
        docker = FakeDocker([resultado(1, "Data limit exceeded")] * 6)

        with self.assertRaises(RuntimeError) as erro:
            postgres_ready.start_supabase_postgres(
                docker, "c1", backoff=(0, 0), sleep=lambda _s: None
            )

        mensagem = str(erro.exception)
        self.assertIn("public.ecr.aws/supabase/postgres", mensagem)
        self.assertIn("supabase/postgres:17.6.1.063", mensagem)

    def test_variavel_de_ambiente_sobrepoe_a_lista(self):
        docker = FakeDocker([resultado(0)])
        with mock.patch.dict(os.environ, {"SICOOB_QA_PG_IMAGES": "espelho/interno:17"}):
            imagem = postgres_ready.start_supabase_postgres(docker, "c1", sleep=lambda _s: None)
        self.assertEqual(imagem, "espelho/interno:17")


if __name__ == "__main__":
    unittest.main()
