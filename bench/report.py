"""Gera todas as figuras e tabelas do benchmark.

Uso:
    python -m bench.report

Saídas em bench/results/:
    figures/*.png    (8 gráficos)
    tables/*.md      (tabelas em markdown + csv)
    summary.md       (tabela completa por eixo)
"""
from __future__ import annotations

import json

import matplotlib
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from bench.common import EIXOS, RAW, RESULTS, carregar_taxonomia

FIG = RESULTS / "figures"
TAB = RESULTS / "tables"
FIG.mkdir(parents=True, exist_ok=True)
TAB.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Nomes de exibição
# ---------------------------------------------------------------------------

NOMES = {
    "local_publicado": "XGBoost",
    "local_heldout": "XGBoost (sem as notas de teste)",
    "laya-zeroshot": "Laya (zero-shot)",
    "laya-finetuned": "Laya (fine-tuned)",
    "gemma-4-12b-qat": "Gemma 4 12B (local)",
    "gemma-4-31b-q3": "Gemma 4 31B (local)",
    "claude-haiku-5-5": "Claude Haiku 5.5",
    "gpt-6-luna": "GPT-6 Luna",
    "deepseek-v4.1-flash": "DeepSeek V4.1 Flash",
    "qwen3.8-flash": "Qwen3.8 Flash",
    "qwen3.8-max": "Qwen3.8 Max",
}

# o held-out sai de todos os gráficos e tabelas por decisão do projeto
OCULTOS = {"local_heldout"}  # só "XGBoost" aparece nas figuras

ORDEM = [
    "local_publicado",
    "local_heldout",
    "laya-finetuned",
    "laya-zeroshot",
    "gemma-4-12b-qat",
    "gemma-4-31b-q3",
    "claude-haiku-5-5",
    "gpt-6-luna",
    "deepseek-v4.1-flash",
    "qwen3.8-flash",
    "qwen3.8-max",
]

CORES = {
    "local_publicado": "#1e293b",
    "laya-finetuned": "#0f766e",
    "laya-zeroshot": "#14b8a6",
    "gemma-4-12b-qat": "#7c3aed",
    "gemma-4-31b-q3": "#a78bfa",
    "claude-haiku-5-5": "#d97706",
    "gpt-6-luna": "#059669",
    "deepseek-v4.1-flash": "#2563eb",
    "qwen3.8-flash": "#dc2626",
    "qwen3.8-max": "#7f1d1d",
}

EIXO_PT = {"modo": "Modo de falha", "mecanismo": "Mecanismo", "deteccao": "Detecção"}
COLS = {"modo": "FailMode", "mecanismo": "FailMech", "deteccao": "DetMethod"}

# ---------------------------------------------------------------------------
# Nomes curtos dos códigos ISO 14224 (para não poluir tabela/gráfico com número)
# ---------------------------------------------------------------------------

CURTOS = {
    # modo de falha
    "OTH": "Outros", "ELP": "Vaz.ext.processo", "BRD": "Quebra/colapso",
    "ELU": "Vaz.ext.utilidade", "FTI": "Falha função", "FTO": "Falha abrir",
    "LCP": "Vaz.pos.fechada", "DOP": "Operação atrasada", "LOO": "Saída baixa",
    "PDE": "Desvio parâmetro", "FTF": "Falha funcionar", "STD": "Def. estrutural",
    "FTS": "Falha partir", "FTC": "Falha fechar", "LOP": "Perda potência",
    "STP": "Falha parar", "PLU": "Entupido", "OHE": "Superaquecimento",
    "VIB": "Vibração", "INL": "Vaz.interno", "AOL": "Saída anormal baixa",
    "HIO": "Saída alta", "NAC": "Alarme inaceitável", "AIR": "Leitura anormal",
    "NOI": "Ruído", "SPO": "Operação espúria", "STC": "Def.estrut.contenção",
    "SCF": "Falha contenção", "UST": "Parada espúria", "SLL": "Alarme baixo espúrio",
    "SHH": "Alarme alto espúrio", "LOA": "Queda de carga", "EXP": "Sobrepressão",
    "NOO": "Sem saída", "CSF": "Falha controle", "EFA": "Falha eletrônica",
    "FRO": "Falha rotacionar", "FTL": "Falha travar", "SER": "Probl. menores",
    "IHT": "Transf.calor insuf.", "ILP": "Vaz.int.processo", "PTF": "Falha transmissão",
    "POW": "Potência insuf.", "SBU": "Acúmulo borra", "NON": "Sem efeito",
    "UNK": "Desconhecido", "UNS": "Não especificado", "LRM": "Perda ger.remoto",
    "ISB": "Seg.informação", "WCL": "Comun.poço-linha", "DEX": "Proteção EX",
    "SLP": "Deslizamento", "FDC": "Falha desconectar", "FCO": "Falha conectar",
    "ERO": "Saída errática", "OSR": "Sobrecarga/aviso", "CTD": "Perigo contato",
    "021": "Erro módulo I/O", "ALR": "Alarme", "FOV": "Tensão defeituosa",
    "AIR ": "Leitura anormal", "LOR": "Perda redundância",
    # mecanismo
    "1.1": "Vazamento", "1.2": "Vibração", "1.3": "Desalinhamento",
    "1.4": "Deformação", "1.5": "Afrouxamento", "1.6": "Travamento",
    "1.7": "Isolamento", "1.8": "Suporte", "1.9": "Revestimento",
    "1.10": "Capa externa", "1.12": "Colapso carcaça", "1.15": "Invólucro/IP",
    "1.16": "Junta EX", "2.1": "Cavitação", "2.2": "Corrosão interna",
    "2.3": "Erosão", "2.4": "Desgaste", "2.5": "Quebra/ruptura",
    "2.6": "Fadiga", "2.7": "Superaquecimento", "2.8": "Estouro",
    "2.9": "Corrosão externa", "2.10": "Trinca", "2.11": "Dano flange",
    "2.12": "Parafusos degrad.", "2.13": "Prot.catódica", "2.14": "Cloretos",
    "2.15": "Concreto", "2.17": "Degradação natural", "2.20": "CUI",
    "2.21": "Corrosão parafusos", "3.1": "Falha controle", "3.2": "Sem sinal",
    "3.3": "Sinal defeituoso", "3.4": "Desajustado", "3.5": "Falha software",
    "4.1": "Curto-circuito", "4.2": "Circuito aberto", "4.3": "Sem energia",
    "4.4": "Tensão defeituosa", "4.6": "Conexão elétrica", "5.1": "Entupimento",
    "5.2": "Contaminação", "5.3": "Influência externa", "5.5": "Erosão marinha",
    "5.7": "Contato prejudicial", "5.8": "Config. incorreta",
    "5.9": "Fora pressão/temp", "6.1": "Sem causa", "6.5": "Desvio projeto",
    "11": "Capa externa", "11.0": "Capa externa",
    # método de detecção
    "1d": "Manut. periódica", "2d": "Teste funcional", "3d": "Inspeção",
    "4d": "Monitor. periódico", "5d": "Monitor. contínuo",
    "6d": "Interf. produção", "7d": "Observ. casual", "8d": "Manut. corretiva",
    "9d": "Sob demanda", "10d": "Outro",
}

