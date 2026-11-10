"""Busca de hiperparâmetros do XGBoost — sem mexer nas features.

As features continuam exatamente as do deploy: TF-IDF de 1.500 termos na
descrição limpa + one-hot de Tag e FailureImp. O que varia é só o XGBoost.

Seleção: holdout interno de 20% do treino, estratificado, por eixo.
Teste: as 30 notas com gabarito do especialista — nunca usadas na escolha.

Uso:
    python -m bench.tune_xgb --configs 16
"""

from __future__ import annotations

import argparse
import json
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import top_k_accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from xgboost import XGBClassifier

from bench.common import ARTIFACTS, RESULTS, limpar_texto

COLUNAS = ["Tag", "FailureImp", "TEXTO_LIMPO"]
AXES = ["FailMode", "FailMech", "DetMethod"]
EIXO_DE = {"FailMode": "modo", "FailMech": "mecanismo", "DetMethod": "deteccao"}

BASE = {"n_estimators": 100, "max_depth": 6, "learning_rate": 0.1,
        "subsample": 0.8, "colsample_bytree": 0.8, "min_child_weight": 1,
        "reg_lambda": 1.0, "balanced": False}

ESPACO = {
    "n_estimators": [200, 400],
    "max_depth": [4, 6, 8],
    "learning_rate": [0.05, 0.1, 0.2],
    "subsample": [0.7, 0.9],
    "colsample_bytree": [0.4, 0.8],
    "min_child_weight": [1, 3],
    "reg_lambda": [1.0, 5.0],
    "balanced": [False, True],
}


def montar_pre(tr: pd.DataFrame) -> ColumnTransformer:
    return ColumnTransformer([
        ("txt", TfidfVectorizer(max_features=1500), "TEXTO_LIMPO"),
        ("cat", OneHotEncoder(handle_unknown="ignore"), ["Tag", "FailureImp"]),
    ]).fit(tr[COLUNAS])


