"""Avalia o Laya (convaiinnovations/laya) no mesmo conjunto de avaliação.

Laya é encoder + cabeças de decisão: devolve distribuição de probabilidade sobre
as opções de cada pergunta — mapeia direto para top-1/top-3.

Este script roda no venv do Laya (LAYAVENV), que NÃO tem
pandas nem matplotlib — por isso usa só a stdlib e lê:
    bench/results/eval_set.csv     (csv.DictReader)
    bench/results/taxonomia.json   (gerado por bench.export_taxonomia)

Uso:
    $LAYAVENV/Scripts/python.exe bench/run_laya.py
"""
from __future__ import annotations

import argparse
import csv
import json
import time
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
RESULTS = RAIZ / "results"
RAW = RESULTS / "raw"
EXEMPLOS = ["modo", "mecanismo", "deteccao"]

INSTRUCOES = {
    "modo": "Qual é o modo de falha (ISO 14224) descrito nesta nota de manutenção?",
    "mecanismo": "Qual é o mecanismo de falha (ISO 14224) descrito nesta nota de manutenção?",
    "deteccao": "Qual foi o método de detecção (ISO 14224) desta falha?",
}


def ler_csv(caminho: Path) -> list[dict]:
    with caminho.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def montar_questions() -> tuple[dict, dict[str, dict[str, str]]]:
    tax = json.loads((RESULTS / "taxonomia.json").read_text(encoding="utf-8"))
    questions, mapa = {}, {}
    for eixo in EXEMPLOS:
        opcoes, m = {}, {}
        for item in tax[eixo]:
            rotulo = f"{item['codigo']} — {item['curto']}"
            opcoes[rotulo] = None
            m[rotulo] = item["codigo"]
        questions[eixo] = {
            "type": "choice",
            "instructions": INSTRUCOES[eixo],
            "criteria": opcoes,
        }
        mapa[eixo] = m
    return questions, mapa


def montar_state(linha: dict) -> str:
    return (
        "Nota de manutenção industrial.\n"
        f"Tag do equipamento: {linha['Tag']}\n"
        f"Impacto: {linha['FailureImp']}\n"
        f"Descrição: {linha['Description']}"
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", default="laya-zeroshot")
    ap.add_argument("--modelo-id", default="laya-zeroshot")
    ap.add_argument("--model", default=str(Path.home() / "laya-project" / "laya-base" / "multilingual"))
    ap.add_argument("--device", default="auto")
    args = ap.parse_args()

    from laya import Agent

    ev = ler_csv(RESULTS / "eval_set.csv")
    questions, mapa = montar_questions()
    print(f"notas: {len(ev)} | opções: { {e: len(mapa[e]) for e in EXEMPLOS} }", flush=True)

    print(f"carregando Laya de {args.model} ...", flush=True)
    ag = Agent(model_id_or_path=args.model, device=args.device)
    print("modelo carregado", flush=True)

    destino = RAW / f"{args.run_id}.jsonl"
    with destino.open("w", encoding="utf-8") as fh:
        for linha in ev:
            inicio = time.perf_counter()
            try:
                res = ag.decide(montar_state(linha), questions=questions, return_details=True)
                probs = res.probabilities or {}
                erro = None
            except Exception as exc:  # noqa: BLE001
                probs, erro = {}, f"{type(exc).__name__}: {exc}"
            latencia_ms = (time.perf_counter() - inicio) * 1000

            pred, conf = {}, {}
            for eixo in EXEMPLOS:
                p = probs.get(eixo) or {}
                ranking = sorted(p.items(), key=lambda kv: kv[1], reverse=True)[:3]
                pred[eixo] = [mapa[eixo].get(rot, rot) for rot, _ in ranking]
                conf[eixo] = [float(v) for _, v in ranking]

            registro = {
                "run_id": args.run_id,
                "ts": datetime.now(timezone.utc).isoformat(),
                "modelo": args.modelo_id,
                "empresa": "Laya (local)",
                "tier": "local",
                "variante": "zero",
                "example_id": linha["example_id"],
                "rep": 0,
                "ok": erro is None,
                "erro": erro,
                "latencia_ms": latencia_ms,
                "usage": {},
                "cost_usd": 0.0,
                "pred": pred,
                "confianca": conf,
                "invalidos": {e: [] for e in EXEMPLOS},
                "json_ok": erro is None,
                "precisou_reparo": False,
            }
            fh.write(json.dumps(registro, ensure_ascii=False) + "\n")
            fh.flush()
            print(f"  {linha['example_id']} {latencia_ms:6.0f} ms  modo={pred['modo'][:1]}", flush=True)

    print("resultados:", destino)


if __name__ == "__main__":
    main()