CURTOS_DET = {
    "1": "Manut. periódica", "2": "Teste funcional", "3": "Inspeção",
    "4": "Monitor. periódico", "5": "Monitor. contínuo", "6": "Interf. produção",
    "7": "Observ. casual", "8": "Manut. corretiva", "9": "Sob demanda", "10": "Outro",
}

_TAX: dict[str, dict[str, str]] = {}


def _carregar_pt() -> None:
    """Carrega descrições PT para o fallback de nome curto."""
    global _TAX
    if _TAX:
        return
    try:
        tr = pd.read_csv(
            RESULTS / "train_set.csv",
            dtype={"FailMode": str, "FailMech": str, "DetMethod": str},
        )
        tax = carregar_taxonomia({e: set(tr[c]) for e, c in EIXOS.items()})
        for eixo, itens in tax.items():
            _TAX[eixo] = {}
            for i in itens:
                pt = i["texto"].split(" / ")[0].strip()
                _TAX[eixo][i["codigo"]] = pt
    except Exception:  # noqa: BLE001
        _TAX = {"modo": {}, "mecanismo": {}, "deteccao": {}}


def curto(codigo: str, eixo: str) -> str:
    """Nome abreviado do código. Ex.: '2.4' (mecanismo) -> 'Desgaste'."""
    codigo = str(codigo).strip()
    if eixo == "deteccao" and codigo in CURTOS_DET:
        return CURTOS_DET[codigo]
    if codigo in CURTOS:
        return CURTOS[codigo]
    _carregar_pt()
    pt = _TAX.get(eixo, {}).get(codigo)
    if pt:
        pt = pt.split("(")[0].strip()
        return pt if len(pt) <= 17 else pt[:16].rsplit(" ", 1)[0] + "."
    return codigo


def rotulo(codigo: str, eixo: str) -> str:
    """Código + nome curto, para a coluna de gabarito."""
    return f"{codigo} · {curto(codigo, eixo)}"


def nome(m: str) -> str:
    return NOMES.get(m, m)


def visiveis(df: pd.DataFrame) -> pd.DataFrame:
    # det-v1 repete 5 notas: não entra em médias de acurácia (só na figura de determinismo)
    return df[~df["modelo"].isin(OCULTOS) & (df.get("run_id") != "det-v1")]


def modelos_presentes(res: pd.DataFrame) -> list[str]:
    return [m for m in ORDEM if m in set(res["modelo"])]


# ---------------------------------------------------------------------------
# Estilo
# ---------------------------------------------------------------------------

def estilo() -> None:
    plt.rcParams.update(
        {
            "figure.dpi": 110,
            "savefig.dpi": 170,
            "font.size": 9,
            "axes.titlesize": 10.5,
            "axes.titleweight": "bold",
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.grid": True,
            "grid.alpha": 0.22,
            "grid.linestyle": "--",
            "legend.frameon": False,
        }
    )


# ---------------------------------------------------------------------------
# Figuras
# ---------------------------------------------------------------------------

