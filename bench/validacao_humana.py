"""Gera um formulário de validação humana cega das 30 notas do benchmark.

Para cada nota e cada eixo, monta três opções — o gabarito atual e dois
distratores plausíveis — em ordem embaralhada com semente estável. O gabarito
fica em `gabarito.json` (não mostrar ao anotador) e o formulário sai em
`formulario.md` / `lotes/lote_N.md`.

Uso:
    python -m bench.validacao_humana                # gera tudo e imprime o lote 1
    python -m bench.validacao_humana --lote 3       # imprime só o lote 3
    python -m bench.validacao_humana --corrigir respostas.txt
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import pandas as pd

from bench.common import RESULTS

DIR = RESULTS / "validacao"
EIXOS = {"modo": "FailMode", "mecanismo": "FailMech", "deteccao": "DetMethod"}
ROTULO = {"modo": "Modo de falha", "mecanismo": "Mecanismo", "deteccao": "Método de detecção"}
LETRAS = "ABCD"
TAM_LOTE = 10


def carregar_taxonomia() -> dict:
    caminho = RESULTS / "taxonomia.json"
    return json.loads(caminho.read_text(encoding="utf-8"))


def distratores(eixo: str, ouro: str, tax: dict, train: pd.DataFrame, rng: random.Random) -> list[str]:
    """Dois distratores plausíveis: um da mesma família (mecanismo) e um frequente."""
    codigos = [i["codigo"] for i in tax[eixo]]
    candidatos = [c for c in codigos if c != ouro]

    if eixo == "mecanismo":
        familia = ouro.split(".")[0]
        mesma = [c for c in candidatos if c.split(".")[0] == familia]
        outras = [c for c in candidatos if c.split(".")[0] != familia]
        escolhidos = []
        if mesma:
            escolhidos.append(rng.choice(mesma))
        restantes = [c for c in outras if c not in escolhidos]
        escolhidos.append(rng.choice(restantes))
        return escolhidos[:2]

    if eixo == "modo":
        top = train[EIXOS[eixo]].value_counts().head(20).index.tolist()
        pool = [c for c in top if c != ouro] or candidatos
    else:
        pool = candidatos

    return rng.sample(pool, 2)


def montar() -> tuple[list[dict], dict]:
    ev = pd.read_csv(RESULTS / "eval_set.csv", dtype=str)
    train = pd.read_csv(RESULTS / "train_set.csv", dtype=str)
    tax = carregar_taxonomia()
    curto = {e: {i["codigo"]: i["curto"] for i in itens} for e, itens in tax.items()}

    questoes, gabarito = [], {}
    for i, nota in ev.reset_index(drop=True).iterrows():
        # a nota é avaliada nos três eixos — inclusive nos que não foram usados para amostrá-la
        for eixo in EIXOS:
            ouro = nota[EIXOS[eixo]]
            rng = random.Random(f"{nota['example_id']}-{eixo}")
            opcoes = [ouro] + distratores(eixo, ouro, tax, train, rng)
            rng.shuffle(opcoes)
            letra = LETRAS[opcoes.index(ouro)]
            gabarito[f"{nota['example_id']}|{eixo}"] = {"letra": letra, "codigo": ouro}
            itens = [{"letra": LETRAS[k], "codigo": c,
                      "nome": curto[eixo].get(c, "")} for k, c in enumerate(opcoes)]
            itens.append({"letra": LETRAS[len(opcoes)], "codigo": "—",
                          "nome": "Nenhuma destas (anote o código se souber)"})
            questoes.append({
                "nota_idx": i + 1,
                "example_id": nota["example_id"],
                "tag": nota["Tag"],
                "impacto": nota["FailureImp"],
                "descricao": nota["Description"],
                "eixo": eixo,
                "opcoes": itens,
            })
    return questoes, gabarito


def escrever(questoes: list[dict], gabarito: dict) -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    (DIR / "gabarito.json").write_text(
        json.dumps(gabarito, ensure_ascii=False, indent=2), encoding="utf-8")
    indice = {q["nota_idx"]: q["example_id"] for q in questoes}
    (DIR / "indice.json").write_text(
        json.dumps(indice, ensure_ascii=False, indent=2), encoding="utf-8")

    notas = sorted({q["nota_idx"] for q in questoes})
    blocos = []
    for n in notas:
        do_lote = [q for q in questoes if q["nota_idx"] == n]
        b = [f"### NOTA {n} · {do_lote[0]['example_id']} · tag {do_lote[0]['tag']} · "
             f"impacto {do_lote[0]['impacto']}",
             f"> {do_lote[0]['descricao']}", ""]
        for q in do_lote:
            ops = "   ".join(f"{o['letra']}) {o['codigo']} {o['nome']}" for o in q["opcoes"])
            b.append(f"  {ROTULO[q['eixo']]:18s} {ops}")
        blocos.append("\n".join(b))

    cabecalho = (
        "# Validação humana cega — 30 notas\n\n"
        "Para cada nota, escolha UMA letra por eixo (a que você julga correta).\n"
        "Responda no formato `1: A/B/C` (nota: modo/mecanismo/detecção).\n\n")
    (DIR / "formulario.md").write_text(cabecalho + "\n\n".join(blocos) + "\n", encoding="utf-8")

    lotes = DIR / "lotes"
    lotes.mkdir(exist_ok=True)
    for k in range(0, len(notas), TAM_LOTE):
        pedaco = [b for b, n in zip(blocos, notas) if n in notas[k:k + TAM_LOTE]]
        (lotes / f"lote_{k // TAM_LOTE + 1}.md").write_text(
            "\n\n".join(pedaco) + "\n", encoding="utf-8")


def imprimir_lote(questoes: list[dict], lote: int) -> None:
    notas = sorted({q["nota_idx"] for q in questoes})
    sel = notas[(lote - 1) * TAM_LOTE: lote * TAM_LOTE]
    for n in sel:
        do_lote = [q for q in questoes if q["nota_idx"] == n]
        print(f"NOTA {n} ({do_lote[0]['example_id']}, tag {do_lote[0]['tag']}, "
              f"impacto {do_lote[0]['impacto']})")
        print(f"  \"{do_lote[0]['descricao']}\"")
        for q in do_lote:
            ops = "  ".join(f"{o['letra']}) {o['codigo']} {o['nome']}" for o in q["opcoes"])
            print(f"  {ROTULO[q['eixo']]:18s} {ops}")
        print()


def corrigir(caminho: Path, gabarito: dict) -> None:
    import re
    indice = json.loads((DIR / "indice.json").read_text(encoding="utf-8"))
    texto = caminho.read_text(encoding="utf-8")
    eixos = ["modo", "mecanismo", "deteccao"]
    acertos = erros = 0
    for linha in texto.splitlines():
        m = re.match(r"\s*(\d+)\s*[:\-]\s*([ABCD])\s*[/,;-]\s*([ABCD])\s*[/,;-]\s*([ABCD])", linha, re.I)
        if not m:
            continue
        idx, *respostas = m.groups()
        exemplo = indice.get(str(int(idx)))
        if not exemplo:
            continue
        for eixo, letra in zip(eixos, respostas):
            chave = f"{exemplo}|{eixo}"
            if chave not in gabarito:
                continue
            ok = gabarito[chave]["letra"].upper() == letra.upper()
            acertos += ok
            erros += not ok
            if not ok:
                print(f"  divergência: nota {idx} {eixo} — anotador {letra.upper()}, "
                      f"gabarito {gabarito[chave]['letra']} ({gabarito[chave]['codigo']})")
    total = acertos + erros
    if total:
        print(f"\nconcordância: {acertos}/{total} = {acertos / total:.1%}")
    else:
        print("nenhuma resposta reconhecida (formato esperado: `1: A/B/C`)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lote", type=int, default=0, help="imprime só o lote N (0 = não imprime)")
    ap.add_argument("--corrigir", type=Path, help="arquivo com as respostas no formato 1: A/B/C")
    args = ap.parse_args()

    questoes, gabarito = montar()
    escrever(questoes, gabarito)
    print(f"formulário: {DIR / 'formulario.md'}")
    print(f"notas: {len({q['nota_idx'] for q in questoes})} · questões: {len(questoes)}\n")
    if args.corrigir:
        corrigir(args.corrigir, gabarito)
    elif args.lote:
        imprimir_lote(questoes, args.lote)


if __name__ == "__main__":
    main()
