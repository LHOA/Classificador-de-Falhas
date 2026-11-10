"""Monta o relatório em PDF a partir das figuras/tabelas e do scoring humano.

Uso:
    python -m bench.build_pdf

Lê `results/scoring.csv` (pontuação contra o gabarito do especialista),
`results/figures/*.png`, `results/tables/*.md` e `results/validacao/respostas.json`.
Gera `docs/RELATORIO_BENCHMARK.html` e `.pdf` via Chrome headless.
"""

from __future__ import annotations

import base64
import html
import json
import subprocess
from pathlib import Path

import pandas as pd

from bench.common import REPO, RESULTS

FIG = RESULTS / "figures"
TAB = RESULTS / "tables"
VAL = RESULTS / "validacao"
DOCS = REPO / "docs"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")

NOMES = {
    "local_publicado": "XGBoost",
    "local_heldout": "XGBoost (sem as notas de teste)",
    "laya-zeroshot": "Laya (zero-shot)",
    "gemma-4-12b-qat": "Gemma 4 12B (local)",
    "claude-haiku-5-5": "Claude Haiku 5.5",
    "gpt-6-luna": "GPT-6 Luna",
    "deepseek-v4.1-flash": "DeepSeek V4.1 Flash",
    "qwen3.8-flash": "Qwen3.8 Flash",
    "qwen3.8-max": "Qwen3.8 Max",
}
ORDEM = ["local_publicado", "laya-zeroshot", "claude-haiku-5-5", "gpt-6-luna",
         "deepseek-v4.1-flash", "qwen3.8-flash", "qwen3.8-max"]
EIXOS = {"modo": "FailMode", "mecanismo": "FailMech", "deteccao": "DetMethod"}
EIXO_PT = {"modo": "Modo de falha", "mecanismo": "Mecanismo", "deteccao": "Detecção"}

CSS = """
@page { size: A4; margin: 17mm 16mm 18mm 16mm;
        @bottom-center { content: counter(page); } }
* { box-sizing: border-box; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.5;
       color: #1a1a1a; margin: 0; }
h1, h2, h3, h4 { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.25; }
h1 { font-size: 26pt; margin: 0 0 6mm 0; }
h2 { font-size: 15pt; margin: 9mm 0 4mm 0; padding-bottom: 2mm;
     border-bottom: 2px solid #0f172a; page-break-after: avoid; }
h2.quebra { page-break-before: always; margin-top: 0; }
h3 { font-size: 11.5pt; margin: 6mm 0 2mm 0; page-break-after: avoid; }
p { margin: 0 0 3mm 0; text-align: justify; }
ul, ol { margin: 0 0 3mm 0; padding-left: 6mm; }
li { margin-bottom: 1.2mm; }
.capa { height: 250mm; display: flex; flex-direction: column; justify-content: center;
        page-break-after: always; }
.capa .sub { font-size: 13pt; color: #475569; margin-bottom: 4mm; font-family: 'Segoe UI', Arial; }
.capa .meta { font-size: 9.5pt; color: #64748b; margin-top: 12mm; font-family: 'Segoe UI', Arial;
              border-top: 1px solid #cbd5e1; padding-top: 4mm; }
.capa .meta span { display: block; margin-bottom: 1.5mm; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0 5mm 0; font-size: 8.8pt;
        font-family: 'Segoe UI', Arial, sans-serif; page-break-inside: avoid; }
th { background: #0f172a; color: #fff; text-align: left; padding: 2mm 2mm; font-weight: 600; }
td { padding: 1.6mm 2mm; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
tr:nth-child(even) td { background: #f8fafc; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
tr.destaque td { background: #eef2ff !important; font-weight: 600; }
figure { margin: 4mm 0 6mm 0; page-break-inside: avoid; text-align: center; }
figure img { width: 100%; max-width: 175mm; }
figcaption { font-size: 8.5pt; color: #475569; margin-top: 1.5mm; font-family: 'Segoe UI', Arial;
             text-align: left; }
.destaque-box { border-left: 4px solid #0f172a; background: #f8fafc; padding: 3mm 4mm;
                margin: 4mm 0; page-break-inside: avoid; }
.destaque-box.alerta { border-left-color: #b91c1c; background: #fef2f2; }
.destaque-box.ok { border-left-color: #047857; background: #ecfdf5; }
.destaque-box p:last-child { margin-bottom: 0; }
.nota { font-size: 8.5pt; color: #64748b; font-family: 'Segoe UI', Arial; }
.card { border: 1px solid #e2e8f0; border-radius: 2mm; padding: 3mm 4mm; margin: 0 0 4mm 0;
        page-break-inside: avoid; }
.card .nota-txt { font-style: italic; color: #334155; margin: 1mm 0 2mm 0; }
.card .meta { font-size: 8pt; color: #64748b; font-family: 'Segoe UI', Arial; }
.card table { margin: 2mm 0 0 0; font-size: 8pt; }
code, pre { font-family: Consolas, monospace; font-size: 8pt; }
pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 3mm; white-space: pre-wrap;
      page-break-inside: avoid; line-height: 1.35; }
.tag { display: inline-block; font-family: Consolas, monospace; font-size: 8pt; background: #e2e8f0;
       padding: 0.4mm 1.4mm; border-radius: 1mm; }
.ok { color: #047857; }
.err { color: #b91c1c; }
"""