def fig_dot_plot_eixos(zero: pd.DataFrame, modelos: list[str]) -> None:
    """Dot plot com IC95 por eixo — valores em coluna à direita, sem sobreposição."""
    eixos = ["modo", "mecanismo", "deteccao"]
    fig, axes = plt.subplots(1, 3, figsize=(13, 4.6), sharex=True)
    for ax, eixo in zip(axes, eixos):
        y = np.arange(len(modelos))[::-1]
        for yy, m in zip(y, modelos):
            r = zero[(zero.modelo == m) & (zero.eixo == eixo)]
            if r.empty:
                continue
            v = float(r.top1.iloc[0])
            lo, hi = float(r.top1_lo.iloc[0]), float(r.top1_hi.iloc[0])
            ax.plot([lo, hi], [yy, yy], color=CORES.get(m, "#888"), lw=2.2, alpha=0.40,
                    solid_capstyle="round")
            ax.scatter(v, yy, s=70, color=CORES.get(m, "#888"), zorder=3,
                       edgecolor="white", linewidth=0.8)
            # valor numa coluna fixa à direita: nunca encosta no ponto nem no eixo
            ax.text(1.235, yy, f"{v:.2f}", va="center", ha="right", fontsize=8,
                    color="#0f172a", family="monospace")
        ax.axvline(0.5, color="#cbd5e1", ls=":", lw=1)
        ax.axvline(1.10, color="#e2e8f0", lw=0.8)
        ax.set_title(EIXO_PT[eixo])
        ax.set_xlim(0, 1.25)
        ax.set_yticks(y)
        ax.set_yticklabels([nome(m) for m in modelos], fontsize=8)
        ax.set_ylim(-0.6, len(modelos) - 0.4)
        ax.grid(axis="x", alpha=0.25)
        ax.grid(axis="y", alpha=0)
    axes[0].set_xlabel("Top-1 accuracy (ponto = média, linha = IC95 bootstrap)")
    for ax in axes:
        ax.set_xticks([0, 0.2, 0.4, 0.6, 0.8, 1.0])
    fig.suptitle("Acurácia por eixo — n=10 por eixo, IC95 ±25 pp",
                 fontsize=11, fontweight="bold", y=0.995)
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    fig.savefig(FIG / "01_acuracia_por_eixo.png")
    plt.close(fig)


def fig_top1_vs_top3(zero: pd.DataFrame, modelos: list[str]) -> None:
    from matplotlib.lines import Line2D

    dados = []
    for m in modelos:
        sub = zero[zero.modelo == m]
        dados.append((nome(m), float(sub.top1.mean()), float(sub.top3.mean()), CORES.get(m, "#888")))
    dados.sort(key=lambda d: d[1])
    fig, ax = plt.subplots(figsize=(8.6, 4.4))
    for i, (rot, t1, t3, cor) in enumerate(dados):
        ax.plot([t1, t3], [i, i], color=cor, lw=2, alpha=0.35, zorder=1)
        ax.scatter(t1, i, s=85, color=cor, zorder=3)
        ax.scatter(t3, i, s=85, color=cor, marker="D", alpha=0.75, zorder=2)
        if t3 - t1 > 0.10:
            ax.text(t1 - 0.02, i, f"{t1:.2f}", ha="right", va="center", fontsize=7)
            ax.text(t3 + 0.02, i, f"{t3:.2f}", ha="left", va="center", fontsize=7)
    ax.set_yticks(range(len(dados)))
    ax.set_yticklabels([d[0] for d in dados], fontsize=8)
    ax.set_xlim(0, 1)
    ax.set_xlabel("Acurácia (média dos 3 eixos)")
    ax.set_title("Top-1 vs Top-3: a lista de três sugestões reduz a lacuna, mas não a fecha")
    # legenda com marcadores neutros: a cor é do modelo, a forma é a métrica
    handles = [
        Line2D([], [], marker="o", linestyle="", color="#64748b", markersize=8,
               label="Top-1 (1ª sugestão)"),
        Line2D([], [], marker="D", linestyle="", color="#94a3b8", markersize=8,
               label="Top-3 (sugestões exibidas)"),
    ]
    ax.legend(handles=handles, fontsize=8, loc="lower right")
    fig.tight_layout()
    fig.savefig(FIG / "02_top1_vs_top3.png")
    plt.close(fig)


def fig_custo_vs_acuracia(zero: pd.DataFrame, modelos: list[str]) -> None:
    """Pontos numerados + legenda embaixo. Jitter em x para custos quase iguais."""
    fig, ax = plt.subplots(figsize=(8.8, 5.2))
    pontos = []
    for m in modelos:
        sub = zero[zero.modelo == m]
        if sub.empty:
            continue
        pontos.append((m, float(sub.top1.mean()), float(sub.custo_1k.mean())))

    # posiciona com desvio determinístico para evitar colisão (mesmo custo e/ou mesma acurácia)
    pontos.sort(key=lambda p: (p[2], p[1]))
    posicoes = []
    for _, acc, custo in pontos:
        x, y = max(custo, 1e-3), acc
        for _ in range(10):
            colide = any(
                abs(np.log10(x) - np.log10(x2)) < 0.07 and abs(y - y2) < 0.038
                for x2, y2 in posicoes
            )
            if not colide:
                break
            x *= 1.12
            y += 0.042
        posicoes.append((x, y))

    chaves = []
    for i, ((m, acc, custo), (x, y)) in enumerate(zip(pontos, posicoes), start=1):
        ax.scatter(x, y, s=210, color=CORES.get(m, "#888"), edgecolor="white",
                   linewidth=1.2, zorder=3)
        ax.text(x, y, str(i), ha="center", va="center", fontsize=8.5,
                color="white", fontweight="bold", zorder=4)
        chaves.append(f"{i}. {nome(m)} — US$ {custo:.2f}/1k · {acc:.2f}")

    ax.set_xscale("log")
    ax.set_xlim(5e-4, 12)
    ax.set_ylim(-0.04, 0.92)
    ax.set_xlabel("Custo por 1.000 notas (US$, escala log — XGBoost e Gemma = 0, plotados em 0,001)")
    ax.set_ylabel("Top-1 accuracy (média dos 3 eixos)")
    ax.set_title("Custo × acurácia: o modelo 19× mais caro não comprou acurácia")
    ax.legend(chaves, fontsize=7.4, loc="upper center", bbox_to_anchor=(0.5, -0.22),
              ncol=2, handlelength=0, handletextpad=0, columnspacing=2, frameon=False)
    fig.tight_layout()
    fig.savefig(FIG / "03_custo_vs_acuracia.png", bbox_inches="tight")
    plt.close(fig)


