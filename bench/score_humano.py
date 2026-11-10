"""Re-pontua os modelos contra o gabarito humano (validação cega).

Lê `results/validacao/respostas.json` (nota → códigos escolhidos pelo especialista)
e as previsões cruas de cada rodada, e calcula top-1 por modelo e por eixo nas
notas efetivamente validadas.

Uso:
    python -m bench.score_humano
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from bench.common import RESULTS

RAW = RESULTS / "raw"
VAL = RESULTS / "validacao"
EIXOS = {"modo": "FailMode", "mecanismo": "FailMech", "deteccao": "DetMethod"}

# rodada → rótulo legível
RODADAS = {
    "local-publicado": "XGBoost (publicado)",
    "local-heldout": "XGBoost (sem as notas de teste)",
    "pilot-zero-v2": "LLM — prompt base",
    "pilot-iso-v1": "LLM — + ISO 14224",
    "pilot-exemplos-v1": "LLM — ISO + exemplos",
    "laya-zeroshot": "Laya (zero-shot)",
}


def carregar_humano() -> dict[str, dict]:
    respostas = json.loads((VAL / "respostas.json").read_text(encoding="utf-8"))
    ev = pd.read_csv(RESULTS / "eval_set.csv", dtype=str).set_index("example_id")
    humano = {}
    for _, item in respostas.items():
        eid = item["example_id"]
        humano[eid] = {eixo: str(item[eixo]).strip().upper() for eixo in EIXOS}
    return humano, ev


def previsoes(rodada: str) -> dict[str, dict[str, str]]:
    caminho = RAW / f"{rodada}.jsonl"
    if not caminho.exists():
        return {}
    saida: dict[str, dict[str, str]] = {}
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        if not linha.strip():
            continue
        r = json.loads(linha)
        if not r.get("ok") or r.get("rep", 0) != 0:
            continue
        saida[r["example_id"]] = {
            eixo: (r.get("pred", {}).get(eixo) or [""])[0].strip().upper() for eixo in EIXOS
        }
    return saida


def main() -> None:
    humano, ev = carregar_humano()
    notas = sorted(humano)
    print(f"notas validadas: {len(notas)}\n")

    linhas = []
    for rodada, nome in RODADAS.items():
        pred = previsoes(rodada)
        if not pred:
            continue
        por_eixo = {e: [0, 0] for e in EIXOS}
        for eid in notas:
            if eid not in pred:
                continue
            for eixo in EIXOS:
                ok = int(pred[eid][eixo] == humano[eid][eixo])
                por_eixo[eixo][0] += ok
                por_eixo[eixo][1] += 1
        tot_ok = sum(v[0] for v in por_eixo.values())
        tot_n = sum(v[1] for v in por_eixo.values())
        if not tot_n:
            continue
        linhas.append([
            nome,
            *[f"{por_eixo[e][0]}/{por_eixo[e][1]}" for e in EIXOS],
            f"{tot_ok}/{tot_n}",
            f"{tot_ok / tot_n:.0%}",
        ])

    df = pd.DataFrame(linhas, columns=["Modelo", "Modo", "Mecanismo", "Detecção", "Total", "Top-1"])
    print(df.to_string(index=False))
    df.to_csv(VAL / "score_humano.csv", index=False)
    print(f"\nsalvo: {VAL / 'score_humano.csv'}")

    # quanto o gabarito original concordava com o humano
    igual = sum(int(str(ev.loc[eid, col]).strip().upper() == humano[eid][eixo])
                for eid in notas for eixo, col in EIXOS.items())
    total = len(notas) * len(EIXOS)
    print(f"\ngabarito original × humano: {igual}/{total} = {igual / total:.0%}")


if __name__ == "__main__":
    main()
