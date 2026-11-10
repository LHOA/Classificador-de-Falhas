"""Utilidades compartilhadas do benchmark LLM x Failure Map.

Fonte de verdade do pré-processamento: ``Backend/api.py::limpar_texto``.
Qualquer divergência aqui invalida a comparação — o teste ``bench/test_parity.py``
protege isso.
"""
from __future__ import annotations

import os
import re
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
BENCH = REPO / "bench"
API_PY = REPO / "Classificador-de-Falhas-main" / "Backend" / "api.py"
CONSTANTS_TS = REPO / "Classificador-de-Falhas-main" / "Frontend" / "constants.ts"

ARTIFACTS = BENCH / "artifacts"
RESULTS = BENCH / "results"
RAW = RESULTS / "raw"

DATA_CSV = Path(os.environ.get("FAILMAP_DATA", REPO / "data.csv"))

IMPACTOS = {"D", "S", "U", "X"}
IMPACTO_TXT = {
    "D": "D - falha critica / parada",
    "S": "S - falha degradada",
    "U": "U - falha incipiente",
    "X": "X - outros",
}

# eixo -> coluna de rótulo no dataset
EIXOS = {"modo": "FailMode", "mecanismo": "FailMech", "deteccao": "DetMethod"}

for _d in (ARTIFACTS, RESULTS, RAW):
    _d.mkdir(parents=True, exist_ok=True)


# --- pré-processamento: réplica exata do deploy --------------------------------

def _carregar_stopwords() -> set[str]:
    try:
        from nltk.corpus import stopwords

        return set(stopwords.words("portuguese"))
    except LookupError:  # pragma: no cover - primeira execução
        import nltk

        nltk.download("stopwords", quiet=True)
        from nltk.corpus import stopwords

        return set(stopwords.words("portuguese"))


STOPWORDS = _carregar_stopwords()


def limpar_texto(texto) -> str:
    """Igual a ``Backend/api.py::limpar_texto`` — NÃO remove acentos."""
    if not isinstance(texto, str):
        return ""
    texto = texto.lower()
    texto = re.sub(r"\d+", "", texto)
    texto = re.sub(r"[^\w\s]", "", texto)
    return " ".join(p for p in texto.split() if p not in STOPWORDS)


# --- dados --------------------------------------------------------------------

def carregar_dados() -> pd.DataFrame:
    """Lê o data.csv, remove as 4 linhas corrompidas e normaliza colunas.

    ``dtype=str`` é obrigatório: sem ele o pandas converte FailMech em float e
    ``1.10`` vira ``1.1`` (código diferente), ``11`` vira ``11.0``.
    """
    df = pd.read_csv(
        DATA_CSV,
        sep=";",
        encoding="utf-8-sig",
        on_bad_lines="skip",
        dtype={
            "Tag": str,
            "Description": str,
            "FailureImp": str,
            "FailMode": str,
            "FailMech": str,
            "DetMethod": str,
        },
    )
    df = df[df["FailureImp"].isin(IMPACTOS)].copy()
    df["Tag"] = df["Tag"].fillna("N/A").astype(str).str.strip()
    df["Description"] = df["Description"].astype(str).str.strip()
    df["FailureImp"] = df["FailureImp"].astype(str).str.strip()
    for col in EIXOS.values():
        df[col] = df[col].astype(str).str.strip()
    df = df[df["Description"].str.len() > 0]
    return df.reset_index(drop=True)


# --- taxonomia ----------------------------------------------------------------

def _parse_api_maps() -> dict[str, dict[str, str]]:
    src = API_PY.read_text(encoding="utf-8")
    out: dict[str, dict[str, str]] = {}
    for nome, eixo in (("map_mode", "modo"), ("map_mech", "mecanismo"), ("map_det", "deteccao")):
        bloco = re.search(rf"^{nome} = \{{(.*?)^\}}", src, re.S | re.M)
        if bloco:
            out[eixo] = dict(re.findall(r"'([^']+)': '([^']*)'", bloco.group(1)))
    return out


def _parse_constants() -> dict[str, dict[str, tuple[str, str]]]:
    src = CONSTANTS_TS.read_text(encoding="utf-8")
    out: dict[str, dict[str, tuple[str, str]]] = {}
    padrao = re.compile(
        r"""['"]([^'"]+)['"]\s*:\s*\{\s*pt:\s*['"]([^'"]*)['"]\s*,\s*en:\s*['"]([^'"]*)['"]\s*\}"""
    )
    for nome, eixo in (("MAP_MODE", "modo"), ("MAP_MECH", "mecanismo"), ("MAP_DET", "deteccao")):
        bloco = re.search(rf"export const {nome}[^=]*= \{{(.*?)^\}};", src, re.S | re.M)
        if bloco:
            out[eixo] = {c: (pt, en) for c, pt, en in padrao.findall(bloco.group(1))}
    return out


def carregar_taxonomia(classes_por_eixo: dict[str, set[str]]) -> dict[str, list[dict]]:
    """Devolve, por eixo, a lista ordenada de códigos com descrição PT/EN.

    Precedência: ``Frontend/constants.ts`` (pt+en) > ``Backend/api.py`` > genérico.
    O universo de códigos é o das classes observadas no dataset.
    """
    api = _parse_api_maps()
    const = _parse_constants()
    tax: dict[str, list[dict]] = {}
    for eixo, classes in classes_por_eixo.items():
        itens = []
        for cod in sorted(classes):
            pt = en = None
            if eixo in const and cod in const[eixo]:
                pt, en = const[eixo][cod]
            elif eixo in api and cod in api[eixo]:
                desc = api[eixo][cod]
                pt = en = desc
            itens.append(
                {
                    "codigo": cod,
                    "texto": f"{pt} / {en}" if pt else "(sem descricao no dicionario)",
                }
            )
        tax[eixo] = itens
    return tax
