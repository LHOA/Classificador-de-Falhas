"""Monta docs/RESULTADOS.md: um único documento com todas as figuras e tabelas.

Uso:
    python -m bench.montar_relatorio
"""
from __future__ import annotations

from bench.common import REPO, RESULTS

FIG = RESULTS / "figures"
TAB = RESULTS / "tables"
DESTINO = REPO / "docs" / "RESULTADOS.md"

FIGURAS = [
    ("01_acuracia_por_eixo.png",
     "Acurácia top-1 por eixo. Ponto = média; linha = IC95 bootstrap. Com n=5 por eixo "
     "o intervalo é de ±35 pp — nenhuma diferença aqui é estatisticamente significativa."),
    ("02_top1_vs_top3.png",
     "Top-1 versus top-3. No top-3 — que é o formato exibido pela interface — a distância "
     "entre os modelos praticamente desaparece."),
    ("03_custo_vs_acuracia.png",
     "Custo por 1.000 notas (escala log) contra acurácia. O modelo 19× mais caro empata "
     "com o mais barato."),
    ("04_latencia.png",
     "Latência por nota. XGBoost em 66 ms contra 1,2–3,7 s dos LLMs na nuvem e ~200 s do "
     "GGUF rodando na própria máquina."),
    ("05_projecao_custo.png",
     "Custo projetado para 1.000, 10.000 e 30.000 notas por mês. O baseline local fica em "
     "US$ 0,00 em todos os volumes."),
    ("06_determinismo.png",
     "Concordância top-1 em 5 repetições da mesma nota. LLMs entre 95% e 100% — muito mais "
     "estáveis do que o senso comum sugere."),
    ("07_fewshot.png",
     "Few-shot k=5 contra zero-shot. Só o DeepSeek melhorou de forma visível, pagando 4,7× "
     "mais por chamada."),
    ("08_matriz_acertos.png",
     "Matriz de acerto por nota e por modelo (top-1 no eixo avaliado). Mostra quais notas "
     "são difíceis para todos — sinal de ruído no gabarito, não de fraqueza do modelo."),
    ("09_composicao_custo.png",
     "Composição do custo: entrada (prompt de taxonomia) contra saída (resposta). O prompt "
     "domina a conta — reduzir taxonomia economiza mais que reduzir tokens de resposta."),
]

TABELAS = [
    ("02_agregada.md", "Resumo por modelo (média dos três eixos)"),
    ("01_por_eixo.md", "Resultado completo por eixo"),
    ("03_custo_por_volume.md", "Custo por volume de notas"),
    ("07_custo_real.md", "Custo real observado no piloto (tokens medidos × preço de lista)"),
    ("08_custo_energia_local.md", "Custo de energia do modelo local (premissas explícitas)"),
    ("04_determinismo.md", "Determinismo em 5 repetições"),
    ("05_fewshot.md", "Few-shot k=5 contra zero-shot"),
    ("06_notas_modo.md", "Nota a nota — modo de falha"),
    ("06_notas_mecanismo.md", "Nota a nota — mecanismo"),
    ("06_notas_deteccao.md", "Nota a nota — método de detecção"),
]

INTRO = """# Resultados — LLMs × XGBoost na classificação de falhas ISO 14224

Piloto com **15 notas** (5 por eixo: modo de falha, mecanismo, método de detecção),
separadas do treino. Todos os modelos receberam o **mesmo prompt**, a mesma taxonomia
completa (1.766 tokens) e temperatura zero. 275 chamadas de LLM + 30 locais, **US$ 0,38** no total.

| Ressalva | Detalhe |
| --- | --- |
| Amostra | n=5 por eixo → IC95 de ±35 pp. Os números são **direcionais**. |
| Gabarito | Rótulo único, sem dupla anotação. 2 dos 15 casos contradizem o texto da nota. |
| XGBoost | Avaliado nas mesmas notas em que foi treinado (in-sample). |
| Modelos locais | Gemma 4 via llama.cpp, na GPU de 4 GB da máquina — latência não é comparável à nuvem. |

---

"""


def main() -> None:
    partes = [INTRO]
    for nome, legenda in FIGURAS:
        caminho = FIG / nome
        if not caminho.exists():
            continue
        partes.append(f"## {legenda.split('.')[0]}\n\n")
        partes.append(f"![{nome}](../bench/results/figures/{nome})\n\n")
        partes.append(f"*{legenda}*\n\n---\n\n")

    for arquivo, titulo in TABELAS:
        caminho = TAB / arquivo
        if not caminho.exists():
            continue
        conteudo = caminho.read_text(encoding="utf-8").strip()
        partes.append(f"## {titulo}\n\n{conteudo}\n\n---\n\n")

    partes.append(
        "## Como reproduzir\n\n"
        "```bash\n"
        "python -m venv .venv\n"
        "python -m pip install -r bench/requirements-bench.txt\n"
        "python -m bench.build_eval_set --n 5 --modo piloto\n"
        "python -m bench.retrain_heldout --n-estimators 100\n"
        "python -m bench.run_llm --run-id pilot-zero-v2\n"
        "python -m bench.score --runs local-publicado,pilot-zero-v2 --det-runs det-v1\n"
        "python -m bench.report\n"
        "python -m bench.montar_relatorio\n"
        "```\n"
    )

    DESTINO.write_text("".join(partes), encoding="utf-8")
    print("escrito:", DESTINO)


if __name__ == "__main__":
    main()
