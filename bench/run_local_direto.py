"""Avalia um .pkl diretamente (sem HTTP) — usado só para medir o vazamento
do modelo publicado (que viu as notas de treino). Não mede latência.

Uso:
    python -m bench.run_local_direto --run-id local-publicado \
        --pkl Classificador-de-Falhas-main/Backend/modelo_classificacao_falhas.pkl
"""
from __future__ import annotations

import argparse
import json
import warnings

import joblib
import numpy as np
import pandas as pd

from bench.common import EIXOS, RAW, RESULTS, limpar_texto

warnings.filterwarnings("ignore")

MAPA = {"modo": "FailMode", "mecanismo": "FailMech", "deteccao": "DetMethod"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--pkl", required=True)
    ap.add_argument("--modelo", default=None)
    args = ap.parse_args()
    modelo = args.modelo or args.run_id

    art = joblib.load(args.pkl)
    modelos, encoders = art["modelos"], art["encoders"]
    ev = pd.read_csv(RESULTS / "eval_set.csv", dtype=str)

    destino = RAW / f"{args.run_id}.jsonl"
    with destino.open("w", encoding="utf-8") as fh:
        for _, linha in ev.iterrows():
            df_input = pd.DataFrame(
                {
                    "Tag": [linha["Tag"]],
                    "FailureImp": [linha["FailureImp"]],
                    "Description": [linha["Description"]],
                }
            )
            df_input["TEXTO_LIMPO"] = limpar_texto(linha["Description"])
            pred, conf = {}, {}
            for eixo, col in MAPA.items():
                probs = modelos[col].predict_proba(df_input)[0]
                top = np.argsort(probs)[-3:][::-1]
                pred[eixo] = [str(encoders[col].inverse_transform([i])[0]) for i in top]
                conf[eixo] = [float(probs[i]) for i in top]
            registro = {
                "run_id": args.run_id,
                "ts": None,
                "modelo": modelo,
                "empresa": "Failure Map (local)",
                "tier": "baseline",
                "variante": "zero",
                "example_id": linha["example_id"],
                "rep": 0,
                "ok": True,
                "erro": None,
                "latencia_ms": None,
                "usage": {},
                "cost_usd": 0.0,
                "pred": pred,
                "confianca": conf,
                "invalidos": {e: [] for e in EIXOS},
                "json_ok": True,
                "precisou_reparo": False,
            }
            fh.write(json.dumps(registro, ensure_ascii=False) + "\n")
    print(f"{len(ev)} notas avaliadas -> {destino}")


if __name__ == "__main__":
    main()
