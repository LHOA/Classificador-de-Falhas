"""Pontua os resultados: acurácia top-1/top-3, macro-F1, inválidos, custo,
latência, determinismo e McNemar pareado contra o baseline local.

Uso:
    python -m bench.score --runs local-heldout,pilot-v1
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import binomtest
from sklearn.metrics import f1_score

from bench.common import EIXOS, RAW, RESULTS

SEED = 42
N_BOOT = 1000


def carregar(run_ids: list[str]) -> pd.DataFrame:
    registros = []
    for run_id in run_ids:
        caminho = RAW / f"{run_id}.jsonl"
        if not caminho.exists():
            print(f"AVISO: {caminho.name} não encontrado — ignorado")
            continue
        for linha in caminho.read_text(encoding="utf-8").splitlines():
            if linha.strip():
                registros.append(json.loads(linha))
    df = pd.DataFrame(registros)
    if df.empty:
        raise SystemExit("nenhum registro encontrado")
    return df


def bootstrap_ic(acertos: np.ndarray, rng: np.random.Generator) -> tuple[float, float]:
    if len(acertos) == 0:
        return (np.nan, np.nan)
    medias = rng.choice(acertos, size=(N_BOOT, len(acertos)), replace=True).mean(axis=1)
    return float(np.percentile(medias, 2.5)), float(np.percentile(medias, 97.5))


def mcnemar(acertos_a: np.ndarray, acertos_b: np.ndarray) -> float:
    b = int(((acertos_a == 0) & (acertos_b == 1)).sum())
    c = int(((acertos_a == 1) & (acertos_b == 0)).sum())
    if b + c == 0:
        return 1.0
    return float(binomtest(min(b, c), b + c, 0.5).pvalue)


def avaliar(reg: pd.DataFrame, ev: pd.DataFrame, eixo: str) -> dict:
    col = EIXOS[eixo]
    amostra = ev[ev["eixos"].str.contains(eixo)]
    gold = dict(zip(amostra["example_id"], amostra[col].astype(str)))
    sub = reg[reg["example_id"].isin(gold) & (reg["rep"] == 0)].copy()
    if sub.empty:
        return {"n": 0}
    sub = sub.drop_duplicates(subset=["example_id"], keep="first")
    sub["gold"] = sub["example_id"].map(gold)
    sub["pred1"] = sub["pred"].map(lambda p: (p.get(eixo) or [""])[0] if p else "")
    sub["top3"] = sub["pred"].map(lambda p: (p.get(eixo) or [])[:3] if p else [])
    sub["acerto1"] = (sub["pred1"] == sub["gold"]).astype(int)
    sub["acerto3"] = [int(g in t) for g, t in zip(sub["gold"], sub["top3"])]
    sub["invalido"] = sub["invalidos"].map(lambda d: len(d.get(eixo) or []) > 0).astype(int)
    sub["json_fail"] = (~sub["json_ok"].fillna(False)).astype(int)

    rng = np.random.default_rng(SEED)
    a1 = sub["acerto1"].to_numpy()
    a3 = sub["acerto3"].to_numpy()
    lo1, hi1 = bootstrap_ic(a1, rng)
    lo3, hi3 = bootstrap_ic(a3, rng)
    from bench.config import PRECOS

    pi, po = PRECOS.get(str(sub["modelo"].iloc[0]), (0.0, 0.0))
    tin = sub["usage"].map(lambda u: (u or {}).get("prompt_tokens", 0))
    tout = sub["usage"].map(lambda u: (u or {}).get("completion_tokens", 0))
    try:
        macro_f1 = float(
            f1_score(sub["gold"], sub["pred1"], average="macro", zero_division=0)
        )
    except Exception:  # noqa: BLE001
        macro_f1 = np.nan

    return {
        "n": len(sub),
        "top1": a1.mean(),
        "top1_lo": lo1,
        "top1_hi": hi1,
        "top3": a3.mean(),
        "top3_lo": lo3,
        "top3_hi": hi3,
        "macro_f1": macro_f1,
        "invalidos_pct": sub["invalido"].mean() * 100,
        "json_invalido_pct": sub["json_fail"].mean() * 100,
        "lat_p50": sub["latencia_ms"].median(),
        "lat_p95": sub["latencia_ms"].quantile(0.95),
        "custo_1k": sub["cost_usd"].mean() * 1000,
        "custo_in_1k": float(tin.mean()) * pi / 1e6 * 1000,
        "custo_out_1k": float(tout.mean()) * po / 1e6 * 1000,
        "tokens_in_med": float(tin.mean()),
        "tokens_out_med": float(tout.mean()),
        "custo_total": sub["cost_usd"].sum(),
        "_acertos": dict(zip(sub["example_id"], a1)),
    }


def determinismo(reg: pd.DataFrame) -> pd.DataFrame:
    multi = reg[reg["rep"] > 0]
    if multi.empty:
        return pd.DataFrame()
    linhas = []
    for (modelo, example_id), grupo in multi.groupby(["modelo", "example_id"]):
        for eixo in EIXOS:
            tops = [((p or {}).get(eixo) or [""])[0] for p in grupo["pred"]]
            if len(tops) > 1:
                linhas.append(
                    {
                        "modelo": modelo,
                        "example_id": example_id,
                        "eixo": eixo,
                        "repeticoes": len(tops),
                        "concordancia": tops.count(pd.Series(tops).mode()[0]) / len(tops),
                    }
                )
    return pd.DataFrame(linhas)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", required=True, help="run_ids separados por vírgula")
    ap.add_argument("--det-runs", default="", help="run_ids usados só para determinismo")
    ap.add_argument("--baseline", default="local_heldout")
    args = ap.parse_args()

    ev = pd.read_csv(
        RESULTS / "eval_set.csv",
        dtype={"FailMode": str, "FailMech": str, "DetMethod": str,
               "example_id": str, "eixos": str},
    )
    reg = carregar(args.runs.split(","))

    linhas = []
    acertos_por_chave: dict[tuple, dict] = {}
    for (run_id, modelo, variante), grupo in reg.groupby(["run_id", "modelo", "variante"]):
        empresa = grupo["empresa"].iloc[0]
        tier = grupo["tier"].iloc[0]
        for eixo in EIXOS:
            m = avaliar(grupo, ev, eixo)
            if not m.get("n"):
                continue
            acertos_por_chave[(modelo, variante, eixo)] = m.pop("_acertos")
            linhas.append(
                {
                    "run_id": run_id,
                    "modelo": modelo,
                    "empresa": empresa,
                    "tier": tier,
                    "variante": variante,
                    "eixo": eixo,
                    **m,
                }
            )

    res = pd.DataFrame(linhas)

    # McNemar contra o baseline, no mesmo eixo e nos mesmos exemplos
    pvals = []
    for _, linha in res.iterrows():
        base = acertos_por_chave.get((args.baseline, "zero", linha["eixo"]))
        atual = acertos_por_chave.get((linha["modelo"], linha["variante"], linha["eixo"]))
        if base is None or atual is None or linha["modelo"] == args.baseline:
            pvals.append(np.nan)
            continue
        comuns = sorted(set(base) & set(atual))
        a = np.array([base[i] for i in comuns])
        b = np.array([atual[i] for i in comuns])
        pvals.append(mcnemar(a, b))
    res["mcnemar_p_vs_baseline"] = pvals

    res.to_csv(RESULTS / "scoring.csv", index=False)

    det = determinismo(reg) if args.det_runs else pd.DataFrame()
    if args.det_runs:
        det = determinismo(carregar(args.det_runs.split(",")))
    if not det.empty:
        det.to_csv(RESULTS / "determinismo.csv", index=False)
        resumo_det = det.groupby("modelo")["concordancia"].mean().sort_values(ascending=False)
        print("\n--- determinismo (concordância top-1 em repetições) ---")
        print(resumo_det.round(3).to_string())

    pd.set_option("display.width", 200)
    colunas = [
        "modelo",
        "variante",
        "eixo",
        "n",
        "top1",
        "top3",
        "macro_f1",
        "invalidos_pct",
        "custo_1k",
        "lat_p50",
    ]
    print("\n--- resultado ---")
    print(res[colunas].round(3).to_string(index=False))
    print(f"\nsalvo: {RESULTS / 'scoring.csv'}")


if __name__ == "__main__":
    main()
