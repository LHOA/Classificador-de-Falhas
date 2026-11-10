"""Prompt congelado do benchmark.

O mesmo texto é usado para todos os modelos. A taxonomia vem do conjunto de
TREINO (união de treino + avaliação nunca introduz código novo, por construção)
e é ordenada alfabeticamente — nunca por frequência, para não vazar o prior.
"""
from __future__ import annotations

import pandas as pd

from bench.common import EIXOS, IMPACTO_TXT, carregar_taxonomia

SYSTEM = """Voce e um engenheiro de confiabilidade especialista na taxonomia ISO 14224.
Classifique a nota de manutencao em tres eixos, escolhendo APENAS codigos das listas fornecidas.
Responda exclusivamente com JSON valido, sem markdown e sem texto fora do JSON, no formato:
{"modo":[{"codigo":"XXX","confianca":0.00}],"mecanismo":[{"codigo":"X.X","confianca":0.00}],"deteccao":[{"codigo":"X","confianca":0.00}]}
Ordene do mais provavel para o menos provavel, no maximo 3 itens por eixo.
Nao invente codigos: cada codigo precisa existir na lista do eixo correspondente."""

TITULOS = {
    "modo": "TAXONOMIA - MODO DE FALHA (FailMode)",
    "mecanismo": "TAXONOMIA - MECANISMO (FailMech)",
    "deteccao": "TAXONOMIA - METODO DE DETECCAO (DetMethod)",
}


def construir_taxonomia(train_df: pd.DataFrame) -> dict[str, list[dict]]:
    classes = {eixo: set(train_df[col]) for eixo, col in EIXOS.items()}
    return carregar_taxonomia(classes)


def _bloco_taxonomia(tax: dict[str, list[dict]]) -> str:
    partes = []
    for eixo in ("modo", "mecanismo", "deteccao"):
        linhas = [f"{i['codigo']} | {i['texto']}" for i in tax[eixo]]
        partes.append(f"{TITULOS[eixo]}\n" + "\n".join(linhas))
    return "\n\n".join(partes)


def montar_prompt(linha: pd.Series, tax: dict[str, list[dict]]) -> tuple[str, str]:
    impacto = str(linha["FailureImp"]).strip()
    user = (
        "NOTA DE MANUTENCAO\n"
        f"Tag: {linha['Tag']}\n"
        f"Impacto: {impacto}  ({IMPACTO_TXT.get(impacto, 'nao informado')})\n"
        f"Descricao: {linha['Description']}\n\n"
        f"{_bloco_taxonomia(tax)}"
    )
    return SYSTEM, user


def _bloco_taxonomia_iso(tax: dict[str, list[dict]], iso: dict[str, dict[str, str]]) -> str:
    partes = []
    for eixo in ("modo", "mecanismo", "deteccao"):
        linhas = []
        for i in tax[eixo]:
            cod = i["codigo"]
            texto_iso = (iso.get(eixo, {}) or {}).get(cod, "").strip()
            if texto_iso:
                texto_iso = " ".join(texto_iso.split())[:150]
                linhas.append(f"{cod} | {i['texto']} — ISO 14224: {texto_iso}")
            else:
                linhas.append(f"{cod} | {i['texto']}")
        partes.append(f"{TITULOS[eixo]}\n" + "\n".join(linhas))
    return "\n\n".join(partes)


def montar_prompt_iso(
    linha: pd.Series, tax: dict[str, list[dict]], iso: dict[str, dict[str, str]]
) -> tuple[str, str]:
    """Variante enriquecida: cada código traz a descrição da ISO 14224."""
    impacto = str(linha["FailureImp"]).strip()
    user = (
        "NOTA DE MANUTENCAO\n"
        f"Tag: {linha['Tag']}\n"
        f"Impacto: {impacto}  ({IMPACTO_TXT.get(impacto, 'nao informado')})\n"
        f"Descricao: {linha['Description']}\n\n"
        f"{_bloco_taxonomia_iso(tax, iso)}"
    )
    return SYSTEM, user