def fig_latencia(zero: pd.DataFrame, modelos: list[str]) -> None:
    dados = []
    for m in modelos:
        sub = zero[zero.modelo == m]
        if sub.lat_p50.notna().any():
            dados.append((nome(m), float(sub.lat_p50.mean()),
                          float(sub.lat_p95.mean()), CORES.get(m, "#888")))
    dados.sort(key=lambda d: d[1])
    fig, ax = plt.subplots(figsize=(8.8, 4.4))
    y = np.arange(len(dados))
    ax.barh(y, [d[1] for d in dados], color=[d[3] for d in dados], alpha=0.88)
    ax.barh(y, [max(d[2] - d[1], 0) for d in dados], left=[d[1] for d in dados],
            color=[d[3] for d in dados], alpha=0.30)
    for i, d in enumerate(dados):
        ax.text(d[2] * 1.08, i, fmt_lat(d[1]), va="center", fontsize=7.5)
    ax.set_yticks(y)
    ax.set_yticklabels([d[0] for d in dados], fontsize=8)
    ax.set_xscale("log")
    ax.set_xlim(30, 6e5)
    ax.set_xlabel("Latência por nota (escala log — unidade indicada em cada rótulo)")
    ax.set_title("Latência: XGBoost em 66 ms × LLM na nuvem × GGUF na própria máquina")
    handles = [
        Patch(color="#475569", label="p50 (mediana)"),
        Patch(color="#475569", alpha=0.30, label="p95 − p50 (cauda)"),
    ]
    ax.legend(handles=handles, fontsize=8, loc="lower right")
    fig.tight_layout()
    fig.savefig(FIG / "04_latencia.png")
    plt.close(fig)


def fig_projecao_custo(zero: pd.DataFrame, modelos: list[str]) -> None:
    volumes = [1_000, 10_000, 30_000]
    fig, ax = plt.subplots(figsize=(8.8, 4.4))
    larg = 0.8 / max(len(modelos), 1)
    for i, m in enumerate(modelos):
        c = float(zero[zero.modelo == m].custo_1k.mean())
        rotulo = f"{nome(m)} (US$ 0,00)" if c == 0 else nome(m)
        ax.bar([j + i * larg for j in range(3)], [c * v / 1000 for v in volumes],
               larg, color=CORES.get(m, "#888"), label=rotulo)
    ax.set_yscale("symlog", linthresh=1)
    ax.set_xticks([j + larg * (len(modelos) - 1) / 2 for j in range(3)])
    ax.set_xticklabels(["1.000 notas", "10.000 notas", "30.000 notas"])
    ax.set_ylabel("Custo (US$, escala symlog)")
    ax.set_title("Custo por volume — XGBoost e Gemma local ficam em US$ 0,00 em todos os volumes\n"
                 "(modelos de custo zero não têm barra: são a linha de base do gráfico)", fontsize=9.5)
    ax.legend(fontsize=6.8, ncol=3, loc="upper left")
    fig.tight_layout()
    fig.savefig(FIG / "05_projecao_custo.png")
    plt.close(fig)


def fig_determinismo(det: pd.DataFrame) -> None:
    if det.empty:
        return
    det = det[~det["modelo"].isin(OCULTOS)]
    resumo = det.groupby("modelo")["concordancia"].agg(["mean", "min"]).sort_values("mean")
    fig, ax = plt.subplots(figsize=(8.2, 3.8))
    y = np.arange(len(resumo))
    ax.barh(y, resumo["mean"], color=[CORES.get(m, "#888") for m in resumo.index], alpha=0.9)
    ax.scatter(resumo["min"], y, color="#111", zorder=3, s=26)
    for i, (m, row) in enumerate(resumo.iterrows()):
        ax.text(row["mean"] + 0.004, i, f"{row['mean']:.0%}", va="center", fontsize=7.5)
    ax.set_yticks(y)
    ax.set_yticklabels([nome(m) for m in resumo.index], fontsize=8)
    ax.set_xlim(0.6, 1.08)
    ax.set_xlabel("Concordância top-1 em 5 repetições — barra = média · ponto preto = pior nota")
    ax.set_title("Determinismo: 95–100% — o LLM varia muito menos do que o senso comum supõe")
    fig.tight_layout()
    fig.savefig(FIG / "06_determinismo.png")
    plt.close(fig)


