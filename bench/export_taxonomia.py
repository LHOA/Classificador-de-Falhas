"""Exporta a taxonomia (código + nome curto) para o runner do Laya.

Roda no venv do bench (tem pandas). Gera results/taxonomia.json.

Uso:
    python -m bench.export_taxonomia
"""
from __future__ import annotations

import json

import pandas as pd

from bench.common import EIXOS, RESULTS, carregar_taxonomia
from bench.report import curto

DTYPES = {"FailMode": str, "FailMech": str, "DetMethod": str}


def main() -> None:
    tr = pd.read_csv(RESULTS / "train_set.csv", dtype=DTYPES)
    tax = carregar_taxonomia({e: set(tr[c]) for e, c in EIXOS.items()})
    saida = {
        eixo: [{"codigo": i["codigo"], "curto": curto(i["codigo"], eixo)} for i in itens]
        for eixo, itens in tax.items()
    }
    destino = RESULTS / "taxonomia.json"
    destino.write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")
    print("escrito:", destino, "|", {k: len(v) for k, v in saida.items()})


if __name__ == "__main__":
    main()
