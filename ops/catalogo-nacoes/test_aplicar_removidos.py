import json
import os
import tempfile
import unittest

import aplicar_removidos as A


class AplicarRemovidos(unittest.TestCase):
    def test_tira_do_catalogo_e_das_listas_restritas(self):
        with tempfile.TemporaryDirectory() as d:
            cat = {"geradoEm": "t", "total": 3, "itens": [{"nome": "PAO DE MEL", "preco": 5}, {"nome": "Água Mineral", "preco": 2}, {"nome": "DIPIRONA", "preco": 7}]}
            rx = {"geradoEm": "t", "receita": [{"nome": "AMOXICILINA 500", "preco": 20}], "controlados": [{"nome": "RIVOTRIL", "preco": 30}], "consulte": [],
                  "totalReceita": 1, "totalControlados": 1, "totalConsulte": 0}
            json.dump(cat, open(os.path.join(d, "catalogo-nacoes.json"), "w"))
            json.dump(rx, open(os.path.join(d, "receita-nacoes.json"), "w"))
            # a chave vem normalizada (maiúscula, sem acento); o nome do item pode ter acento e caixa mista
            cont = A.aplicar(d, ["AGUA MINERAL", "rivotril", "NAO EXISTE"])
            self.assertEqual(cont["tirados"], 2)
            cat2 = json.load(open(os.path.join(d, "catalogo-nacoes.json")))
            rx2 = json.load(open(os.path.join(d, "receita-nacoes.json")))
            self.assertEqual([i["nome"] for i in cat2["itens"]], ["PAO DE MEL", "DIPIRONA"])
            self.assertEqual(cat2["total"], 2)
            self.assertEqual(rx2["controlados"], [])
            self.assertEqual(rx2["totalControlados"], 0)
            self.assertEqual(rx2["totalReceita"], 1)

    def test_lista_vazia_nao_mexe(self):
        with tempfile.TemporaryDirectory() as d:
            json.dump([], open(os.path.join(d, "produtos-removidos.json"), "w"))
            self.assertEqual(A.main(["x", d]), 0)


if __name__ == "__main__":
    unittest.main()