def fig_fewshot(res: pd.DataFrame, modelos: list[str]) -> None:
    pares = []
    for m in modelos:
        z = res[(res.modelo == m) & (res.variante == "zero")]
        f = res[(res.modelo == m) & (res.variante == "few")]
        if not z.empty and not f.empty:
            pares.append((m, float(z.top1.mean()), float(f.top1.mean())))
    if not pares:
        return
    fig, ax = plt.subplots(figsize=(8.2, 4))
    x = np.arange(len(pares))
    ax.bar(x - 0.19, [p[1] for p in pares], 0.38, label="zero-shot", color="#94a3b8")
    ax.bar(x + 0.19, [p[2] for p in pares], 0.38, label="few-shot k=5", color="#0ea5e9")
    for i, p in enumerate(pares):
        ax.text(i - 0.19, p[1] + 0.012, f"{p[1]:.2f}", ha="center", fontsize=7)
        ax.text(i + 0.19, p[2] + 0.012, f"{p[2]:.2f}", ha="center", fontsize=7)
    ax.set_xticks(x)
    ax.set_xticklabels([nome(p[0]) for p in pares], fontsize=7.5)
    ax.set_ylabel("Top-1 (média dos 3 eixos)")
    ax.set_ylim(0, 0.72)
    ax.set_title("Few-shot k=5: só o DeepSeek melhorou — e pagando 4,7× mais por chamada")
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(FIG / "07_fewshot.png")
    plt.close(fig)


def carregar_humano() -> dict[str, dict[str, str]]:
    """Respostas do especialista na validação cega (gabarito oficial)."""
    caminho = RESULTS / "validacao" / "respostas.json"
    if not caminho.exists():
        return {}
    respostas = json.loads(caminho.read_text(encoding="utf-8"))
    return {v["example_id"]: {e: str(v[e]).strip().upper()
                              for e in ("modo", "mecanismo", "deteccao")}
            for v in respostas.values()}


def fig_matriz(reg: pd.DataFrame, ev: pd.DataFrame, modelos: list[str],
               humano: dict[str, dict[str, str]] | None = None) -> None:
    """Heatmap nota × modelo, agrupado por eixo, só com cor (sem símbolo).

    A célula é a fração de acerto nos TRÊS eixos da nota, contra o gabarito do
    especialista (quando disponível) — não contra o rótulo do dataset.
    """
    ORDEM_EIXOS = ["deteccao", "modo", "mecanismo"]
    linha_por_id = {r["example_id"]: r for r in ev.to_dict("records")}

    grupos: dict[str, list[str]] = {e: [] for e in ORDEM_EIXOS}
    resto: list[str] = []
    for eid in ev["example_id"]:
        eixos_nota = [e for e in str(linha_por_id[eid]["eixos"]).split(",") if e in grupos]
        (grupos[eixos_nota[0]] if eixos_nota else resto).append(eid)

    ids, limites = [], []
    for e in ORDEM_EIXOS:
        ids.extend(sorted(grupos[e]))
        limites.append((e, len(ids) - len(grupos[e]), len(ids)))
    ids.extend(resto)

    mat = np.full((len(modelos), len(ids)), np.nan)
    for i, m in enumerate(modelos):
        sub = reg[(reg.modelo == m) & (reg.rep == 0) & (reg.variante == "zero")]
        por_id = {r["example_id"]: r for r in sub.to_dict("records")}
        for j, eid in enumerate(ids):
            r = por_id.get(eid)
            if not r:
                continue
            acertos = []
            for eixo, col in COLS.items():
                ouro = humano[eid][eixo] if humano and eid in humano else str(linha_por_id[eid][col])
                pred = (r["pred"] or {}).get(eixo) or [""]
                acertos.append(int(str(pred[0]).strip().upper() == str(ouro).strip().upper()))
            mat[i, j] = float(np.mean(acertos)) if acertos else np.nan

    fig, ax = plt.subplots(figsize=(12.8, 5.6))
    cmap = matplotlib.colors.LinearSegmentedColormap.from_list(
        "acerto", ["#b91c1c", "#f59e0b", "#16a34a"])
    ax.imshow(mat, cmap=cmap, vmin=0, vmax=1, aspect="auto")

    # divisórias brancas entre os grupos de eixo
    for k, (eixo, ini, fim) in enumerate(limites):
        if k > 0:
            ax.axvline(ini - 0.5, color="white", lw=4)
        ax.text((ini + fim - 1) / 2, -2.1, f"{EIXO_PT[eixo].upper()}\nn={fim - ini}",
                ha="center", va="bottom", fontsize=9.5, fontweight="bold",
                color="#0f172a", clip_on=False)
        ax.axvline((ini + fim - 1) / 2 + 0.5, color="white", lw=0, alpha=0)

    # grade fina para separar as notas
    ax.set_xticks(np.arange(-0.5, len(ids), 1), minor=True)
    ax.set_yticks(np.arange(-0.5, len(modelos), 1), minor=True)
    ax.grid(which="minor", color="white", lw=0.8)
    ax.tick_params(which="minor", length=0)

    ax.set_xticks(range(len(ids)))
    rotulos = []
    for eid in ids:
        nota = linha_por_id[eid]
        eixo = str(nota["eixos"]).split(",")[0]
        codigo = humano[eid][eixo] if humano and eid in humano else nota[COLS[eixo]]
        rotulos.append(curto(codigo, eixo))
    ax.set_xticklabels(rotulos, rotation=40, ha="right", fontsize=7)
    ax.set_yticks(range(len(modelos)))
    ax.set_yticklabels([nome(m) for m in modelos], fontsize=8.5)
    ax.set_ylim(len(modelos) - 0.5, -0.5)
    ax.set_xlim(-0.5, len(ids) - 0.5)
    ax.set_title("Acerto por nota nos três eixos — gabarito do especialista\n"
                 "cor = fração de acerto (vermelho 0 · amarelo metade · verde 3 de 3)",
                 fontsize=10.5, pad=52)

    barra = fig.colorbar(matplotlib.cm.ScalarMappable(
        norm=matplotlib.colors.Normalize(0, 1), cmap=cmap),
        ax=ax, fraction=0.025, pad=0.015, ticks=[0, 0.33, 0.67, 1])
    barra.ax.set_yticklabels(["0", "1", "2", "3"], fontsize=8)
    barra.set_label("acertos (de 3)", fontsize=8)

    fig.tight_layout()
    fig.savefig(FIG / "08_matriz_acertos.png")
    plt.close(fig)

