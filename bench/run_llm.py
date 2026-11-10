"""Chama os LLMs no conjunto de avaliação e grava cada resposta crua.

Uso:
    python -m bench.run_llm --run-id pilot-v1
    python -m bench.run_llm --run-id det-v1 --repetir 5 --limite-notas 5
    python -m bench.run_llm --run-id few-v1 --few-shot
"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
from datetime import datetime, timezone

import pandas as pd
import requests

from bench.common import EIXOS, RAW, RESULTS, carregar_taxonomia
from bench.config import ENDPOINT, MAX_TOKENS, MODELOS, MODELOS_POR_ID, PRECOS, SEED, USER_AGENT
from bench.prompts import (
    montar_indice_exemplos,
    montar_mensagens_fewshot,
    montar_prompt,
    montar_prompt_exemplos,
    montar_prompt_iso,
)

K_FEWSHOT = 5
DTYPES = {
    "Tag": str,
    "Description": str,
    "FailureImp": str,
    "FailMode": str,
    "FailMech": str,
    "DetMethod": str,
    "example_id": str,
    "eixos": str,
}


def _sessao(base_url: str) -> requests.Session:
    s = requests.Session()
    headers = {
        "Authorization": f"Bearer {os.environ.get('OPENCODE_GO_API_KEY', 'local')}",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    }
    if "opencode.ai" in base_url:
        # exigido pelo proxy do OpenCode Go (senão HTTP 400 MissingSessionID)
        headers["x-opencode-session"] = f"bench-{int(time.time())}"
    s.headers.update(headers)
    return s


def extrair_json(texto: str) -> tuple[dict | None, bool]:
    """Extrai o primeiro objeto JSON. Devolve (objeto, precisou_reparo)."""
    if not texto:
        return None, False
    limpo = re.sub(r"```(?:json)?", "", texto).strip()
    i, j = limpo.find("{"), limpo.rfind("}")
    if i == -1 or j == -1:
        return None, False
    frag = limpo[i : j + 1]
    try:
        return json.loads(frag), False
    except json.JSONDecodeError:
        pass
    try:
        reparado = re.sub(r",\s*([}\]])", r"\1", frag)
        return json.loads(reparado), True
    except json.JSONDecodeError:
        return None, False


def normalizar(pred_bruto, tax_eixo: set[str]) -> tuple[list[str], list[str]]:
    """Devolve (codigos_validos_em_ordem, codigos_invalidos)."""
    itens = pred_bruto or []
    if isinstance(itens, dict):
        itens = [itens]
    codigos = []
    for item in itens:
        if isinstance(item, dict):
            codigo = item.get("codigo") or item.get("code") or item.get("id") or ""
        else:
            codigo = str(item)
        codigo = str(codigo).strip().strip(".,;\"'")
        if codigo:
            codigos.append(codigo)
    validos = [c for c in codigos if c in tax_eixo]
    invalidos = [c for c in codigos if c not in tax_eixo]
    return validos[:3], invalidos


def montar_corpo(modelo: dict, mensagens: list[dict], com_extra: bool) -> dict:
    corpo = {"model": modelo["id"], "messages": mensagens, "max_tokens": MAX_TOKENS}
    if modelo.get("temperatura"):
        corpo["temperature"] = 0
    if com_extra:
        corpo.update(modelo.get("extra") or {})
    return corpo


def chamar(sessao: requests.Session, modelo: dict, mensagens: list[dict], base_url: str) -> dict:
    """Uma chamada com retry e fallback de parâmetros. Nunca silencia erro."""
    ultimo_erro = None
    com_extra = True
    for tentativa in range(3):
        try:
            inicio = time.perf_counter()
            resp = sessao.post(
                base_url, json=montar_corpo(modelo, mensagens, com_extra), timeout=600
            )
            latencia_ms = (time.perf_counter() - inicio) * 1000
            if resp.status_code == 400 and com_extra:
                # parâmetro de controle rejeitado pelo proxy: repete sem ele
                corpo_erro = resp.text[:200]
                com_extra = False
                ultimo_erro = f"HTTP 400 com extras ({corpo_erro}); repetindo sem extras"
                continue
            if resp.status_code in (429, 500, 502, 503, 504):
                ultimo_erro = f"HTTP {resp.status_code}: {resp.text[:200]}"
                time.sleep(2 * (tentativa + 1))
                continue
            resp.raise_for_status()
            dados = resp.json()
            msg = dados["choices"][0]["message"]
            conteudo = msg.get("content") or msg.get("reasoning_content") or msg.get("reasoning") or ""
            return {
                "ok": True,
                "conteudo": conteudo,
                "usage": dados.get("usage", {}),
                "latencia_ms": latencia_ms,
                "extras_usados": com_extra,
                "aviso": ultimo_erro,
            }
        except Exception as exc:  # noqa: BLE001
            ultimo_erro = f"{type(exc).__name__}: {str(exc)[:200]}"
            time.sleep(2 * (tentativa + 1))
    return {"ok": False, "erro": ultimo_erro, "latencia_ms": None, "usage": {}}


def custo(usage: dict, preco: tuple[float, float]) -> float:
    entrada = usage.get("prompt_tokens") or 0
    saida = usage.get("completion_tokens") or 0
    return entrada * preco[0] / 1e6 + saida * preco[1] / 1e6


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--modelos", default="", help="ids separados por vírgula (default: todos)")
    ap.add_argument("--variante", choices=["zero", "few"], default="zero")
    ap.add_argument("--repetir", type=int, default=1)
    ap.add_argument("--limite-notas", type=int, default=0)
    ap.add_argument("--base-url", default=ENDPOINT, help="endpoint compatível com OpenAI")
    ap.add_argument("--prompt-iso", action="store_true",
                    help="usa a variante enriquecida com descrições da ISO 14224")
    ap.add_argument("--exemplos", type=int, default=0,
                    help="N exemplos reais por código (do treino) no prompt")
    args = ap.parse_args()

    ev = pd.read_csv(RESULTS / "eval_set.csv", dtype=DTYPES)
    tr = pd.read_csv(RESULTS / "train_set.csv", dtype=DTYPES)
    tax = carregar_taxonomia({e: set(tr[c]) for e, c in EIXOS.items()})
    tax_sets = {e: set(tr[c]) for e, c in EIXOS.items()}

    iso_textos: dict = {}
    indice_exemplos: dict = {}
    if args.prompt_iso or args.exemplos:
        caminho_iso = RESULTS / "iso14224_textos.json"
        if caminho_iso.exists():
            iso_textos = json.loads(caminho_iso.read_text(encoding="utf-8"))
        elif args.prompt_iso:
            raise SystemExit("rode bench/extrair_iso.py antes de usar --prompt-iso")
    if args.exemplos:
        indice_exemplos = montar_indice_exemplos(tr, max_por_codigo=args.exemplos)
        print(f"prompt: ISO + {args.exemplos} exemplo(s) real(is) por código")

    if args.limite_notas:
        ev = ev.head(args.limite_notas)

    exemplos = None
    if args.variante == "few":
        exemplos = tr.sample(K_FEWSHOT, random_state=SEED)
        exemplos.to_csv(RESULTS / "fewshot_examples.csv", index=False)
        print(f"few-shot: {len(exemplos)} exemplos do treino -> results/fewshot_examples.csv")

    modelos = MODELOS if not args.modelos else [MODELOS_POR_ID[m] for m in args.modelos.split(",")]
    destino = RAW / f"{args.run_id}.jsonl"
    feitos = set()
    if destino.exists():
        for linha in destino.read_text(encoding="utf-8").splitlines():
            try:
                r = json.loads(linha)
                feitos.add((r["modelo"], r["variante"], r["example_id"], r["rep"]))
            except Exception:  # noqa: BLE001
                continue
        print(f"resume: {len(feitos)} registros já existentes em {destino.name}")

    sessao = _sessao(args.base_url)
    total_previsto = len(modelos) * len(ev) * args.repetir
    feito = 0
    with destino.open("a", encoding="utf-8") as fh:
        for modelo in modelos:
            print(f"\n=== {modelo['id']} ({modelo['empresa']}, {modelo['tier']}) ===", flush=True)
            for _, linha in ev.iterrows():
                for rep in range(args.repetir):
                    chave = (modelo["id"], args.variante, linha["example_id"], rep)
                    feito += 1
                    if chave in feitos:
                        continue
                    if args.variante == "few":
                        mensagens = montar_mensagens_fewshot(linha, exemplos, tax)
                    elif args.exemplos:
                        system, user = montar_prompt_exemplos(linha, tax, iso_textos, indice_exemplos)
                        mensagens = [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user},
                        ]
                    elif args.prompt_iso:
                        system, user = montar_prompt_iso(linha, tax, iso_textos)
                        mensagens = [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user},
                        ]
                    else:
                        system, user = montar_prompt(linha, tax)
                        mensagens = [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user},
                        ]
                    r = chamar(sessao, modelo, mensagens, args.base_url)
                    registro = {
                        "run_id": args.run_id,
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "modelo": modelo["id"],
                        "empresa": modelo["empresa"],
                        "tier": modelo["tier"],
                        "variante": args.variante,
                        "example_id": linha["example_id"],
                        "rep": rep,
                        "ok": r["ok"],
                        "erro": r.get("erro"),
                        "aviso": r.get("aviso"),
                        "extras_usados": r.get("extras_usados"),
                        "latencia_ms": r.get("latencia_ms"),
                        "usage": r.get("usage", {}),
                        "cost_usd": custo(r.get("usage", {}), PRECOS[modelo["id"]]),
                        "conteudo": r.get("conteudo", ""),
                        "pred": {},
                        "invalidos": {},
                    }
                    if r["ok"]:
                        objeto, reparo = extrair_json(r["conteudo"])
                        registro["json_ok"] = objeto is not None
                        registro["precisou_reparo"] = reparo
                        for eixo in EIXOS:
                            validos, invalidos = normalizar(
                                (objeto or {}).get(eixo), tax_sets[eixo]
                            )
                            registro["pred"][eixo] = validos
                            registro["invalidos"][eixo] = invalidos
                    else:
                        registro["json_ok"] = False
                        registro["precisou_reparo"] = False
                        for eixo in EIXOS:
                            registro["pred"][eixo] = []
                            registro["invalidos"][eixo] = []
                    fh.write(json.dumps(registro, ensure_ascii=False) + "\n")
                    fh.flush()
                    if feito % 10 == 0 or feito == total_previsto:
                        print(f"  {feito}/{total_previsto} chamadas", flush=True)

    print(f"\nresultados: {destino}")


if __name__ == "__main__":
    main()
