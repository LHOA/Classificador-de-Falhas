"""Avalia o classificador local (API) no mesmo conjunto de avaliação.

Requer a API de pé, apontando para o modelo desejado:
    MODEL_PATH=bench/artifacts/modelo_heldout.pkl \
        python -m uvicorn api:app --port 8001 \
        --app-dir Classificador-de-Falhas-main/Backend

Uso:
    python -m bench.run_local --run-id local-heldout --modelo local_heldout
"""
from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone

import pandas as pd
import requests

from bench.common import EIXOS, RAW, RESULTS

URL = "http://127.0.0.1:8001/classificar"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--modelo", default="local_heldout")
    ap.add_argument("--url", default=URL)
    ap.add_argument("--warm-up", type=int, default=5)
    args = ap.parse_args()

    ev = pd.read_csv(RESULTS / "eval_set.csv")

    # warm-up: descarta as primeiras chamadas (JIT, cache de import)
    for _ in range(args.warm_up):
        requests.post(
            args.url,
            json={"tag": "WARMUP", "descricao": "teste de aquecimento do modelo", "impacto": "S"},
            timeout=60,
        )

    destino = RAW / f"{args.run_id}.jsonl"
    with destino.open("w", encoding="utf-8") as fh:
        for _, linha in ev.iterrows():
            corpo = {
                "tag": str(linha["Tag"]),
                "descricao": str(linha["Description"]),
                "impacto": str(linha["FailureImp"]),
            }
            inicio = time.perf_counter()
            resp = requests.post(args.url, json=corpo, timeout=60)
            latencia_ms = (time.perf_counter() - inicio) * 1000
            resp.raise_for_status()
            dados = resp.json()

            pred = {
                "modo": [i["codigo"] for i in dados["modo"]],
                "mecanismo": [i["codigo"] for i in dados["mecanismo"]],
                "deteccao": [i["codigo"] for i in dados["deteccao"]],
            }
            confianca = {e: [i["confianca"] for i in dados[e]] for e in EIXOS}
            registro = {
                "run_id": args.run_id,
                "ts": datetime.now(timezone.utc).isoformat(),
                "modelo": args.modelo,
                "empresa": "Failure Map (local)",
                "tier": "baseline",
                "variante": "zero",
                "example_id": linha["example_id"],
                "rep": 0,
                "ok": True,
                "erro": None,
                "latencia_ms": latencia_ms,
                "usage": {},
                "cost_usd": 0.0,
                "pred": pred,
                "confianca": confianca,
                "invalidos": {e: [] for e in EIXOS},
                "json_ok": True,
                "precisou_reparo": False,
            }
            fh.write(json.dumps(registro, ensure_ascii=False) + "\n")
            fh.flush()
    print(f"{len(ev)} notas avaliadas -> {destino}")


if __name__ == "__main__":
    main()