def clf(params: dict, semente: int = 42) -> XGBClassifier:
    return XGBClassifier(
        n_estimators=params["n_estimators"], max_depth=params["max_depth"],
        learning_rate=params["learning_rate"], subsample=params["subsample"],
        colsample_bytree=params["colsample_bytree"],
        min_child_weight=params["min_child_weight"], reg_lambda=params["reg_lambda"],
        tree_method="hist", n_jobs=-1, random_state=semente,
        objective="multi:softprob", eval_metric="mlogloss",
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--configs", type=int, default=16)
    args = ap.parse_args()

    tr = pd.read_csv(RESULTS / "train_set.csv",
                     dtype={"Tag": str, "Description": str, "FailureImp": str,
                            "FailMode": str, "FailMech": str, "DetMethod": str})
    tr["TEXTO_LIMPO"] = tr["Description"].map(limpar_texto)
    print(f"treino: {len(tr)} notas", flush=True)

    pre = montar_pre(tr)
    X = pre.transform(tr[COLUNAS])

    progresso = RESULTS / "tuning_progress.jsonl"
    feitos: dict[str, dict] = {}
    if progresso.exists():
        for linha in progresso.read_text(encoding="utf-8").splitlines():
            if linha.strip():
                r = json.loads(linha)
                feitos[r["rotulo"]] = r
        print(f"retomando: {len(feitos)} config(s) já medidas", flush=True)

    rng = np.random.default_rng(7)
    sorteios = [{**BASE, "rotulo": "baseline"}]
    for k in range(args.configs):
        cfg = {chave: (rng.choice(valores) if not isinstance(valores[0], bool)
                       else bool(rng.choice(valores)))
               for chave, valores in ESPACO.items()}
        cfg = {chave: (valor.item() if hasattr(valor, "item") else valor)
               for chave, valor in cfg.items()}
        cfg["rotulo"] = f"cfg{k + 1}"
        sorteios.append(cfg)

    historico = list(feitos.values())
    for cfg in sorteios:
        if cfg["rotulo"] in feitos:
            continue
        notas_eixo, tempo = {}, 0.0
        for alvo in AXES:
            y = tr[alvo]
            idx_tr, idx_ho = train_test_split(
                np.arange(len(y)), test_size=0.2, random_state=42,
                stratify=y if y.value_counts().min() >= 5 else None)
            le = LabelEncoder().fit(y)
            y_tr = le.transform(y.iloc[idx_tr])
            y_ho = le.transform(y.iloc[idx_ho])
            peso = None
            if cfg["balanced"]:
                contagem = np.bincount(y_tr, minlength=len(le.classes_))
                peso = (contagem.sum() / (len(contagem) * np.maximum(contagem, 1)))[y_tr]
            modelo = clf(cfg)
            t0 = time.time()
            modelo.fit(X[idx_tr], y_tr, sample_weight=peso)
            tempo += time.time() - t0
            proba = modelo.predict_proba(X[idx_ho])
            notas_eixo[alvo] = {
                "top1": float(top_k_accuracy_score(y_ho, proba, k=1, labels=range(len(le.classes_)))),
                "top3": float(top_k_accuracy_score(y_ho, proba, k=3, labels=range(len(le.classes_)))),
            }
        media = float(np.mean([v["top1"] for v in notas_eixo.values()]))
        por_eixo_nativo = {k: {kk: float(vv) for kk, vv in v.items()}
                           for k, v in notas_eixo.items()}
        registro = {**cfg, "top1": media, "por_eixo": por_eixo_nativo,
                    "seg": round(tempo, 1)}
        historico.append(registro)
        with progresso.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(registro, ensure_ascii=False) + "\n")
        print(f"  {cfg['rotulo']:9s} top1={media:.3f} "
              f"(modo {notas_eixo['FailMode']['top1']:.2f} | "
              f"mec {notas_eixo['FailMech']['top1']:.2f} | "
              f"det {notas_eixo['DetMethod']['top1']:.2f})  {tempo:.0f}s", flush=True)

    df = pd.DataFrame([{k: v for k, v in h.items() if k != "por_eixo"} for h in historico])
    df = df.sort_values("top1", ascending=False)
    print("\n=== ranking interno ===")
    print(df.head(8).to_string(index=False))

    melhor = historico[int(np.argmax([h["top1"] for h in historico]))]
    print(f"\nmelhor: {melhor['rotulo']} top1_interno={melhor['top1']:.3f}")

    # re-treina no treino inteiro com a melhor config e testa nas 30 notas humanas
    humano = {v["example_id"]: {e: str(v[e]).strip().upper() for e in EIXO_DE.values()}
              for v in json.loads((RESULTS / "validacao" / "respostas.json")
                                  .read_text(encoding="utf-8")).values()}
    ev = pd.read_csv(RESULTS / "eval_set.csv", dtype=str)
    ev["TEXTO_LIMPO"] = ev["Description"].map(limpar_texto)
    X_ev = pre.transform(ev[COLUNAS])

    novos, encoders = {}, {}
    acertos = {"top1": 0, "top3": 0, "n": 0}
    for alvo in AXES:
        le = LabelEncoder().fit(tr[alvo])
        y_tr = le.transform(tr[alvo])
        peso = None
        if melhor["balanced"]:
            contagem = np.bincount(y_tr, minlength=len(le.classes_))
            peso = (contagem.sum() / (len(contagem) * np.maximum(contagem, 1)))[y_tr]
        modelo = clf(melhor)
        modelo.fit(X, y_tr, sample_weight=peso)
        novos[alvo], encoders[alvo] = modelo, le
        proba = modelo.predict_proba(X_ev)
        top3 = np.argsort(-proba, axis=1)[:, :3]
        for i, (_, nota) in enumerate(ev.iterrows()):
            ouro = humano.get(nota["example_id"], {}).get(EIXO_DE[alvo])
            if not ouro or ouro not in set(le.classes_):
                continue
            previsto = le.inverse_transform([int(np.argmax(proba[i]))])[0]
            acertos["n"] += 1
            acertos["top1"] += int(previsto == ouro)
            acertos["top3"] += int(ouro in set(le.inverse_transform(top3[i])))

    resultado = {
        "melhor_config": {k: v for k, v in melhor.items() if k not in ("por_eixo",)},
        "top1_interno": melhor["top1"],
        "top1_humano": acertos["top1"] / acertos["n"],
        "top3_humano": acertos["top3"] / acertos["n"],
        "n": acertos["n"],
        "historico": df.to_dict("records"),
    }
    (RESULTS / "tuning.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2),
                                         encoding="utf-8")
    joblib.dump({"modelos": novos, "encoders": encoders, "preprocessor": pre},
                ARTIFACTS / "modelo_tunado.pkl")

    atual = next(h for h in historico if h["rotulo"] == "baseline")
    print(f"\n30 notas (gabarito do especialista):")
    print(f"  baseline  top1_interno={atual['top1']:.3f}")
    print(f"  tunado    top1_humano={resultado['top1_humano']:.3f} "
          f"top3_humano={resultado['top3_humano']:.3f} (n={resultado['n']})")


if __name__ == "__main__":
    main()