def fig_composicao_custo(zero: pd.DataFrame, modelos: list[str]) -> None:
    """Custo por 1.000 notas separado em entrada e saída.

    Cor única por componente (não por modelo): a identidade do modelo já está no
    eixo Y, então a legenda descreve exatamente o que aparece nas barras.
    """
    from bench.config import PRECOS

    dados = []
    for m in modelos:
        sub = zero[zero.modelo == m]
        if sub.empty or m not in PRECOS:
            continue
        tin = float(sub.custo_in_1k.mean())
        tout = float(sub.custo_out_1k.mean())
        treas = float(sub["custo_reasoning_1k"].mean()) if "custo_reasoning_1k" in sub else 0.0
        dados.append((nome(m), tin, treas, tout))
    if not dados:
        return
    dados.sort(key=lambda d: sum(d[1:]))

    COR_ENTRADA = "#334155"
    COR_REAS = "#f59e0b"
    COR_SAIDA = "#cbd5e1"

    fig, ax = plt.subplots(figsize=(9.2, 4.6))
    y = np.arange(len(dados))
    ax.barh(y, [d[1] for d in dados], color=COR_ENTRADA, label="entrada (prompt)")
    base_saida = [d[1] + d[2] for d in dados]
    ax.barh(y, [d[3] for d in dados], left=base_saida, color=COR_SAIDA,
            edgecolor="#64748b", linewidth=0.6, hatch="//", label="saída (resposta)")
    for i, d in enumerate(dados):
        total = sum(d[1:])
        if total > 0:
            ax.text(total * 1.06, i, f"US$ {total:.2f}", va="center", fontsize=7.8)
        else:
            ax.text(0.00035, i, "US$ 0,00 — local", va="center", ha="left", fontsize=7.8)
    ax.set_yticks(y)
    ax.set_yticklabels([d[0] for d in dados], fontsize=8)
    ax.set_xscale("symlog", linthresh=0.01)
    ax.set_xlim(1e-4, 14)
    ax.set_xlabel("Custo por 1.000 notas (US$, escala symlog)")
    sem_reasoning = all(d[2] == 0 for d in dados)
    ax.set_title(
        "Composição do custo por chamada — entrada (prompt) e saída (resposta)\n"
        + ("thinking desligado: nenhum token de raciocínio em 270 chamadas"
           if sem_reasoning else ""),
        fontsize=10.5)
    ax.legend(fontsize=8, loc="lower right")
    fig.tight_layout()
    fig.savefig(FIG / "09_composicao_custo.png")
    plt.close(fig)


def fig_prompt_iso(res: pd.DataFrame, modelos: list[str]) -> None:
    """Compara prompt base × ISO 14224 × ISO + exemplos reais."""
    if "run_id" not in res.columns:
        return
    variantes = [("zero", "prompt base", "#94a3b8")]
    if "pilot-iso-v1" in set(res["run_id"]):
        variantes.append(("iso", "prompt + ISO 14224", "#0f766e"))
    if "pilot-exemplos-v1" in set(res["run_id"]):
        variantes.append(("exemplos", "ISO + exemplos reais", "#7c3aed"))
    if len(variantes) < 2:
        return

    pares = []
    for m in modelos:
        linha = []
        for variante, _, _ in variantes:
            sub = res[(res.modelo == m) & (res.variante == variante)]
            linha.append(float(sub.top1.mean()) if not sub.empty else np.nan)
        # só entram modelos que participaram de TODAS as variantes
        if not any(np.isnan(v) for v in linha):
            pares.append((m, linha))
    if not pares:
        return

    fig, ax = plt.subplots(figsize=(9.6, 4.6))
    larg = 0.8 / len(variantes)
    for k, (_, rotulo, cor) in enumerate(variantes):
        vals = [p[1][k] for p in pares]
        ax.bar([i + k * larg for i in range(len(pares))], vals, larg, label=rotulo, color=cor)
        for i, v in enumerate(vals):
            ax.text(i + k * larg, v + 0.012, f"{v:.2f}", ha="center", fontsize=7)
    ax.set_xticks([i + larg * (len(variantes) - 1) / 2 for i in range(len(pares))])
    rotulos = [CABECALHO.get(p[0], nome(p[0])).replace(" 12B", "").replace(" 31B", "")
               for p in pares]
    ax.set_xticklabels(rotulos, fontsize=8)
    ax.set_ylabel("Top-1 (média dos 3 eixos)")
    topo = max(max(v for v in p[1]) for p in pares)
    ax.set_ylim(0, topo + 0.18)
    ax.set_xlabel("Modelos que rodaram as três variantes de prompt")
    ax.set_title("Efeito do prompt enriquecido — acurácia por modelo")
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(FIG / "10_prompt_iso.png")
    plt.close(fig)


# ---------------------------------------------------------------------------
# Tabelas
# ---------------------------------------------------------------------------

def fmt_lat(ms) -> str:
    if pd.isna(ms):
        return "—"
    return f"{ms / 1000:,.0f} s" if ms >= 10_000 else f"{ms:,.0f} ms"


