"""Re-treina o classificador SEM as notas do conjunto de avaliação.

Replica o pipeline do deploy (TF-IDF 1.500 termos + one-hot de Tag/FailureImp
+ XGBoost por eixo). O ``n_estimators`` deve vir de ``GET /model-info`` do
modelo publicado.

Uso:
    python -m bench.retrain_heldout --n-estimators <valor do /model-info>
"""
from __future__ import annotations

import argparse

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from xgboost import XGBClassifier

from bench.common import ARTIFACTS, RESULTS, limpar_texto

COLUNAS = ["Tag", "FailureImp", "TEXTO_LIMPO"]


def treinar(df: pd.DataFrame, alvo: str, n_estimators: int, seed: int = 42):
    X = df[COLUNAS]
    le = LabelEncoder().fit(df[alvo])
    pre = ColumnTransformer(
        [
            ("txt", TfidfVectorizer(max_features=1500), "TEXTO_LIMPO"),
            ("cat", OneHotEncoder(handle_unknown="ignore"), ["Tag", "FailureImp"]),
        ]
    )
    clf = XGBClassifier(
        n_estimators=n_estimators,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        tree_method="hist",
        n_jobs=-1,
        random_state=seed,
        objective="multi:softprob",
    )
    pipe = Pipeline([("preprocessor", pre), ("classifier", clf)])
    pipe.fit(X, le.transform(df[alvo]))
    return pipe, le


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-estimators", type=int, default=300)
    ap.add_argument("--saida", default="modelo_heldout.pkl")
    args = ap.parse_args()

    tr = pd.read_csv(
        RESULTS / "train_set.csv",
        dtype={"Tag": str, "Description": str, "FailureImp": str,
               "FailMode": str, "FailMech": str, "DetMethod": str},
    )
    tr["TEXTO_LIMPO"] = tr["Description"].map(limpar_texto)
    print(f"treino: {len(tr)} notas | n_estimators={args.n_estimators}")

    modelos, encoders = {}, {}
    for col in ("FailMode", "FailMech", "DetMethod"):
        print(f"  treinando {col} ({tr[col].nunique()} classes)...", flush=True)
        modelos[col], encoders[col] = treinar(tr, col, args.n_estimators)

    destino = ARTIFACTS / args.saida
    joblib.dump({"modelos": modelos, "encoders": encoders}, destino)
    print(f"salvo: {destino}")


if __name__ == "__main__":
    main()
