"""Gera eval_set.csv (nunca visto pelo modelo local) e train_set.csv.

Regra de amostragem
-------------------
* Só entram classes com **>= 3** exemplos, para que a classe sobreviva no treino
  depois de retirar a nota de avaliação (senão o baseline nunca poderia acertar).
* ``--modo piloto`` (n=5): 3 notas da cabeça (classes mais frequentes),
  1 do meio e 1 da cauda longa.
* ``--modo principal``: alocação proporcional, mínimo 1 e máximo 5 por classe.

Uso:
    python -m bench.build_eval_set --n 5 --modo piloto
"""
from __future__ import annotations

import argparse

import numpy as np
import pandas as pd

from bench.common import EIXOS, RESULTS, carregar_dados

SEED = 42


def _estratos(freq: pd.Series) -> dict[str, list[str]]:
    ordenadas = freq[freq >= 3].sort_values(ascending=False)
    k = max(1, len(ordenadas) // 3)
    return {
        "cabeca": list(ordenadas.index[:k]),
        "meio": list(ordenadas.index[k : 2 * k]),
        "cauda": list(ordenadas.index[2 * k :]),
    }


def amostrar_piloto(df: pd.DataFrame, col: str, n: int, rng: np.random.Generator) -> pd.DataFrame:
    """Alocação balanceada entre estratos (50/30/20), com preenchimento quando o
    estrato tem menos classes do que a cota pedida (ex.: detecção tem 10 classes)."""
    est = _estratos(df[col].value_counts())
    n_cabeca = max(1, round(n * 0.5))
    n_meio = max(1, round(n * 0.3))
    n_cauda = max(1, n - n_cabeca - n_meio)
    while n_cabeca + n_meio + n_cauda > n:
        if n_cabeca > n_meio and n_cabeca > 1:
            n_cabeca -= 1
        elif n_meio > 1:
            n_meio -= 1
        else:
            n_cauda -= 1

    escolhidos: list = []
    for nome, qtd in (("cabeca", n_cabeca), ("meio", n_meio), ("cauda", n_cauda)):
        classes = est[nome]
        if qtd <= 0 or not classes:
            continue
        # 1 nota por classe, até o limite de classes do estrato
        sorteadas = list(rng.choice(classes, size=min(qtd, len(classes)), replace=False))
        for classe in sorteadas:
            lote = df[df[col] == classe]
            escolhidos.append(lote.sample(1, random_state=int(rng.integers(1 << 30))))

        # se o estrato tem menos classes que a cota, completa com outras notas do estrato
        faltam = qtd - len(sorteadas)
        if faltam > 0:
            pool = df[df[col].isin(classes)]
            ja = set().union(*[set(e.index) for e in escolhidos]) if escolhidos else set()
            pool = pool.drop(index=[i for i in ja if i in pool.index])
            if len(pool):
                escolhidos.append(pool.sample(min(faltam, len(pool)),
                                              random_state=int(rng.integers(1 << 30))))

    out = pd.concat(escolhidos)
    return out.drop_duplicates().sample(frac=1, random_state=int(rng.integers(1 << 30)))


def amostrar_principal(
    df: pd.DataFrame, col: str, n: int, rng: np.random.Generator, cap: int = 5
) -> pd.DataFrame:
    freq = df[col].value_counts()
    frac = n / len(df)
    lotes = []
    for classe, f in freq[freq >= 3].items():
        q = int(min(max(round(f * frac), 1), cap))
        lotes.append(df[df[col] == classe].sample(q, random_state=int(rng.integers(1 << 30))))
    out = pd.concat(lotes)
    if len(out) < n:
        resto = df.drop(out.index)
        out = pd.concat([out, resto.sample(n - len(out), random_state=int(rng.integers(1 << 30)))])
    return out.sample(n, random_state=SEED) if len(out) > n else out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=5, help="notas por eixo")
    ap.add_argument("--modo", choices=["piloto", "principal"], default="piloto")
    args = ap.parse_args()

    df = carregar_dados()
    antes = len(df)
    df = df.drop_duplicates(subset=["Description"]).reset_index(drop=True)
    print(f"linhas: {antes} -> {len(df)} apos dedup de descricao")

    rng = np.random.default_rng(SEED)
    funcao = amostrar_piloto if args.modo == "piloto" else amostrar_principal
    amostras = {eixo: funcao(df, col, args.n, rng) for eixo, col in EIXOS.items()}

    ids = sorted(set().union(*[set(a.index) for a in amostras.values()]))
    ev = df.loc[ids].copy()
    ev["eixos"] = [",".join(e for e, a in amostras.items() if i in a.index) for i in ev.index]
    ev["example_id"] = [f"ex{i:05d}" for i in ev.index]
    tr = df.drop(index=ids)

    # --- checagens de integridade ---
    assert not (set(tr["Description"]) & set(ev["Description"])), "VAZAMENTO: texto em treino e eval"
    assert not (set(tr.index) & set(ev.index)), "VAZAMENTO: índice em treino e eval"
    for eixo, col in EIXOS.items():
        universo_ev = set(ev[ev["eixos"].str.contains(eixo)][col])
        faltando = universo_ev - set(tr[col])
        assert not faltando, f"classe(s) {faltando} do eixo {eixo} desapareceram do treino"
        n_eixo = int(ev["eixos"].str.contains(eixo).sum())
        assert n_eixo == args.n, f"eixo {eixo}: n={n_eixo}, esperado {args.n}"

    ev.to_csv(RESULTS / "eval_set.csv", index=False)
    tr.to_csv(RESULTS / "train_set.csv", index=False)

    print(f"eval: {len(ev)} notas unicas | train: {len(tr)}")
    for eixo, col in EIXOS.items():
        sub = ev[ev["eixos"].str.contains(eixo)]
        dist = sub[col].value_counts().to_dict()
        print(f"  {eixo:10s} n={len(sub)} classes={sub[col].nunique()} {dist}")


if __name__ == "__main__":
    main()