def _md(df: pd.DataFrame, path) -> None:
    df.to_csv(path.with_suffix(".csv"), index=False)
    linhas = ["| " + " | ".join(df.columns) + " |",
              "| " + " | ".join(["---"] * len(df.columns)) + " |"]
    for _, r in df.iterrows():
        linhas.append("| " + " | ".join(str(v) for v in r.values) + " |")
    path.with_suffix(".md").write_text("\n".join(linhas) + "\n", encoding="utf-8")


def tabelas(res: pd.DataFrame, zero: pd.DataFrame, modelos: list[str], det: pd.DataFrame) -> None:
    # 1. completa por eixo
    completa = res[["modelo", "variante", "eixo", "n", "top1", "top3",
                    "macro_f1", "invalidos_pct", "custo_1k", "lat_p50"]].copy()
    completa["modelo"] = completa["modelo"].map(nome)
    completa["eixo"] = completa["eixo"].map(lambda e: EIXO_PT.get(e, e))
    for c in ("top1", "top3", "macro_f1"):
        completa[c] = completa[c].map(lambda v: f"{v:.2f}")
    completa["invalidos_pct"] = completa["invalidos_pct"].map(lambda v: f"{v:.0f}%")
    completa["custo_1k"] = completa["custo_1k"].map(lambda v: f"{v:.2f}")
    completa["lat_p50"] = completa["lat_p50"].map(fmt_lat)
    completa.columns = ["Modelo", "Variante", "Eixo", "n", "Top-1", "Top-3", "Macro-F1",
                        "Cód. inválido", "US$/1k", "p50 (ms)"]
    _md(completa, TAB / "01_por_eixo")

    # 2. agregada
    agg = (zero.groupby("modelo")
           .agg(top1=("top1", "mean"), top3=("top3", "mean"), f1=("macro_f1", "mean"),
                custo=("custo_1k", "mean"), lat=("lat_p50", "mean"))
           .reindex([m for m in modelos if m in set(zero.modelo)]))
    tabela = pd.DataFrame({
        "Modelo": [nome(m) for m in agg.index],
        "Top-1": [f"{v:.2f}" for v in agg.top1],
        "Top-3": [f"{v:.2f}" for v in agg.top3],
        "Macro-F1": [f"{v:.2f}" for v in agg.f1],
        "US$ / 1.000 notas": [f"{v:.2f}" for v in agg.custo],
        "Latência p50": [fmt_lat(v) for v in agg.lat],
    })
    _md(tabela, TAB / "02_agregada")

    # 3. custo por volume
    vol = pd.DataFrame({
        "Modelo": [nome(m) for m in agg.index],
        "1.000 notas": [f"US$ {v * 1:,.2f}" for v in agg.custo],
        "10.000 notas": [f"US$ {v * 10:,.2f}" for v in agg.custo],
        "30.000 notas": [f"US$ {v * 30:,.2f}" for v in agg.custo],
    })
    _md(vol, TAB / "03_custo_por_volume")

    # 4. determinismo
    if not det.empty:
        d = (det[~det.modelo.isin(OCULTOS)]
             .groupby("modelo")["concordancia"]
             .agg(media="mean", pior="min", medidas="count").reset_index())
        d["modelo"] = d["modelo"].map(nome)
        d.columns = ["Modelo", "Concordância média", "Pior nota", "Medições"]
        d["Concordância média"] = d["Concordância média"].map(lambda v: f"{v:.0%}")
        d["Pior nota"] = d["Pior nota"].map(lambda v: f"{v:.0%}")
        _md(d, TAB / "04_determinismo")

    # 5. few-shot
    linhas = []
    for m in modelos:
        z = res[(res.modelo == m) & (res.variante == "zero")]
        f = res[(res.modelo == m) & (res.variante == "few")]
        if z.empty or f.empty:
            continue
        linhas.append({
            "Modelo": nome(m),
            "Top-1 zero-shot": f"{z.top1.mean():.2f}",
            "Top-1 few-shot": f"{f.top1.mean():.2f}",
            "Δ": f"{f.top1.mean() - z.top1.mean():+.2f}",
            "US$/1k zero": f"{z.custo_1k.mean():.2f}",
            "US$/1k few": f"{f.custo_1k.mean():.2f}",
            "Custo relativo": f"{f.custo_1k.mean() / max(z.custo_1k.mean(), 1e-9):.1f}×",
        })
    if linhas:
        _md(pd.DataFrame(linhas), TAB / "05_fewshot")


