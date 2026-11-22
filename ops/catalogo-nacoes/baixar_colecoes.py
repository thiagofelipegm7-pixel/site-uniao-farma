#!/usr/bin/env python3
"""Sincroniza as coleções de fotos extras (painel /interno/colecoes) com o site.

Lê a lista de coleções do Worker (/api/colecoes-sync), baixa cada foto, converte para WebP quadrado de 800 px e
recria public/produtos-extras/<EAN>/01.webp, 02.webp... a partir do que está no painel. Também grava o índice
app/nacoes-unidas/produtos/dados/fotos-extras.json (EAN -> caminhos). Recria tudo, então foto removida some do site.

Uso:
  baixar_colecoes.py  -> escreve colecoes=true em $GITHUB_OUTPUT quando algo mudou.
Sem CATALOGO_READ_TOKEN (ou Worker fora do ar) não mexe em nada e sai sem erro (o site segue com o que já está).
"""
import io
import json
import os
import re
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PASTA = RAIZ / "public/produtos-extras"
INDICE = RAIZ / "app/nacoes-unidas/produtos/dados/fotos-extras.json"
SITE = os.environ.get("SITE_URL", "https://xn--uniofarmasabar-8gbu.com.br").rstrip("/")
LADO = 800
MAX_POR_PRODUTO = 6


def para_webp(dados: bytes) -> bytes:
    try:
        from PIL import Image
    except ImportError:
        import subprocess

        subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "pillow"], check=True)
        from PIL import Image

    img = Image.open(io.BytesIO(dados)).convert("RGBA")
    fundo = Image.new("RGBA", img.size, (255, 255, 255, 255))
    fundo.alpha_composite(img)
    img = fundo.convert("RGB")
    img.thumbnail((LADO, LADO))
    tela = Image.new("RGB", (LADO, LADO), (255, 255, 255))
    tela.paste(img, ((LADO - img.width) // 2, (LADO - img.height) // 2))
    saida = io.BytesIO()
    tela.save(saida, "WEBP", quality=86, method=6)
    return saida.getvalue()


def chamar(caminho: str, token: str) -> bytes:
    req = urllib.request.Request(SITE + caminho, headers={"authorization": f"Bearer {token}", "user-agent": "uniao-farma-colecoes"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def saida_github(**valores: str) -> None:
    arquivo = os.environ.get("GITHUB_OUTPUT")
    if arquivo:
        with open(arquivo, "a", encoding="utf-8") as f:
            for k, v in valores.items():
                f.write(f"{k}={v}\n")


def sincronizar() -> int:
    token = os.environ.get("CATALOGO_READ_TOKEN", "").strip()
    if not token:
        saida_github(colecoes="false")
        return 0
    try:
        lista = json.loads(chamar("/api/colecoes-sync", token)).get("colecoes", {})
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as e:
        print(f"Coleções: não consegui consultar ({e}). Nada a fazer.")
        saida_github(colecoes="false")
        return 0

    antigo = json.loads(INDICE.read_text(encoding="utf-8")) if INDICE.exists() else {}
    novo: dict[str, list[str]] = {}
    arquivos_novos: dict[str, list[bytes]] = {}
    for ean, ordens in sorted(lista.items()):
        if not re.fullmatch(r"\d{8,14}", ean):
            continue
        fotos = []
        for ordem in sorted(ordens)[:MAX_POR_PRODUTO]:
            try:
                fotos.append(para_webp(chamar(f"/api/colecoes-sync?ean={ean}&ordem={ordem}", token)))
            except Exception as e:  # foto ruim: pula, o resto da coleção segue
                print(f"Coleções: {ean} foto {ordem} ignorada ({e})")
        if fotos:
            arquivos_novos[ean] = fotos
            novo[ean] = [f"/produtos-extras/{ean}/{k:02d}.webp" for k in range(1, len(fotos) + 1)]

    if novo == antigo:
        print("Coleções: sem mudanças.")
        saida_github(colecoes="false")
        return 0

    # Recria a pasta inteira: o que saiu do painel some do site.
    PASTA.mkdir(parents=True, exist_ok=True)
    for item in PASTA.iterdir():
        if item.is_dir():
            shutil.rmtree(item)
    for ean, fotos in arquivos_novos.items():
        pasta = PASTA / ean
        pasta.mkdir(parents=True, exist_ok=True)
        for k, webp in enumerate(fotos, start=1):
            (pasta / f"{k:02d}.webp").write_bytes(webp)
    INDICE.write_text(json.dumps(novo, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Coleções: {len(novo)} produtos com coleção, {sum(len(v) for v in novo.values())} fotos.")
    saida_github(colecoes="true")
    return 0


if __name__ == "__main__":
    if len(sys.argv) == 1 or sys.argv[1] == "sincronizar":
        sys.exit(sincronizar())
    print(__doc__)
    sys.exit(2)
