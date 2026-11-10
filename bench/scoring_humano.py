"""Reconstrói a pontuação oficial contra o GABARITO HUMANO.

Gera `results/scoring.csv` com o mesmo schema usado pelo report/PDF, mas
calculando top-1/top-3/macro-F1 sobre as respostas do especialista
(`results/validacao/respostas.json`), e não sobre os rótulos do dataset.

Cada rodada é quebrada por modelo — cinco modelos numa rodada não podem virar
uma linha só.

Uso:
    python -m bench.scoring_humano
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score

from bench.common import RESULTS
from bench.config import PRECOS

RAW = RESULTS / "raw"
VAL = RESULTS / "validacao"
EIXOS = {"modo": "FailMode", "mecanismo": "FailMech", "deteccao": "DetMethod"}
RODADAS = ["local-publicado", "pilot-zero-v2", "pilot-iso-v1",
           "pilot-exemplos-v1", "laya-zeroshot"]


def carregar_respostas() -> dict[str, dict[str, str]]:
    respostas = json.loads((VAL / "respostas.json").read_text(encoding="utf-8"))
    return {v["example_id"]: {e: str(v[e]).strip().upper() for e in EIXOS}
            for v in respostas.values()}


def registros(rodada: str) -> list[dict]:
    caminho = RAW / f"{rodada}.jsonl"
    if not caminho.exists():
        return []
    saida = []
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        if not linha.strip():
            continue
        r = json.loads(linha)
        if r.get("ok") and r.get("rep", 0) == 0:
            saida.append(r)
    return saida


def bootstrap_ic(acertos: list[int], n_iter: int = 2000, seed: int = 42) -> tuple[float, float]:
    if not acertos:
        return float("nan"), float("nan")
    rng = np.random.default_rng(seed)
    arr = np.array(acertos, dtype=float)
    medias = [rng.choice(arr, size=len(arr), replace=True).mean() for _ in range(n_iter)]
    return float(np.percentile(medias, 2.5)), float(np.percentile(medias, 97.5))


def pontuar(lista: list[dict], eixo: str, humano: dict,
            preco: tuple[float, float] = (0.0, 0.0)) -> dict | None:
    top1, top3, ouros, preds, lats = [], [], [], [], []
    custo = tokens_in = tokens_out = tokens_reas = 0.0
    for r in lista:
        eid = r["example_id"]
        if eid not in humano:
            continue
        ouro = humano[eid][eixo]
        pred = [str(c).strip().upper() for c in (r.get("pred", {}).get(eixo) or [])]
        p1 = pred[0] if pred else ""
        top1.append(int(p1 == ouro))
        top3.append(int(ouro in pred[:3]))
        ouros.append(ouro)
        preds.append(p1)
        custo += float(r.get("cost_usd") or 0)
        usage = r.get("usage") or {}
        tokens_in += float(usage.get("prompt_tokens") or 0)
        tokens_out += float(usage.get("completion_tokens") or 0)
        detalhe = usage.get("completion_tokens_details") or {}
        tokens_reas += float(detalhe.get("reasoning_tokens") or 0)
        if r.get("latencia_ms"):
            lats.append(float(r["latencia_ms"]))
    n = len(top1)
    if not n:
        return None
    lo, hi = bootstrap_ic(top1)
    lo3, hi3 = bootstrap_ic(top3)
    custo_in = tokens_in / 1e6 * preco[0]
    custo_reas = tokens_reas / 1e6 * preco[1]
    custo_out = max(tokens_out - tokens_reas, 0) / 1e6 * preco[1]
    return {
        "n": n, "top1": sum(top1) / n, "top1_lo": lo, "top1_hi": hi,
        "top3": sum(top3) / n, "top3_lo": lo3, "top3_hi": hi3,
        "macro_f1": f1_score(ouros, preds, average="macro", zero_division=0),
        "invalidos_pct": 0.0, "json_invalido_pct": 0.0,
        "lat_p50": float(np.median(lats)) if lats else float("nan"),
        "lat_p95": float(np.percentile(lats, 95)) if lats else float("nan"),
        "custo_1k": custo / n * 1000,
        "custo_in_1k": custo_in / n * 1000, "custo_out_1k": custo_out / n * 1000,
        "custo_reasoning_1k": custo_reas / n * 1000,
        "tokens_reasoning_med": tokens_reas / n,
        "tokens_in_med": tokens_in / n, "tokens_out_med": tokens_out / n,
        "custo_total": custo, "mcnemar_p_vs_baseline": float("nan"),
    }


def main() -> None:
    humano = carregar_respostas()
    linhas = []
    for rodada in RODADAS:
        regs = registros(rodada)
        if not regs:
            continue
        variante = {"pilot-iso-v1": "iso", "pilot-exemplos-v1": "exemplos"}.get(rodada, "zero")
        por_modelo: dict[str, list[dict]] = {}
        for r in regs:
            por_modelo.setdefault(r["modelo"], []).append(r)
        for modelo, lista in por_modelo.items():
            preco = PRECOS.get(modelo, (0.0, 0.0))
            for eixo in EIXOS:
                m = pontuar(lista, eixo, humano, preco)
                if not m:
                    continue
                linhas.append({
                    "run_id": rodada, "modelo": modelo,
                    "empresa": lista[0].get("empresa", ""),
                    "tier": lista[0].get("tier", ""), "variante": variante,
                    "eixo": eixo, **m,
                })

    df = pd.DataFrame(linhas)
    destino = RESULTS / "scoring.csv"
    antigo = RESULTS / "scoring_dataset.csv"
    if destino.exists() and not antigo.exists():
        destino.rename(antigo)
    df.to_csv(destino, index=False)

    resumo = (df.groupby(["run_id", "modelo"])
              .agg(top1=("top1", "mean"), top3=("top3", "mean"), f1=("macro_f1", "mean"),
                   custo=("custo_1k", "mean"))
              .round(3).sort_values("top1", ascending=False))
    print(resumo.to_string())
    print(f"\nescrito: {destino}  ({len(df)} linhas)")


if __name__ == "__main__":
    main()
