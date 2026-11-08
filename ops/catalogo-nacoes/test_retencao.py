import copy, os, sys, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import retencao as R
import sincronizar as S


def item(nome, preco, lab="LAB", cat="Beleza", **kw):
    return dict({"nome": nome, "lab": lab, "preco": preco, "categoria": cat, "isMIP": False}, **kw)


def rx(receita=(), controlados=(), consulte=()):
    return {"receita": list(receita), "controlados": list(controlados), "consulte": list(consulte)}


def rodar(cat_novo, rx_novo=None, cat_antigo=None, rx_antigo=None, pmc=None, aprov=None):
    return R.aplicar({"itens": cat_novo}, rx_novo or rx(), {"itens": cat_antigo or []}, rx_antigo or rx(), pmc or {}, aprov or {}, agora="2026-11-08T12:00:00+00:00")


class TestRetencao(unittest.TestCase):
    def motivos(self, retidos):
        return sorted(r["motivo"] for r in retidos)

    def test_preco_zero_e_nome_vazio_nao_publicam(self):
        cat, _, ret = rodar([item("A", 10), item("B", 0), item("C", None), item("  ", 5)])
        self.assertEqual([i["nome"] for i in cat["itens"]], ["A"])
        self.assertEqual(self.motivos(ret), ["nome_vazio", "preco_zero", "preco_zero"])

    def test_variacao_maior_que_20_mantem_o_preco_antigo_e_pede_revisao(self):
        cat, _, ret = rodar([item("A", 13.0), item("B", 11.9)], cat_antigo=[item("A", 10.0), item("B", 10.0)])
        precos = {i["nome"]: i["preco"] for i in cat["itens"]}
        self.assertEqual(precos, {"A": 10.0, "B": 11.9}, "A segue com R$ 10; B (+19%) passa")
        self.assertEqual(self.motivos(ret), ["variacao"])
        self.assertIn("+30%", ret[0]["detalhe"])

    def test_variacao_aprovada_publica_o_preco_novo_so_para_esse_valor(self):
        k = R.chave("A", "LAB")
        aprov = {k: {"variacao": {"valor": 13.0, "por": "Maria", "quando": "2026-11-08"}}}
        cat, _, ret = rodar([item("A", 13.0)], cat_antigo=[item("A", 10.0)], aprov=aprov)
        self.assertEqual(cat["itens"][0]["preco"], 13.0)
        self.assertEqual(ret, [])
        cat, _, ret = rodar([item("A", 14.0)], cat_antigo=[item("A", 10.0)], aprov=aprov)
        self.assertEqual(cat["itens"][0]["preco"], 10.0, "outro preço precisa de nova aprovação")
        self.assertEqual(self.motivos(ret), ["variacao"])

    def test_preco_acima_do_pmc_bloqueia_e_override_libera(self):
        k = R.chave("MED", "LAB")
        cat, _, ret = rodar([item("MED", 30.0)], pmc={k: 25.0})
        self.assertEqual(cat["itens"], [])
        self.assertEqual(self.motivos(ret), ["pmc"])
        cat, _, ret = rodar([item("MED", 30.0)], pmc={k: 25.0}, aprov={k: {"pmc": {"valor": 30.0, "por": "João", "motivo": "teto desatualizado"}}})
        self.assertEqual(len(cat["itens"]), 1)
        cat, _, ret = rodar([item("MED", 25.0)], pmc={k: 25.0})
        self.assertEqual(len(cat["itens"]), 1, "no teto pode")

    def test_sem_categoria_nao_publica_a_menos_que_aprovada(self):
        k = R.chave("X", "LAB")
        cat, _, ret = rodar([item("X", 5, cat="Categoria a conferir"), item("Y", 5, cat=None)])
        self.assertEqual(cat["itens"], [])
        self.assertEqual(self.motivos(ret), ["sem_categoria", "sem_categoria"])
        cat, _, _ = rodar([item("X", 5, cat="Categoria a conferir")], aprov={k: {"categoria": {"valor": "Beleza", "por": "Ana"}}})
        self.assertEqual(cat["itens"][0]["categoria"], "Beleza")
        cat, _, _ = rodar([item("X", 5, cat="Categoria a conferir")], aprov={k: {"categoria": {"valor": "Inventada", "por": "Ana"}}})
        self.assertEqual(cat["itens"], [], "só vale categoria da árvore")

    def test_enquadramento_nao_confirmado_nao_publica(self):
        k = R.chave("MED A", "LAB")
        novo = rx(consulte=[item("MED A", 9, cat=None), item("MED B", 9, cat=None)], receita=[item("MED R", 9, cat=None)])
        _, r, ret = rodar([], novo, aprov={k: {"enquadramento": {"valor": "consulte", "por": "Thiago"}}})
        self.assertEqual([i["nome"] for i in r["consulte"]], ["MED A"])
        self.assertEqual([i["nome"] for i in r["receita"]], ["MED R"], "lista de receita não exige categoria")
        self.assertEqual(self.motivos(ret), ["enquadramento"])
        self.assertEqual((r["totalReceita"], r["totalConsulte"]), (1, 1))

    def test_nao_altera_a_entrada_e_nao_traz_codigo_de_barras_nem_estoque(self):
        entrada = [item("A", 13.0)]
        copia = copy.deepcopy(entrada)
        _, _, ret = rodar(entrada, cat_antigo=[item("A", 10.0)])
        self.assertEqual(entrada, copia)
        for r in ret:
            self.assertFalse({"ean", "EAN", "CodigoDeBarras", "estoque", "Estoque"} & set(r))

    def test_aprovacao_antiga_sem_laboratorio_continua_valendo_depois_que_o_produto_ganha_marca(self):
        antiga = R.chave("MED A", "")
        novo = rx(consulte=[item("MED A", 9, lab="EUROFARMA", cat=None)])
        _, r, ret = rodar([], novo, aprov={antiga: {"enquadramento": {"valor": "consulte", "por": "Thiago"}}})
        self.assertEqual(len(r["consulte"]), 1)
        self.assertEqual(ret, [])

    def test_marca_da_cmed_fica_curta(self):
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "motor"))
        import gerar as G
        self.assertEqual(G.marca_da_cmed("EUROFARMA LABORATÓRIOS S.A."), "EUROFARMA")
        self.assertEqual(G.marca_da_cmed("MINÂNCORA & CIA LTDA"), "MINANCORA")
        self.assertEqual(G.marca_da_cmed("NEO QUÍMICA COMÉRCIO E INDÚSTRIA LTDA"), "NEO QUIMICA")
        self.assertEqual(G.marca_da_cmed(None), "")
        self.assertEqual(G.marca_da_cmed("LTDA"), "")

    def test_juntar_aprovacoes_painel_vale_por_cima(self):
        j = S.juntar_aprovacoes({"A": {"enquadramento": {"valor": "consulte"}}}, {"A": {"variacao": {"valor": 1}}, "B": {"pmc": {"valor": 2}}})
        self.assertEqual(sorted(j["A"]), ["enquadramento", "variacao"])
        self.assertIn("B", j)


if __name__ == "__main__":
    unittest.main()