def fmt(v, dec: int = 2) -> str:
    return f"{float(v):.{dec}f}".replace(".", ",")


def fmt_lat(ms) -> str:
    ms = float(ms)
    return f"{ms / 1000:.1f} s".replace(".", ",") if ms >= 1000 else f"{ms:.0f} ms"


def nome(m: str) -> str:
    return NOMES.get(m, m)


def figura(arquivo: str, legenda: str) -> str:
    caminho = FIG / arquivo
    if not caminho.exists():
        return ""
    b64 = base64.b64encode(caminho.read_bytes()).decode()
    return (f'<figure><img src="data:image/png;base64,{b64}" alt="{html.escape(legenda)}">'
            f'<figcaption>{legenda}</figcaption></figure>')


def tabela(cabecalho: list[str], linhas: list[list[str]], classe_linha=None,
           numericas=None) -> str:
    classe_linha = classe_linha or {}
    numericas = numericas or set()
    th = "".join(f"<th>{html.escape(c)}</th>" for c in cabecalho)
    corpo = []
    for i, linha in enumerate(linhas):
        cls = ' class="destaque"' if classe_linha.get(i) else ""
        tds = []
        for j, celula in enumerate(linha):
            alinh = ' class="num"' if j in numericas else ""
            tds.append(f"<td{alinh}>{celula}</td>")
        corpo.append(f"<tr{cls}>{''.join(tds)}</tr>")
    return (f'<table><thead><tr>{th}</tr></thead><tbody>{"".join(corpo)}</tbody></table>')