def montar_indice_exemplos(
    train_df: pd.DataFrame, max_por_codigo: int = 2, max_chars: int = 95
) -> dict[str, dict[str, list[str]]]:
    """Para cada código, as N notas reais mais curtas do conjunto de TREINO.

    Usa só o treino: as notas de avaliação nunca entram como exemplo.
    """
    idx: dict[str, dict[str, list[str]]] = {e: {} for e in EIXOS}
    for eixo, col in EIXOS.items():
        for cod, grupo in train_df.groupby(col):
            notas = {str(d).strip() for d in grupo["Description"]}
            # prefere notas de tamanho médio: as mais curtas costumam ser truncadas
            notas = [n for n in notas if len(n) >= 35]
            notas.sort(key=lambda n: abs(len(n) - 90))
            idx[eixo][str(cod)] = [n[:140] for n in notas[:max_por_codigo]]
    return idx


def _bloco_taxonomia_exemplos(
    tax: dict[str, list[dict]],
    iso: dict[str, dict[str, str]],
    idx: dict[str, dict[str, list[str]]],
) -> str:
    partes = []
    for eixo in ("modo", "mecanismo", "deteccao"):
        linhas = []
        for i in tax[eixo]:
            cod = i["codigo"]
            linha = f"{cod} | {i['texto']}"
            texto_iso = (iso.get(eixo, {}) or {}).get(cod, "").strip()
            if texto_iso:
                linha += f" — ISO 14224: {' '.join(texto_iso.split())[:120]}"
            exemplos = (idx.get(eixo, {}) or {}).get(cod) or []
            if exemplos:
                linha += " — exemplos reais: " + " | ".join(f"“{e}”" for e in exemplos)
            linhas.append(linha)
        partes.append(f"{TITULOS[eixo]}\n" + "\n".join(linhas))
    return "\n\n".join(partes)


def montar_prompt_exemplos(
    linha: pd.Series,
    tax: dict[str, list[dict]],
    iso: dict[str, dict[str, str]],
    idx: dict[str, dict[str, list[str]]],
) -> tuple[str, str]:
    """Variante com ISO 14224 + exemplos reais do histórico por código."""
    impacto = str(linha["FailureImp"]).strip()
    user = (
        "NOTA DE MANUTENCAO\n"
        f"Tag: {linha['Tag']}\n"
        f"Impacto: {impacto}  ({IMPACTO_TXT.get(impacto, 'nao informado')})\n"
        f"Descricao: {linha['Description']}\n\n"
        f"{_bloco_taxonomia_exemplos(tax, iso, idx)}"
    )
    return SYSTEM, user


def exemplo_assistente(linha: pd.Series) -> str:
    """Resposta gabarito de um exemplo few-shot (mesmo formato pedido)."""
    import json

    return json.dumps(
        {
            "modo": [{"codigo": str(linha["FailMode"]), "confianca": 1.0}],
            "mecanismo": [{"codigo": str(linha["FailMech"]), "confianca": 1.0}],
            "deteccao": [{"codigo": str(linha["DetMethod"]), "confianca": 1.0}],
        },
        ensure_ascii=False,
    )


def montar_mensagens_fewshot(
    linha: pd.Series,
    exemplos: pd.DataFrame,
    tax: dict[str, list[dict]],
) -> list[dict]:
    """System + k pares (user/assistant) de exemplos do treino + a nota alvo."""
    system, user = montar_prompt(linha, tax)
    msgs = [{"role": "system", "content": system}]
    for _, ex in exemplos.iterrows():
        _, ex_user = montar_prompt(ex, tax)
        msgs.append({"role": "user", "content": ex_user})
        msgs.append({"role": "assistant", "content": exemplo_assistente(ex)})
    msgs.append({"role": "user", "content": user})
    return msgs