def tabela_custo_real(reg: pd.DataFrame, zero_shot_runs: list[str]) -> None:
    """Custo observado APENAS na rodada zero-shot: tokens reais × preço de lista."""
    from bench.config import PRECOS

    reg = reg[reg["run_id"].isin(zero_shot_runs) & (reg["rep"] == 0)]
    linhas = []
    for m, g in reg.groupby("modelo"):
        if m in OCULTOS:
            continue
        g = g[g["rep"] == 0]
        if g.empty:
            continue
        tin = int(g["usage"].map(lambda u: (u or {}).get("prompt_tokens", 0)).sum())
        tout = int(g["usage"].map(lambda u: (u or {}).get("completion_tokens", 0)).sum())
        pi, po = PRECOS.get(m, (0.0, 0.0))
        cin, cout = tin * pi / 1e6, tout * po / 1e6
        n = len(g)
        custo = cin + cout
        linhas.append({
            "Modelo": nome(m),
            "Chamadas": n,
            "Tokens entrada": f"{tin:,}".replace(",", "."),
            "Tokens saída": f"{tout:,}".replace(",", "."),
            "Custo entrada": f"{cin:.4f}",
            "Custo saída": f"{cout:.4f}",
            "Custo total": f"{custo:.4f}",
            "Custo/chamada": f"{custo / max(n, 1):.6f}",
            "US$/1.000 notas": f"{custo / max(n, 1) * 1000:.2f}",
        })
    if linhas:
        _md(pd.DataFrame(linhas), TAB / "07_custo_real")

    # energia dos modelos locais (premissas explícitas)
    locais = reg[(reg["modelo"].str.startswith("gemma")) & (reg["rep"] == 0)]
    if not locais.empty:
        horas = locais["latencia_ms"].sum() / 3_600_000
        kwh = horas * 0.100                     # 100 W de sistema (CPU+GPU) em carga
        linhas_energia = [{
            "Modelo": nome(locais["modelo"].iloc[0]),
            "Chamadas": len(locais),
            "Tempo total": f"{horas:.2f} h",
            "Consumo estimado": f"{kwh:.3f} kWh",
            "Custo de energia (R$ 0,85/kWh)": f"R$ {kwh * 0.85:.2f}",
            "Equivalente em US$ (R$ 5,40/US$)": f"US$ {kwh * 0.85 / 5.40:.3f}",
        }]
        _md(pd.DataFrame(linhas_energia), TAB / "08_custo_energia_local")


CABECALHO = {
    "local_publicado": "XGBoost",
    "gemma-4-12b-qat": "Gemma 12B",
    "gemma-4-31b-q3": "Gemma 31B",
    "claude-haiku-5-5": "Claude Haiku",
    "gpt-6-luna": "GPT-6 Luna",
    "deepseek-v4.1-flash": "DeepSeek",
    "qwen3.8-flash": "Qwen Flash",
    "qwen3.8-max": "Qwen Max",
}


def tabela_por_nota(reg: pd.DataFrame, ev: pd.DataFrame, modelos: list[str]) -> None:
    for eixo, col in COLS.items():
        sub = ev[ev["eixos"].str.contains(eixo)]
        linhas = []
        for _, nota in sub.iterrows():
            linha = {
                "Nota": nota["example_id"][-4:],
                "Tag": nota["Tag"][:20],
                "Descrição": nota["Description"][:48] + ("…" if len(nota["Description"]) > 48 else ""),
                "Gabarito": rotulo(nota[col], eixo),
            }
            for m in modelos:
                r = reg[(reg.modelo == m) & (reg.example_id == nota["example_id"]) & (reg.rep == 0)]
                if r.empty:
                    linha[CABECALHO.get(m, nome(m))] = "—"
                    continue
                pred = (r.iloc[0]["pred"] or {}).get(eixo) or []
                p1 = pred[0] if pred else "—"
                marca = "✓" if p1 == nota[col] else "✗"
                linha[CABECALHO.get(m, nome(m))] = f"{curto(p1, eixo)} {marca}"
            linhas.append(linha)
        _md(pd.DataFrame(linhas), TAB / f"06_notas_{eixo}")


def main() -> None:
    estilo()
    res = visiveis(pd.read_csv(RESULTS / "scoring.csv"))
    det_path = RESULTS / "determinismo.csv"
    det = pd.read_csv(det_path) if det_path.exists() else pd.DataFrame()

    ev = pd.read_csv(RESULTS / "eval_set.csv", dtype=str)

    regs = []
    for f in sorted(RAW.glob("*.jsonl")):
        for linha in f.read_text(encoding="utf-8").splitlines():
            if linha.strip():
                regs.append(json.loads(linha))
    reg = pd.DataFrame(regs)

    modelos = modelos_presentes(res)

    # a rodada com prompt enriquecido é uma variante própria
    if "run_id" in res.columns:
        res.loc[res["run_id"] == "pilot-iso-v1", "variante"] = "iso"
        res.loc[res["run_id"] == "pilot-exemplos-v1", "variante"] = "exemplos"

    # XGBoost foi avaliado in-process (sem HTTP): usa a latência medida na API local
    held = reg[(reg["modelo"] == "local_heldout") & reg["latencia_ms"].notna()]
    if not held.empty:
        lat = float(held["latencia_ms"].median())
        lat95 = float(held["latencia_ms"].quantile(0.95))
        mask = (res["modelo"] == "local_publicado") & res["lat_p50"].isna()
        res.loc[mask, "lat_p50"] = lat
        res.loc[mask, "lat_p95"] = lat95

    zero = res[res["variante"] == "zero"].copy()

    fig_dot_plot_eixos(zero, modelos)
    fig_top1_vs_top3(zero, modelos)
    fig_custo_vs_acuracia(zero, modelos)
    fig_latencia(zero, modelos)
    fig_projecao_custo(zero, modelos)
    fig_determinismo(det)
    fig_fewshot(res, modelos)
    fig_matriz(reg, ev, modelos, carregar_humano())
    fig_composicao_custo(zero, modelos)
    fig_prompt_iso(res, modelos)
    tabelas(res, zero, modelos, det)
    tabela_custo_real(reg, ["pilot-zero-v2", "local-gemma12-v1", "local-publicado"])
    tabela_por_nota(reg, ev, modelos)

    print("figuras:", sorted(p.name for p in FIG.glob("*.png")))
    print("tabelas:", sorted(p.name for p in TAB.glob("*.md")))


if __name__ == "__main__":
    main()
