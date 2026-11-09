import json
import os
import tempfile
import unittest

import aplicar_categoria as A


class AplicarCategoria(unittest.TestCase):
    def test_move_consulte_para_bem_estar(self):
        with tempfile.TemporaryDirectory() as d:
            cat = {"geradoEm": "t", "itens": [{"nome": "PAO DE MEL", "lab": "SANOFI/OPELLA", "preco": 5, "categoria": "Medicamentos", "isMIP": False, "origem": "consulte", "categoriaAntiga": "Consulte o farmacêutico"}]}
            rx = {"geradoEm": "t", "receita": [], "controlados": [], "consulte": [{"nome": "PAO DE MEL", "lab": "SANOFI/OPELLA", "preco": 5}], "totalReceita": 0, "totalControlados": 0, "totalConsulte": 1}
            json.dump(cat, open(os.path.join(d, "catalogo-nacoes.json"), "w"))
            json.dump(rx, open(os.path.join(d, "receita-nacoes.json"), "w"))
            json.dump({}, open(os.path.join(d, "controlados-overrides.json"), "w"))
            cont = A.aplicar(d, {"PAO DE MEL": "Bem Estar"})
            self.assertEqual(cont["aplicados"], 1)
            cat2 = json.load(open(os.path.join(d, "catalogo-nacoes.json")))
            self.assertEqual(cat2["itens"][0]["categoria"], "Bem Estar")
            self.assertEqual(cat2["itens"][0]["origem"], "consulte")

    def test_sair_de_medicamentos_limpa_controlado_override(self):
        with tempfile.TemporaryDirectory() as d:
            cat = {"geradoEm": "t", "itens": [{"nome": "DIPIRONA 1G", "lab": "EMS", "preco": 5, "categoria": "Medicamentos", "isMIP": True}]}
            rx = {"geradoEm": "t", "receita": [], "controlados": [], "consulte": [], "totalReceita": 0, "totalControlados": 0, "totalConsulte": 0}
            json.dump(cat, open(os.path.join(d, "catalogo-nacoes.json"), "w"))
            json.dump(rx, open(os.path.join(d, "receita-nacoes.json"), "w"))
            json.dump({"DIPIRONA 1G": "sim"}, open(os.path.join(d, "controlados-overrides.json"), "w"))
            A.aplicar(d, {"DIPIRONA 1G": "Beleza"})
            ovr = json.load(open(os.path.join(d, "controlados-overrides.json")))
            self.assertNotIn("DIPIRONA 1G", ovr)
            cat2 = json.load(open(os.path.join(d, "catalogo-nacoes.json")))
            self.assertEqual(cat2["itens"][0]["categoria"], "Beleza")


if __name__ == "__main__":
    unittest.main()
