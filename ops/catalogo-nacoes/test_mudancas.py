import json
import os
import tempfile
import unittest

import mudancas


def item(nome, preco, esgotado=False, categoria="Beleza"):
    d = {"nome": nome, "preco": preco, "categoria": categoria}
    if esgotado:
        d["esgotado"] = True
    return d


def cat(*itens):
    return {"itens": list(itens)}


class Mudancas(unittest.TestCase):
    def test_novo_esgotou_voltou_e_preco(self):
        antes = cat(item("SH A", 10.0), item("SH B", 20.0), item("SH C", 5.0, esgotado=True), item("SH D", 8.0))
        depois = cat(item("SH A", 12.5), item("SH B", 20.0, esgotado=True), item("SH C", 5.0), item("SH NOVO", 3.0))
        ev = {(e["t"], e["n"]): e for e in mudancas.calcular(antes, {}, depois, {}, "2026-11-12T10:00:00")}
        self.assertEqual(set(ev), {("preco", "SH A"), ("esgotou", "SH B"), ("voltou", "SH C"), ("novo", "SH NOVO"), ("esgotou", "SH D")})
        self.assertEqual((ev[("preco", "SH A")]["de"], ev[("preco", "SH A")]["para"]), (10.0, 12.5))

    def test_receita_e_controlado_contam_como_medicamentos_e_nao_levam_estoque(self):
        rx_antes = {"receita": [{"nome": "REM X 10MG", "preco": 10.0, "restam": 2}], "controlados": [], "consulte": []}
        rx_depois = {"receita": [{"nome": "REM X 10MG", "preco": 11.0}, {"nome": "REM Y", "preco": 5.0}], "controlados": [], "consulte": []}
        ev = mudancas.calcular(cat(), rx_antes, cat(), rx_depois, "2026-11-12T10:00:00")
        self.assertEqual({(e["t"], e["n"], e["c"]) for e in ev}, {("preco", "REM X 10MG", "Medicamentos"), ("novo", "REM Y", "Medicamentos")})
        for e in ev:
            self.assertFalse({"restam", "estoque", "ean"} & set(e))

    def test_preco_so_muda_para_item_a_venda_e_sem_mudanca_nao_registra(self):
        igual = cat(item("SH A", 10.0), item("SH B", 5.0, esgotado=True))
        self.assertEqual(mudancas.calcular(igual, {}, igual, {}, "2026-11-12T10:00:00"), [])
        # esgotado que muda de preço não vira "preço": ninguém compra.
        self.assertEqual(mudancas.calcular(cat(item("SH B", 5.0, esgotado=True)), {}, cat(item("SH B", 6.0, esgotado=True)), {}, "2026-11-12T10:00:00"), [])

    def test_grava_junta_e_descarta_o_que_tem_mais_de_14_dias(self):
        with tempfile.TemporaryDirectory() as d:
            arq = os.path.join(d, "m.json")
            with open(arq, "w", encoding="utf-8") as f:
                json.dump({"eventos": [{"q": "2026-10-20T08:00:00", "t": "novo", "n": "VELHO", "c": "Beleza"}, {"q": "2026-11-10T08:00:00", "t": "novo", "n": "RECENTE", "c": "Beleza"}]}, f)
            ficaram = mudancas.gravar(arq, [{"q": "2026-11-12T10:00:00", "t": "esgotou", "n": "HOJE", "c": "Beleza"}], "2026-11-12T10:00:00")
            self.assertEqual(ficaram, 2)
            nomes = [e["n"] for e in json.load(open(arq, encoding="utf-8"))["eventos"]]
            self.assertEqual(nomes, ["RECENTE", "HOJE"])

    def test_arquivo_estragado_recomeca_vazio_sem_quebrar_a_sincronizacao(self):
        with tempfile.TemporaryDirectory() as d:
            arq = os.path.join(d, "m.json")
            open(arq, "w").write("{lixo")
            self.assertEqual(mudancas.gravar(arq, [], "2026-11-12T10:00:00"), 0)


if __name__ == "__main__":
    unittest.main()
