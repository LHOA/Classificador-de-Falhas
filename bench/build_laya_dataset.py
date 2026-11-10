"""Monta o dataset no formato nativo do Laya para fine-tune.

Formato: {"state", "questions", "gold": {qid: {"probabilities": {opcao: 1.0}}}}

Treino = train_set.csv (menos 400 linhas de validação interna)
Validação = 400 linhas do train_set (NÃO são as 15 notas do benchmark)

Uso:
    python -m bench.build_laya_dataset
"""
from __future__ import annotations

import json

import pandas as pd

from bench.common import EIXOS, RESULTS

DTYPES = {"Tag": str, "Description": str, "FailureImp": str,
          "FailMode": str, "FailMech": str, "DetMethod": str}

INSTRUCOES = {
    "modo": "Qual é o modo de falha (ISO 14224) descrito nesta nota de manutenção?",
    "mecanismo": "Qual é o mecanismo de falha (ISO 14224) descrito nesta nota de manutenção?",
    "deteccao": "Qual foi o método de detecção (ISO 14224) desta falha?",
}
N_VALIDACAO = 400


def label(codigo: str, curto: str) -> str:
    return f"{codigo} — {curto}"


def main() -> None:
    tax = json.loads((RESULTS / "taxonomia.json").read_text(encoding="utf-8"))
    rotulos = {e: {i["codigo"]: label(i["codigo"], i["curto"]) for i in itens} for e, itens in tax.items()}

    questions = {
        e: {"type": "choice", "instructions": INSTRUCOES[e],
            "criteria": {r: None for r in rotulos[e].values()}}
        for e in EIXOS
    }

    tr = pd.read_csv(RESULTS / "train_set.csv", dtype=DTYPES)
    val = tr.sample(N_VALIDACAO, random_state=7)
    train = tr.drop(val.index)

    destino = RESULTS / "laya"
    destino.mkdir(exist_ok=True)

    def escrever(df: pd.DataFrame, caminho) -> None:
        with caminho.open("w", encoding="utf-8") as fh:
            for _, linha in df.iterrows():
                gold = {}
                for eixo, col in EIXOS.items():
                    cod = str(linha[col]).strip()
                    if cod in rotulos[eixo]:
                        gold[eixo] = {"probabilities": {rotulos[eixo][cod]: 1.0}}
                if len(gold) < 3:
                    continue
                state = (
                    "Nota de manutenção industrial.\n"
                    f"Tag do equipamento: {linha['Tag']}\n"
                    f"Impacto: {linha['FailureImp']}\n"
                    f"Descrição: {linha['Description']}"
                )
                fh.write(json.dumps({"state": state, "questions": questions, "gold": gold},
                                    ensure_ascii=False) + "\n")

    escrever(train, destino / "train_falhas.jsonl")
    escrever(val, destino / "val_falhas.jsonl")
    print("treino:", len(train), "| validação:", len(val), "| opções:", {e: len(rotulos[e]) for e in EIXOS})
    print("escrito em", destino)


if __name__ == "__main__":
    main()
