import os, sys, unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import monitor as M

BRT = M.BRT
QUINTA_17H = datetime(2026, 11, 5, 17, 0, tzinfo=BRT)


def iso_z(d):
    return d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def naive(d):
    return d.astimezone(BRT).strftime("%Y-%m-%dT%H:%M:%S")


def ok_args(agora, idade_h=3.0):
    t = agora - timedelta(hours=idade_h)
    return dict(agora=agora, worker={"recebidoEm": iso_z(t)}, repo_gerado=naive(t), site_gerado=naive(t), commit_dados=t + timedelta(minutes=15), ultima_execucao={"conclusao": "success"})


class Monitor(unittest.TestCase):
    def test_em_dia(self):
        self.assertEqual(M.avaliar(**ok_args(QUINTA_17H)), [])

    def test_pc_parado_no_expediente(self):
        self.assertIn("não envia", " ".join(M.avaliar(**ok_args(QUINTA_17H, 9.0))))

    def test_pc_enviou_mas_repo_velho(self):
        a = ok_args(QUINTA_17H, 2.0)
        velho = QUINTA_17H - timedelta(hours=10)
        a.update(repo_gerado=naive(velho), site_gerado=naive(velho), commit_dados=velho)
        texto = " ".join(M.avaliar(**a))
        self.assertIn("recusada ou falhou", texto)

    def test_fora_do_expediente_nao_alerta_idade(self):
        domingo = datetime(2026, 11, 8, 15, 0, tzinfo=BRT)
        self.assertEqual(M.avaliar(**ok_args(domingo, 19.0)), [])
        noite = datetime(2026, 11, 5, 23, 0, tzinfo=BRT)
        self.assertEqual(M.avaliar(**ok_args(noite, 3.0)), [])

    def test_limites_do_expediente(self):
        self.assertFalse(M.em_expediente(datetime(2026, 11, 5, 8, 59, tzinfo=BRT)))
        self.assertTrue(M.em_expediente(datetime(2026, 11, 5, 9, 0, tzinfo=BRT)))
        self.assertFalse(M.em_expediente(datetime(2026, 11, 5, 21, 0, tzinfo=BRT)))
        self.assertTrue(M.em_expediente(datetime(2026, 11, 7, 12, 0, tzinfo=BRT)))  # sábado
        self.assertFalse(M.em_expediente(datetime(2026, 11, 8, 12, 0, tzinfo=BRT)))  # domingo

    def test_sync_falhou(self):
        a = ok_args(QUINTA_17H)
        a["ultima_execucao"] = {"conclusao": "failure", "url": "https://x/1"}
        self.assertIn("failure", " ".join(M.avaliar(**a)))

    def test_worker_inacessivel(self):
        a = ok_args(QUINTA_17H)
        a["worker"] = None
        self.assertIn("Worker", " ".join(M.avaliar(**a)))

    def test_site_nao_publicou_so_apos_30_min(self):
        a = ok_args(QUINTA_17H, 1.0)
        a["site_gerado"] = naive(QUINTA_17H - timedelta(hours=4))
        a["commit_dados"] = QUINTA_17H - timedelta(minutes=10)
        self.assertEqual(M.avaliar(**a), [])  # deploy ainda em andamento
        a["commit_dados"] = QUINTA_17H - timedelta(minutes=45)
        self.assertIn("site publicado", " ".join(M.avaliar(**a)))


if __name__ == "__main__":
    unittest.main()
