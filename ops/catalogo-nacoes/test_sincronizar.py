import copy, os, sys, unittest
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sincronizar as S

AGORA = datetime(2026, 11, 5, 17, 0, tzinfo=timezone.utc)


def item(i, preco=10.0, estoque=3):
    return {"CodigoDeBarras": f"789{i:010d}", "Produto": f"PRODUTO {i}", "Apresentacao": "", "Laboratorio": "X", "Estoque": estoque, "Pvenda": preco, "Desconto": 0, "Classe": "PERFUMARIA"}


def origem(n=1500, **kw):
    d = {"loja": "itacolomi", "geradoEm": "2026-11-05T11:00:06", "recebidoEm": "2026-11-05T14:00:22.084Z", "itens": [item(i) for i in range(n)]}
    d.update(kw)
    return d


def catalogo(n=1000, preco=10.0):
    return {"geradoEm": "2026-10-31T20:00:04", "itens": [{"nome": f"P {i}", "lab": "", "preco": preco, "categoria": "Beleza", "isMIP": False} for i in range(n)]}


def restritos(n=100):
    mk = lambda p: [{"nome": f"{p} {i}", "lab": "", "preco": 5.0} for i in range(n)]
    return {"geradoEm": "2026-10-31T20:00:04", "receita": mk("R"), "controlados": mk("C"), "consulte": mk("Q")}


class Origem(unittest.TestCase):
    def test_valido(self):
        self.assertIsNotNone(S.validar_origem(origem(), AGORA))

    def test_recusas(self):
        casos = {
            "sem itens": {"loja": "itacolomi"},
            "loja errada": origem(loja="outra"),
            "poucos itens": origem(n=300),
            "sem geradoEm": origem(geradoEm=None),
            "geradoEm lixo": origem(geradoEm="ontem"),
            "parado há dias": origem(recebidoEm="2026-11-02T14:00:22Z"),
            "futuro": origem(geradoEm="2026-11-09T11:00:00", recebidoEm="2026-11-05T16:59:00Z"),
        }
        for nome, dados in casos.items():
            with self.subTest(nome), self.assertRaises(S.Recusa):
                S.validar_origem(dados, AGORA)

    def test_precos_zerados(self):
        d = origem()
        for it in d["itens"][:400]:
            it["Pvenda"] = 0
        with self.assertRaises(S.Recusa):
            S.validar_origem(d, AGORA)

    def test_sem_campos(self):
        d = origem()
        del d["itens"][0]["Pvenda"]
        with self.assertRaises(S.Recusa):
            S.validar_origem(d, AGORA)

    def test_zero_sem_estoque_nao_conta(self):
        d = origem()
        for it in d["itens"][:600]:
            it["Estoque"], it["Pvenda"] = 0, 0  # item parado sem preço não é motivo para recusar
        self.assertIsNotNone(S.validar_origem(d, AGORA))


class Saida(unittest.TestCase):
    def test_valido_e_queda_pequena(self):
        S.validar_saida(catalogo(), restritos(), catalogo(900), restritos(90))

    def test_queda_maior_que_20_por_cento(self):
        with self.assertRaises(S.Recusa):
            S.validar_saida(catalogo(), restritos(), catalogo(790), restritos())
        with self.assertRaises(S.Recusa):
            S.validar_saida(catalogo(), restritos(), catalogo(), restritos(70))
        S.validar_saida(catalogo(), restritos(), catalogo(790), restritos(), forcar=True)

    def test_precos_zerados_ou_ausentes_no_site(self):
        novo = catalogo()
        for i in novo["itens"][:50]:
            i["preco"] = 0
        with self.assertRaises(S.Recusa):
            S.validar_saida(catalogo(), restritos(), novo, restritos(), forcar=True)  # nem com --forcar

    def test_lista_vazia(self):
        rx = restritos()
        rx["controlados"] = []
        with self.assertRaises(S.Recusa):
            S.validar_saida(catalogo(), restritos(), catalogo(), rx, forcar=True)

    def test_preco_em_massa(self):
        with self.assertRaises(S.Recusa):
            S.validar_saida(catalogo(), restritos(), catalogo(preco=20.0), restritos())
        S.validar_saida(catalogo(), restritos(), catalogo(preco=20.0), restritos(), forcar=True)

    def test_estoque_e_codigo_de_barras_nunca_publicos(self):
        for campo in ("Estoque", "CodigoDeBarras", "ean", "token"):
            novo = catalogo()
            novo["itens"][3][campo] = "x"
            with self.subTest(campo), self.assertRaises(S.Recusa):
                S.validar_saida(catalogo(), restritos(), novo, restritos(), forcar=True)
            rx = restritos()
            rx["receita"][0][campo] = "x"
            with self.subTest(campo + " na lista"), self.assertRaises(S.Recusa):
                S.validar_saida(catalogo(), restritos(), catalogo(), rx, forcar=True)

    def test_item_sem_categoria(self):
        novo = catalogo()
        novo["itens"][0]["categoria"] = ""
        with self.assertRaises(S.Recusa):
            S.validar_saida(catalogo(), restritos(), novo, restritos())


class Mudanca(unittest.TestCase):
    def test_so_a_hora_mudou_no_mesmo_dia_nao_publica(self):
        novo = copy.deepcopy(catalogo()); novo["geradoEm"] = "2026-10-31T23:00:00"
        rx = copy.deepcopy(restritos()); rx["geradoEm"] = novo["geradoEm"]
        self.assertFalse(S.mudou_de_verdade(catalogo(), restritos(), novo, rx))

    def test_novo_dia_atualiza_a_data(self):
        novo = catalogo(); novo["geradoEm"] = "2026-11-01T08:00:00"
        self.assertTrue(S.mudou_de_verdade(catalogo(), restritos(), novo, restritos()))

    def test_preco_mudou_publica(self):
        novo = catalogo(); novo["itens"][5]["preco"] = 11.0
        self.assertTrue(S.mudou_de_verdade(catalogo(), restritos(), novo, restritos()))


if __name__ == "__main__":
    unittest.main()
