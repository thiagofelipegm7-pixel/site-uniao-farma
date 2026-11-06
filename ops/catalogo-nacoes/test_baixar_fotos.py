import io
import unittest

import baixar_fotos as b

BASE = 'x\nexport const FOTOS_NACOES: Readonly<Record<string, string>> = {\n  "A B": "1111111111111",\n};\nresto\n'


class TestMapa(unittest.TestCase):
    def test_insere_no_fim_do_mapa(self):
        r = b.inserir_no_mapa(BASE, "NOVO PRODUTO 10ML", "7891234567890")
        self.assertIn('  "NOVO PRODUTO 10ML": "7891234567890",\n};', r)
        self.assertIn('"A B": "1111111111111"', r)

    def test_troca_foto_do_mesmo_produto(self):
        r = b.inserir_no_mapa(BASE, "A B", "2222222222222")
        self.assertEqual(r.count('"A B"'), 1)
        self.assertIn('"A B": "2222222222222"', r)

    def test_nome_com_aspas(self):
        r = b.inserir_no_mapa(BASE, 'CREME "X" 50G', "7891234567890")
        self.assertIn('"CREME \\"X\\" 50G": "7891234567890"', r)

    def test_converte_png_para_webp_quadrado(self):
        from PIL import Image

        buf = io.BytesIO()
        Image.new("RGBA", (300, 120), (255, 0, 0, 0)).save(buf, "PNG")
        webp = b.para_webp(buf.getvalue())
        img = Image.open(io.BytesIO(webp))
        self.assertEqual((img.format, img.size), ("WEBP", (400, 400)))


if __name__ == "__main__":
    unittest.main()