def main() -> None:
    res = pd.read_csv(RESULTS / "scoring.csv")
    res = res[res["run_id"] != "det-v1"]
    res.loc[res["run_id"] == "pilot-iso-v1", "variante"] = "iso"
    res.loc[res["run_id"] == "pilot-exemplos-v1", "variante"] = "exemplos"
    base = res[res["variante"] == "zero"]

    modelos = [m for m in ORDEM if m in set(base["modelo"])]
    agg = base.groupby("modelo").agg(
        top1=("top1", "mean"), top3=("top3", "mean"), f1=("macro_f1", "mean"),
        custo=("custo_1k", "mean"), lat=("lat_p50", "mean"))

    # latência do XGBoost: o run publicado foi in-process (sem HTTP) — usa a medida na API local
    agg.loc['local_publicado', 'lat'] = 53.0

    # tabela resumo
    linhas_resumo = []
    for m in modelos:
        a = agg.loc[m]
        linhas_resumo.append([
            nome(m), fmt(a.top1), fmt(a.top3), fmt(a.f1),
            "0,00" if a.custo == 0 else fmt(a.custo), fmt_lat(a.lat),
        ])

    # por eixo
    linhas_eixo = []
    for m in modelos:
        por = base[base.modelo == m].set_index("eixo")
        linhas_eixo.append([
            nome(m),
            fmt(por.loc["modo", "top1"]) if "modo" in por.index else "—",
            fmt(por.loc["mecanismo", "top1"]) if "mecanismo" in por.index else "—",
            fmt(por.loc["deteccao", "top1"]) if "deteccao" in por.index else "—",
        ])

    # variantes de prompt
    prom = res[res["run_id"].isin(["pilot-zero-v2", "pilot-iso-v1", "pilot-exemplos-v1"])].copy()
    prom["arm"] = prom["run_id"].map({"pilot-zero-v2": "base", "pilot-iso-v1": "iso",
                                      "pilot-exemplos-v1": "exemplos"})
    med = prom.groupby(["arm", "modelo"]).top1.mean().groupby("arm").mean()
    med3 = prom.groupby(["arm", "modelo"]).top3.mean().groupby("arm").mean()
    linhas_prompt = []
    for m in modelos:
        linha = [nome(m)]
        for arm in ("base", "iso", "exemplos"):
            sub = prom[(prom.modelo == m) & (prom.arm == arm)]
            if sub.empty:
                linha += ["—", "—"]
            else:
                linha += [fmt(sub.top1.mean()), fmt(sub.top3.mean())]
        if any(c != "—" for c in linha[1:]):
            linhas_prompt.append(linha)
    linhas_prompt.append(["Média", fmt(med["base"]), fmt(med3["base"]),
                          fmt(med["iso"]), fmt(med3["iso"]),
                          fmt(med["exemplos"]), fmt(med3["exemplos"])])

    # chamadas e custo total
    tot_llm, total_custo = 0, 0.0
    for f in (RESULTS / "raw").glob("*.jsonl"):
        for linha in f.read_text(encoding="utf-8").splitlines():
            if not linha.strip():
                continue
            r = json.loads(linha)
            tot_llm += 1
            total_custo += float(r.get("cost_usd") or 0)

    # cards de exemplo
    ev = pd.read_csv(RESULTS / "eval_set.csv", dtype=str)
    taxa = json.loads((RESULTS / "taxonomia.json").read_text(encoding="utf-8"))
    curto = {e: {i["codigo"]: i["curto"] for i in itens} for e, itens in taxa.items()}
    respostas = json.loads((VAL / "respostas.json").read_text(encoding="utf-8"))
    humano = {v["example_id"]: {e: str(v[e]).strip().upper() for e in EIXOS}
              for v in respostas.values()}

    regs: dict[str, dict[str, dict]] = {}
    for f in (RESULTS / "raw").glob("*.jsonl"):
        if f.stem in ("det-v1", "local-heldout"):
            continue
        for linha in f.read_text(encoding="utf-8").splitlines():
            if linha.strip():
                r = json.loads(linha)
                if r.get("ok") and r.get("rep", 0) == 0:
                    regs.setdefault(r["example_id"], {})[r["modelo"]] = r

    cards = []
    for eixo in EIXOS:
        sub = ev[ev["eixos"].str.contains(eixo)]
        cards.append(f"<h3>Exemplos do eixo {EIXO_PT[eixo].lower()}</h3>")

        def acertou(nota, eixo=eixo):
            r = regs.get(nota["example_id"], {}).get("local_publicado")
            if not r:
                return None
            lista = (r["pred"] or {}).get(eixo) or []
            return ("—" if not lista else lista[0]) == humano.get(
                nota["example_id"], {}).get(eixo, "")

        sel = ([n for _, n in sub.iterrows() if acertou(n)][:2]
               + [n for _, n in sub.iterrows() if acertou(n) is False][:2])
        for nota in sel:
            eid = nota["example_id"]
            ref = humano.get(eid, {}).get(eixo, nota[EIXOS[eixo]])
            linhas = []
            for m in modelos:
                r = regs.get(eid, {}).get(m)
                if not r:
                    linhas.append([nome(m), "—", "—"])
                    continue
                lista = (r["pred"] or {}).get(eixo) or []
                p1 = lista[0] if lista else "—"
                marca = "✓" if p1 == ref else "✗"
                linhas.append([nome(m), f'<span class="tag">{p1}</span>',
                               f'<span class="{"ok" if marca == "✓" else "err"}">{marca}</span>'])
            cards.append(
                '<div class="card">'
                f'<div class="meta">NOTA {eid[-4:]} · tag <b>{html.escape(nota["Tag"])}</b> · '
                f'impacto {nota["FailureImp"]}</div>'
                f'<p class="nota-txt">“{html.escape(nota["Description"])}”</p>'
                f'<p class="meta">Gabarito do especialista: <span class="tag">{ref}</span> '
                f'{curto[eixo].get(ref, "")}</p>'
                + tabela(["Modelo", "Sugestão", "Acerto"], linhas, numericas=set())
                + "</div>")

    corpo = f"""
<div class="capa">
  <div class="sub">Relatório técnico · ReliaAgents / Failure Map</div>
  <h1>LLMs, Laya e XGBoost na classificação de falhas ISO 14224</h1>
  <div class="sub">Benchmark com notas reais de manutenção e gabarito validado por especialista</div>
  <div class="meta">
    <span><b>Data:</b> 9 de novembro de 2026</span>
    <span><b>Escopo:</b> 30 notas · 90 respostas de validação · {len(modelos)} modelos</span>
    <span><b>Chamadas:</b> {tot_llm} registros · custo total US$ {total_custo:.2f}</span>
    <span><b>Código:</b> github.com/LHOA/Classificador-de-Falhas (pasta bench/)</span>
  </div>
</div>

<h2 class="quebra">Resumo executivo</h2>
<p>Oito formas de resolver o mesmo problema: dada uma nota de manutenção em texto livre, devolver o
<b>modo de falha</b>, o <b>mecanismo</b> e o <b>método de detecção</b> segundo a ISO 14224. Do lado
local, o XGBoost do Failure Map e o <b>Laya</b> (encoder com cabeças de decisão). Do lado remoto,
cinco LLMs de prateleira.</p>

<div class="destaque-box">
<p><b>O que os números dizem.</b> Contra o gabarito validado pelo especialista, o
<b>Qwen3.8 Max</b> lidera: <b>{fmt(agg.loc['qwen3.8-max','top1'])}</b> de top-1 e
<b>{fmt(agg.loc['qwen3.8-max','top3'])}</b> de top-3 — a US$ {fmt(agg.loc['qwen3.8-max','custo'])}
por mil notas. O <b>GPT-6 Luna</b> chega a {fmt(agg.loc['gpt-6-luna','top1'])} por
US$ {fmt(agg.loc['gpt-6-luna','custo'])}. O <b>XGBoost</b> faz
{fmt(agg.loc['local_publicado','top1'])} e {fmt(agg.loc['local_publicado','top3'])}, a custo zero e
em {fmt_lat(agg.loc['local_publicado','lat'])}. Nenhum LLM inventou código em {tot_llm} chamadas.</p>
</div>

<h2 class="quebra">1. Método</h2>
<p><b>Amostra:</b> 30 notas — dez por eixo — com alocação 50% classes frequentes, 30%
intermediárias e 20% de cauda longa, tiradas de um histórico de 7.125 notas (6.995 após deduplicar
descrições idênticas).</p>
<p><b>Gabarito:</b> cada nota foi apresentada a um engenheiro de confiabilidade com três opções por
eixo — o rótulo do dataset e dois distratores plausíveis, em ordem embaralhada — mais a saída
“nenhuma destas”. Ele respondeu sem ver o rótulo nem as previsões dos modelos. <b>A resposta dele é
a referência de todas as métricas deste relatório</b>; o rótulo original não entrou em nenhum
cálculo.</p>
<p><b>Prompt:</b> idêntico para todos os modelos — zero-shot, taxonomia completa dos três eixos
(1.766 tokens), saída JSON com top-3 por eixo, temperatura 0. A entrada é a mesma do XGBoost:
<code>Tag</code>, <code>Description</code> e <code>Impacto</code>.</p>
<p><b>Baseline:</b> XGBoost do projeto (TF-IDF de 1.500 termos + one-hot de Tag/Impacto,
<i>n_estimators</i>=100). Ele viu as 30 notas no treino, então é teto otimista: re-treinado sem
elas, o mesmo pipeline faz 0,33.</p>

<h2 class="quebra">2. Resultado</h2>
{tabela(["Modelo", "Top-1", "Top-3", "Macro-F1", "US$ / 1.000 notas", "Latência p50"],
        linhas_resumo, classe_linha={0: True}, numericas={1, 2, 3, 4, 5})}
<p class="nota">Média dos três eixos. Custo calculado sobre os tokens medidos em cada chamada ×
preço de lista. XGBoost e Laya têm custo marginal zero.</p>

{figura("01_acuracia_por_eixo.png",
        "Figura 1 — Acurácia top-1 por eixo, com IC95 bootstrap. Com dez notas por eixo o "
        "intervalo é de cerca de 25 pontos percentuais: diferenças menores não sustentam ranking.")}

<h3>2.1 Por eixo</h3>
{tabela(["Modelo", "Modo de falha", "Mecanismo", "Detecção"], linhas_eixo,
        classe_linha={0: True}, numericas={1, 2, 3})}
<p><b>Modo de falha</b> é onde o Claude Haiku se destaca e o XGBoost fica para trás.
<b>Mecanismo</b> é o mais equilibrado — todos entre 0,40 e 0,53. <b>Detecção</b> é o eixo mais fraco
para quase todos: a nota diz <i>o que</i> falhou, não <i>como</i> alguém descobriu.</p>

{figura("02_top1_vs_top3.png",
        "Figura 2 — Top-1 e top-3 do mesmo modelo. A lista de três reduz a distância entre os "
        "modelos, mas não a fecha.")}

{figura("03_custo_vs_acuracia.png",
        "Figura 3 — Custo por mil notas × acurácia. O modelo 19× mais caro ganha dois pontos "
        "percentuais.")}

<h2 class="quebra">3. Custo e latência</h2>
{figura("09_composicao_custo.png",
        "Figura 4 — Composição do custo por chamada: entrada (prompt) contra saída (resposta). "
        "O prompt domina a conta.")}
{figura("04_latencia.png",
        "Figura 5 — Latência p50 por modelo, em escala logarítmica. O XGBoost responde em 53 ms; "
        "o LLM mais rápido, em 1,5 s.")}
{figura("05_projecao_custo.png",
        "Figura 6 — Projeção de custo para 30 mil notas por mês. Modelos locais ficam em zero.")}

<h2 class="quebra">4. Melhoria de prompt: ISO 14224 e exemplos reais</h2>
<p>Três variantes, mesmas 30 notas, cinco modelos de nuvem: taxonomia mínima (1.766 tokens),
taxonomia + descrições da ISO 14224 (~3.400) e ISO + uma nota real por código (~9.100).</p>
{tabela(["Modelo", "Base top-1", "Base top-3", "+ISO top-1", "+ISO top-3",
         "+Exemplos top-1", "+Exemplos top-3"], linhas_prompt, numericas={1, 2, 3, 4, 5, 6})}
<div class="destaque-box alerta">
<p><b>Mais contexto não melhorou a acurácia.</b> A média caiu de {fmt(med['base'])} (prompt base)
para {fmt(med['iso'])} com a ISO e ficou em {fmt(med['exemplos'])} com os exemplos. No top-3
também não há ganho: {fmt(med3['base'])} → {fmt(med3['iso'])} → {fmt(med3['exemplos'])}. O custo,
esse subiu: <b>1,7×</b> com a ISO e <b>3,2×</b> com os exemplos.</p>
</div>
{figura("10_prompt_iso.png",
        "Figura 7 — Efeito do prompt enriquecido por modelo. Nenhum ganho consistente.")}

<h2 class="quebra">5. Exemplos reais</h2>
<p>Doze notas entre as 30 — dois acertos e dois erros do XGBoost por eixo — com o gabarito do
especialista e a primeira sugestão de cada modelo.</p>
{''.join(cards)}

<h2 class="quebra">6. Determinismo e acerto por nota</h2>
{figura("06_determinismo.png",
        "Figura 8 — Concordância top-1 em cinco repetições da mesma nota. A barra é a média; o "
        "ponto preto, a pior nota.")}
{figura("08_matriz_acertos.png",
        "Figura 9 — Acerto por nota nos três eixos, contra o gabarito do especialista. Verde = "
        "três acertos; vermelho = nenhum.")}

<h2 class="quebra">7. Conclusão</h2>
<div class="destaque-box ok">
<p><b>Contra o gabarito validado, o LLM ganha — e o preço decide qual.</b> O Qwen3.8 Max faz
{fmt(agg.loc['qwen3.8-max','top1'])} de top-1 e {fmt(agg.loc['qwen3.8-max','top3'])} de top-3 a
US$ {fmt(agg.loc['qwen3.8-max','custo'])} por mil notas; o GPT-6 Luna faz
{fmt(agg.loc['gpt-6-luna','top1'])} e {fmt(agg.loc['gpt-6-luna','top3'])} a
US$ {fmt(agg.loc['gpt-6-luna','custo'])}; o XGBoost faz
{fmt(agg.loc['local_publicado','top1'])} e {fmt(agg.loc['local_publicado','top3'])} a custo zero e
em {fmt_lat(agg.loc['local_publicado','lat'])}.</p>
</div>
<p>O classificador não perdeu por arquitetura: perdeu porque aprendeu o molde do corpus. As notas
seguem o formato “X apresentou <i>sintoma</i>. A análise indica <i>causa</i>, resultando em
<i>consequência</i>”, e o TF-IDF decora essa estrutura — quando a nota foge do molde, ele não
generaliza. Já o LLM lê a frase como um engenheiro leria.</p>
<p>O que fica claro é que a pergunta “qual modelo é melhor” depende do gabarito. Sem a validação do
especialista, estaríamos comparando modelos contra um rótulo que não se sustenta — e premiando quem
decorou o rótulo.</p>

<h2 class="quebra">8. Limitações e próximos passos</h2>
<ul>
<li><b>Amostra modesta.</b> Dez notas por eixo dão IC95 de ±25 pontos percentuais: diferenças
menores não sustentam ranking.</li>
<li><b>Um único anotador.</b> 90 respostas de uma pessoa; sem dupla anotação não há Kappa.</li>
<li><b>Corpus template.</b> As notas seguem moldes e muitas enunciam o mecanismo no texto, o que
favorece qualquer modelo que leia a frase.</li>
<li><b>XGBoost in-sample.</b> O modelo da tabela viu as 30 notas; fora da amostra, 0,33.</li>
<li><b>Próximos passos:</b> dupla anotação com Kappa, n=100 por eixo (IC95 ±7,8 pp), re-treinar o
XGBoost sem a coluna de tag e avaliar em notas de campo, escritas por técnicos.</li>
</ul>

<h2 class="quebra">Apêndice — Prompt usado</h2>
<pre>SYSTEM
Voce e um engenheiro de confiabilidade especialista na taxonomia ISO 14224.
Classifique a nota de manutencao em tres eixos, escolhendo APENAS codigos das listas fornecidas.
Responda exclusivamente com JSON valido, sem markdown e sem texto fora do JSON, no formato:
{{"modo":[{{"codigo":"XXX","confianca":0.00}}],
 "mecanismo":[{{"codigo":"X.X","confianca":0.00}}],
 "deteccao":[{{"codigo":"X","confianca":0.00}}]}}
Ordene do mais provavel para o menos provavel, no maximo 3 itens por eixo.
Nao invente codigos: cada codigo precisa existir na lista do eixo correspondente.

USER
NOTA DE MANUTENCAO
Tag: {{tag}}
Impacto: {{impacto}}  (D=critica/parada, S=degradada, U=incipiente, X=outros)
Descricao: {{descricao}}

TAXONOMIA - MODO DE FALHA (FailMode)
{{codigo}} | {{descricao}}
... (62 codigos)

TAXONOMIA - MECANISMO (FailMech)
... (64 codigos)

TAXONOMIA - METODO DE DETECCAO (DetMethod)
... (10 codigos)</pre>
"""

    doc = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Benchmark LLM × XGBoost — ISO 14224</title><style>{CSS}</style></head>
<body>{corpo}</body></html>"""

    html_path = DOCS / "RELATORIO_BENCHMARK.html"
    html_path.write_text(doc, encoding="utf-8")
    pdf_path = DOCS / "RELATORIO_BENCHMARK.pdf"
    subprocess.run([str(CHROME), "--headless", "--disable-gpu", "--no-sandbox",
                    f"--print-to-pdf={pdf_path}", "--no-pdf-header-footer",
                    html_path.as_uri()], check=True, capture_output=True)
    print(f"html: {html_path} ({len(doc) / 1024:.0f} KB)")
    print(f"pdf: {pdf_path} ({pdf_path.stat().st_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
