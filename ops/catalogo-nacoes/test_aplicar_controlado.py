import json
import os
import tempfile
import unittest

import aplicar_controlado as A


class AplicarControlado(unittest.TestCase):
    def test_sim_move_de_catalogo_para_controlados(self):
        with tempfile.TemporaryDirectory() as d:
            cat = {"geradoEm": "t", "itens": [{"nome": "DIPIRONA 1G CX 10", "lab": "EMS", "preco": 5.0, "restam": 3, "categoria": "Medicamentos", "isMIP": True}]}
            rx = {"geradoEm": "t", "receita": [], "controlados": [], "consulte": [], "totalReceita": 0, "totalControlados": 0, "totalConsulte": 0}
            json.dump(cat, open(os.path.join(d, "catalogo-nacoes.json"), "w"))
            json.dump(rx, open(os.path.join(d, "receita-nacoes.json"), "w"))
            cont = A.aplicar(d, {"DIPIRONA 1G CX 10": "sim"})
            self.assertEqual(cont["sim"], 1)
            cat2 = json.load(open(os.path.join(d, "catalogo-nacoes.json")))
            rx2 = json.load(open(os.path.join(d, "receita-nacoes.json")))
            self.assertEqual(cat2["itens"], [])
            self.assertEqual(len(rx2["controlados"]), 1)
            self.assertEqual(rx2["controlados"][0]["nome"], "DIPIRONA 1G CX 10")
            self.assertEqual(rx2["controlados"][0]["lista"], "A/B")

    def test_nao_move_de_controlados_para_receita(self):
        with tempfile.TemporaryDirectory() as d:
            cat = {"geradoEm": "t", "itens": []}
            rx = {"geradoEm": "t", "receita": [], "controlados": [{"nome": "ALPRAZOLAM 1MG", "lab": "EMS", "preco": 10, "lista": "B1", "tarja": "preta"}], "consulte": [], "totalReceita": 0, "totalControlados": 1, "totalConsulte": 0}
            json.dump(cat, open(os.path.join(d, "catalogo-nacoes.json"), "w"))
            json.dump(rx, open(os.path.join(d, "receita-nacoes.json"), "w"))
            cont = A.aplicar(d, {"ALPRAZOLAM 1MG": "nao"})
            self.assertEqual(cont["nao"], 1)
            rx2 = json.load(open(os.path.join(d, "receita-nacoes.json")))
            self.assertEqual(rx2["controlados"], [])
            self.assertEqual(len(rx2["receita"]), 1)
            self.assertEqual(rx2["receita"][0]["nome"], "ALPRAZOLAM 1MG")


if __name__ == "__main__":
    unittest.main()
