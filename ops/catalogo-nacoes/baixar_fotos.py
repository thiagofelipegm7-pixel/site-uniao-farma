#!/usr/bin/env python3
"""Baixa as fotos enviadas pelo painel interno (/interno/fotos), coloca em public/produtos/<EAN>.webp e
registra o produto em FOTOS_NACOES (app/nacoes-unidas/produtos/imagens.ts). Roda dentro do workflow catalogo-sync.

Uso:
  baixar_fotos.py baixar   -> baixa e grava os arquivos; escreve fotos=true e eans=... em $GITHUB_OUTPUT
  baixar_fotos.py apagar EAN [EAN...]  -> apaga a cópia no Worker depois que o site foi publicado
Sem CATALOGO_READ_TOKEN (ou com o site fora do ar) não faz nada e sai sem erro.
"""
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MAPA = RAIZ / "app/nacoes-unidas/produtos/imagens.ts"
PASTA = RAIZ / "public/produtos"
SITE = os.environ.get("SITE_URL", "https://xn--uniofarmasabar-8gbu.com.br").rstrip("/")
LADO = 400


def inserir_no_mapa(codigo: str, nome: str, ean: str) -> str:
    """Põe (ou troca) "NOME": "EAN" no mapa FOTOS_NACOES. Devolve o arquivo novo."""
    inicio = codigo.index("export const FOTOS_NACOES")
    fim = codigo.index("\n};", inicio)
    corpo = codigo[inicio:fim]
    chave = json.dumps(nome, ensure_ascii=False)
    linha = f"  {chave}: {json.dumps(ean)},"
    existente = re.search(r"^  " + re.escape(chave) + r": \"\d+\",$", corpo, re.M)
    if existente:
        corpo = corpo[: existente.start()] + linha + corpo[existente.end():]
    else:
        corpo = corpo + "\n" + linha
    return codigo[:inicio] + corpo + codigo[fim:]


def remover_do_mapa(codigo: str, ean: str) -> str:
    """Tira de FOTOS_NACOES toda linha que aponta para esse EAN."""
    inicio = codigo.index("export const FOTOS_NACOES")
    fim = codigo.index("\n};", inicio)
    corpo = re.sub(r"\n  \"(?:[^\"\\]|\\.)*\": \"" + re.escape(ean) + r"\",", "", codigo[inicio:fim])
    return codigo[:inicio] + corpo + codigo[fim:]


def para_webp(dados: bytes) -> bytes:
    try:
        from PIL import Image
    except ImportError:  # só instala quando há foto para converter (poupa ~10 s em toda execução)
        import subprocess

        subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "pillow"], check=True)
        from PIL import Image

    img = Image.open(io.BytesIO(dados)).convert("RGBA")
    fundo = Image.new("RGBA", img.size, (255, 255, 255, 255))
    fundo.alpha_composite(img)
    img = fundo.convert("RGB")
    if img.size != (LADO, LADO):
        img.thumbnail((LADO, LADO))
        tela = Image.new("RGB", (LADO, LADO), (255, 255, 255))
        tela.paste(img, ((LADO - img.width) // 2, (LADO - img.height) // 2))
        img = tela
    saida = io.BytesIO()
    img.save(saida, "WEBP", quality=88, method=6)
    return saida.getvalue()


def chamar(caminho: str, token: str, metodo: str = "GET") -> bytes:
    req = urllib.request.Request(SITE + caminho, method=metodo, headers={"authorization": f"Bearer {token}", "user-agent": "uniao-farma-fotos"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def saida_github(**valores: str) -> None:
    arquivo = os.environ.get("GITHUB_OUTPUT")
    if arquivo:
        with open(arquivo, "a", encoding="utf-8") as f:
            for k, v in valores.items():
                f.write(f"{k}={v}\n")


def baixar() -> int:
    token = os.environ.get("CATALOGO_READ_TOKEN", "").strip()
    if not token:
        saida_github(fotos="false")
        return 0
    try:
        resposta = json.loads(chamar("/api/fotos-pendentes", token))
        lista = resposta.get("fotos", [])
        remover = resposta.get("remover", [])
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as e:
        print(f"Fotos enviadas: não consegui consultar ({e}). Nada a fazer.")
        saida_github(fotos="false")
        return 0
    codigo = MAPA.read_text(encoding="utf-8")
    eans = []
    PASTA.mkdir(parents=True, exist_ok=True)
    for foto in lista:
        ean, nome = str(foto.get("ean", "")), str(foto.get("nome", ""))
        if not re.fullmatch(r"\d{8,14}", ean) or not nome:
            continue
        try:
            webp = para_webp(chamar(f"/api/fotos-pendentes?ean={ean}", token))
        except Exception as e:  # imagem ruim: pula e deixa no Worker para ver depois
            print(f"Fotos enviadas: {ean} ignorada ({e})")
            continue
        (PASTA / f"{ean}.webp").write_bytes(webp)
        codigo = inserir_no_mapa(codigo, nome, ean)
        eans.append(ean)
        print(f"Fotos enviadas: {ean} {nome}")
    for r in remover:
        ean = str(r.get("ean", ""))
        if not re.fullmatch(r"\d{8,14}", ean):
            continue
        codigo = remover_do_mapa(codigo, ean)
        arquivo = PASTA / f"{ean}.webp"
        if arquivo.exists():
            arquivo.unlink()
        eans.append(ean)
        print(f"Fotos removidas: {ean} {r.get('nome', '')}")
    if eans:
        MAPA.write_text(codigo, encoding="utf-8")
    saida_github(fotos="true" if eans else "false", eans=" ".join(eans))
    return 0


def apagar(eans: list) -> int:
    token = os.environ.get("CATALOGO_READ_TOKEN", "").strip()
    for ean in eans:
        if token and re.fullmatch(r"\d{8,14}", ean):
            try:
                chamar(f"/api/fotos-pendentes?ean={ean}", token, "DELETE")
            except (urllib.error.URLError, TimeoutError, OSError) as e:
                print(f"Fotos enviadas: não consegui apagar {ean} ({e})")
    return 0


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "baixar":
        sys.exit(baixar())
    if len(sys.argv) >= 2 and sys.argv[1] == "apagar":
        sys.exit(apagar(sys.argv[2:]))
    print(__doc__)
    sys.exit(2)
