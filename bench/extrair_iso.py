"""Extrai descrições e exemplos da ISO 14224 (PDF ABNT) por código.

Estratégia determinística: usa os códigos conhecidos como âncora.
- Modo de falha (Tabelas B.6–B.12): descrição e exemplo vêm ANTES do código.
- Mecanismo (B.2) e detecção (B.4): nome e descrição vêm DEPOIS do código.

Nada é gerado por modelo — o que não for encontrado fica sem texto ISO.

Uso:
    python bench/extrair_iso.py
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

import fitz

RAIZ = Path(__file__).resolve().parent
RESULTS = RAIZ / "results"
EIXOS = {"modo": "FailMode", "mecanismo": "FailMech", "deteccao": "DetMethod"}

PDF = Path(os.environ.get("ISO_14224_PDF", RAIZ.parent / "ISO 14224.pdf"))

PAG_MECANISMO = range(157, 160)
PAG_DETECCAO = range(163, 164)
PAG_MODOS = range(167, 183)

RUIDO = re.compile(
    r"^(X|—|-|\.|© ISO.*|Exemplar para uso.*|Impresso por.*|"
    r"Norma para conhecimento|ABNT NBR ISO 14224:2011|\d{2,3})$"
)
CODIGO_MODO = re.compile(r"^[A-Z]{2,3}$")
CODIGO_MEC = re.compile(r"^\d{1,2}\.\d{1,2}$")
CABECALHO = re.compile(r"^(Tabela B\.|Notação|Número|Descrição|Código|Tipo|Exemplos|Atividade)")


def linhas_uteis(texto: str, manter_digitos: bool = False) -> list[str]:
    saida = []
    for linha in texto.split("\n"):
        t = linha.strip()
        if not t:
            continue
        if not manter_digitos and re.fullmatch(r"\d{1,2}", t):
            continue
        if RUIDO.match(t):
            continue
        if CABECALHO.match(t) or "Modos de falha" in t or "Mecanismo de falha" in t:
            continue
        saida.append(t)
    return saida


def _parar(t: str, padrao: re.Pattern) -> bool:
    return bool(padrao.match(t)) or bool(re.fullmatch(r"\d{1,2}", t)) or bool(CODIGO_MODO.match(t))


def capturar_antes(linhas: list[str], i: int, janela: int = 6, manter: int = 2) -> str:
    """Pega as linhas mais informativas antes do código (fragmentos curtos são ruído de coluna)."""
    candidatas = []
    j = i - 1
    while j >= 0 and len(candidatas) < janela:
        t = linhas[j]
        if CODIGO_MODO.match(t) or CODIGO_MEC.match(t):
            break
        candidatas.append((j, t))
        j -= 1
    candidatas.reverse()
    boas = [t for _, t in sorted(candidatas, key=lambda kv: -len(kv[1]))[:manter]]
    # devolve na ordem original
    ordem = {t: k for k, (_, t) in enumerate(candidatas)}
    boas.sort(key=lambda t: ordem.get(t, 0))
    return " ".join(boas).strip()


def capturar_depois(linhas: list[str], i: int, janela: int = 4) -> str:
    partes = []
    j = i + 1
    while j < len(linhas) and len(partes) < janela:
        t = linhas[j]
        if _parar(t, CODIGO_MEC):
            break
        if len(t) > 3:  # descarta fragmentos de uma letra/palavra solta
            partes.append(t)
        j += 1
    return " ".join(partes).strip()


RUIDO_INICIAL = re.compile(
    r"^(expansor|combustão|compressor|gerador|motor|turbina|bomba|válvula|top drive|"
    r"turbo|elétrico|a gás|de vapor|\d+ \(\d+\))\s+",
    re.I,
)


def limpar(texto: str) -> str:
    anterior = None
    while anterior != texto:
        anterior = texto
        texto = RUIDO_INICIAL.sub("", texto).strip()
    return texto


def extrair(codigos_por_eixo: dict[str, set[str]]) -> dict[str, dict[str, str]]:
    doc = fitz.open(PDF)
    resultado: dict[str, dict[str, str]] = {e: {} for e in EIXOS}

    # mecanismos: B.2 — nome + descrição DEPOIS do código
    for num in PAG_MECANISMO:
        linhas = linhas_uteis(doc[num].get_text())
        for i, linha in enumerate(linhas):
            if CODIGO_MEC.match(linha) and linha in codigos_por_eixo["mecanismo"]:
                texto = capturar_depois(linhas, i, janela=3)
                if len(texto) > 20 and linha not in resultado["mecanismo"]:
                    resultado["mecanismo"][linha] = texto

    # detecção: B.4 — nome + descrição DEPOIS do número
    for num in PAG_DETECCAO:
        linhas = linhas_uteis(doc[num].get_text(), manter_digitos=True)
        for i, linha in enumerate(linhas):
            if re.fullmatch(r"\d{1,2}", linha) and linha in codigos_por_eixo["deteccao"]:
                texto = capturar_depois(linhas, i, janela=3)
                if len(texto) > 20 and linha not in resultado["deteccao"]:
                    resultado["deteccao"][linha] = texto

    # modos de falha: B.6–B.12 — descrição + exemplo ANTES do código
    for num in PAG_MODOS:
        linhas = linhas_uteis(doc[num].get_text())
        for i, linha in enumerate(linhas):
            if CODIGO_MODO.match(linha) and linha in codigos_por_eixo["modo"]:
                texto = capturar_antes(linhas, i, janela=5)
                if len(texto) > 12:
                    atual = resultado["modo"].get(linha, "")
                    if len(texto) > len(atual):
                        resultado["modo"][linha] = texto
    return resultado


def main() -> None:
    tax = json.loads((RESULTS / "taxonomia.json").read_text(encoding="utf-8"))
    codigos = {e: {i["codigo"] for i in itens} for e, itens in tax.items()}

    extraido = extrair(codigos)
    cobertura = {e: f"{len(extraido[e])}/{len(codigos[e])}" for e in EIXOS}

    destino = RESULTS / "iso14224_textos.json"
    destino.write_text(json.dumps(extraido, ensure_ascii=False, indent=1), encoding="utf-8")
    print("cobertura:", cobertura)
    print("escrito:", destino)

    for eixo in EIXOS:
        print(f"\n--- {eixo} ---")
        for cod in list(extraido[eixo])[:5]:
            print(f"  {cod}: {extraido[eixo][cod][:120]}")


if __name__ == "__main__":
    main()
