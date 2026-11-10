# Benchmark LLM × XGBoost — classificação de falhas ISO 14224

**Data:** 2026-11-09 · **Escopo:** 30 notas · **Gabarito:** validação de especialista (90 respostas)
**Chamadas:** 680 · **Custo total:** US$ 1,38 · **Falhas:** 0 · **JSON inválido:** 0 · **Código fora da taxonomia:** 0

> Todas as métricas deste documento usam como referência as respostas do especialista na
> validação cega — não o rótulo original do dataset, que não entrou em nenhum cálculo.

---

## Resumo

1. **O LLM de prateleira ganha do classificador.** Qwen3.8 Max: 0,50 de top-1 e 0,70 de top-3. XGBoost: 0,36 e 0,54. Laya zero-shot: 0,06 e 0,12.
2. **O custo é o preço da diferença.** O GPT-6 Luna faz 0,48 e 0,58 por US$ 0,27/mil notas; o Qwen3.8 Max faz 0,50 por US$ 5,24 — 19× mais caro por dois pontos percentuais.
3. **Enriquecer o prompt não ajudou.** Prompt base 0,44 de top-1; + ISO 14224 0,43; ISO + exemplos reais 0,43. Custo: 1,7× e 3,2×.
4. **Nenhum LLM inventou código.** 0 códigos inválidos e 0 JSON inválido em 680 chamadas.
5. **Determinismo não é problema.** 93% a 100% de concordância em cinco repetições.

---

## 1. Método

**Amostra:** 30 notas — dez por eixo — com alocação 50% classes frequentes / 30% intermediárias / 20% cauda longa, tiradas de um histórico de 7.125 notas (6.995 após deduplicar descrições).

**Gabarito:** cada nota foi apresentada a um engenheiro de confiabilidade com três opções por eixo — o rótulo do dataset e dois distratores plausíveis, em ordem embaralhada — mais a saída “nenhuma destas”. Ele respondeu sem ver o rótulo nem as previsões dos modelos. A resposta dele é a referência.

**Prompt:** idêntico para todos os modelos — zero-shot, taxonomia completa dos três eixos (1.766 tokens), saída JSON com top-3 por eixo, temperatura 0. Congelado em `bench/prompts.py`.

**Entrada:** `Tag`, `Description` e `Impacto` — as mesmas features do XGBoost.

**Modelos:** Claude Haiku 5.5, GPT-6 Luna, DeepSeek V4.1 Flash, Qwen3.8 Flash, Qwen3.8 Max, mais **Laya** (encoder com cabeças de decisão, zero-shot).

**Baseline:** XGBoost do projeto (TF-IDF 1.500 termos + one-hot de Tag/Impacto, `n_estimators=100`). Ele viu as 30 notas no treino — é teto otimista; re-treinado sem elas, o mesmo pipeline faz 0,33.

---

## 2. Resultado

| Modelo | Top-1 | Top-3 | Macro-F1 | US$ / 1.000 notas | Latência p50 |
| --- | --- | --- | --- | --- | --- |
| **Qwen3.8 Max** | **0,50** | **0,70** | **0,38** | 5,24 | 3,7 s |
| GPT-6 Luna | 0,48 | 0,58 | 0,37 | 0,27 | 1,7 s |
| Qwen3.8 Flash | 0,46 | 0,60 | 0,36 | 0,44 | 2,9 s |
| Claude Haiku 5.5 | 0,42 | 0,64 | 0,32 | 0,44 | 1,5 s |
| DeepSeek V4.1 Flash | 0,36 | 0,66 | 0,27 | 0,43 | 2,2 s |
| XGBoost | 0,36 | 0,54 | 0,22 | **0,00** | **53 ms** |
| Laya (zero-shot) | 0,06 | 0,12 | 0,04 | 0,00 | 91 ms |

Por eixo (top-1):

| Modelo | Modo de falha | Mecanismo | Detecção |
| --- | --- | --- | --- |
| Qwen3.8 Max | 0,50 | 0,53 | **0,47** |
| GPT-6 Luna | 0,47 | 0,53 | 0,43 |
| Qwen3.8 Flash | **0,50** | 0,50 | 0,37 |
| Claude Haiku 5.5 | **0,60** | 0,43 | 0,23 |
| DeepSeek V4.1 Flash | 0,37 | 0,47 | 0,23 |
| XGBoost | 0,33 | 0,40 | 0,33 |
| Laya (zero-shot) | 0,03 | 0,00 | 0,13 |

Leitura: **modo de falha** é o eixo onde o Claude se destaca (0,60) e o XGBoost fica para trás (0,33). **Mecanismo** é o mais equilibrado — todos entre 0,40 e 0,53. **Detecção** é o eixo mais fraco para quase todos: a nota diz *o que* falhou, não *como* alguém descobriu.

---

## 3. Custo real

Custo calculado sobre os tokens medidos em cada chamada (`usage` da API) × preço de lista — 30 chamadas por modelo.

| Modelo | Tokens in | Tokens out | Custo nas 30 notas | US$ / 1.000 notas |
| --- | --- | --- | --- | --- |
| GPT-6 Luna | 64.846 | 3.147 | US$ 0,0081 | 0,27 |
| DeepSeek V4.1 Flash | 68.760 | 4.388 | US$ 0,0129 | 0,43 |
| Claude Haiku 5.5 | 104.014 | 5.687 | US$ 0,0132 | 0,44 |
| Qwen3.8 Flash | 66.637 | 6.863 | US$ 0,0132 | 0,44 |
| Qwen3.8 Max | 66.637 | 4.010 | US$ 0,1573 | 5,24 |
| XGBoost | — | — | US$ 0,00 | 0,00 |

- **O prompt domina a conta:** ~2.200 tokens de entrada contra ~150 de saída.
- **O tokenizer da Anthropic conta ~57% mais tokens** para o mesmo texto em português.
- Projeção para 30.000 notas/mês: **US$ 8 a 13** nos econômicos, **US$ 157** no premium, **US$ 0** no XGBoost.

---

## 4. Latência

| Modelo | p50 | Notas por hora |
| --- | --- | --- |
| XGBoost | 53 ms | ~68.000 |
| Laya (zero-shot) | 91 ms | ~39.000 |
| Claude Haiku 5.5 | 1,5 s | ~2.400 |
| GPT-6 Luna | 1,7 s | ~2.100 |
| DeepSeek V4.1 Flash | 2,2 s | ~1.600 |
| Qwen3.8 Flash | 2,9 s | ~1.240 |
| Qwen3.8 Max | 3,7 s | ~970 |

---

## 5. Melhoria de prompt: ISO 14224 e exemplos reais

| Variante | O que acrescenta | Tokens de entrada | Top-1 | Top-3 | Custo relativo |
| --- | --- | --- | --- | --- | --- |
| base | código + nome curto | ~2.300 | **0,44** | **0,64** | 1,0× |
| + ISO 14224 | descrição das tabelas B.2/B.4/B.6–B.12 | ~4.200 | 0,43 | 0,63 | 1,7× |
| ISO + exemplos reais | uma nota real do treino por código | ~9.100 | 0,43 | 0,64 | 3,2× |

Média dos cinco modelos de nuvem. **Mais contexto não melhorou nada** — e o padrão é irregular: com exemplos, o DeepSeek sobe (0,36 → 0,43) e o Claude cai (0,42 → 0,34); com a ISO, o Qwen3.8 Flash sobe (0,46 → 0,48) e o GPT-6 cai (0,48 → 0,42). O melhor resultado da amostra continua sendo com o prompt mínimo.

A extração da ISO foi determinística (âncora nos códigos, sem geração por modelo) e cobriu 44 dos 62 modos, 29 dos 64 mecanismos e 9 dos 10 métodos de detecção.

---

## 6. Determinismo e validade dos códigos

| Métrica | Resultado |
| --- | --- |
| Concordância top-1 em 5 repetições | 93% a 100% (DeepSeek: 100%) |
| JSON inválido | 0 em 680 chamadas |
| Código fora da taxonomia | 0 em 680 chamadas |

---

## 7. Laya

Responde em ~91 ms — mais rápido que qualquer LLM e 1,7× mais lento que o XGBoost. Zero-shot com a taxonomia inteira não encontra sinal: 0,06 de top-1 e confiança ~0,05 no eixo de 64 opções (praticamente uniforme). O motivo é de projeto: as cabeças de decisão foram feitas para 5 a 12 opções, não 62 ou 64. O fine-tune foi interrompido no epoch 2 de 3, sem convergência e sem checkpoint utilizável.

---

## 8. Limitações

- **Amostra modesta.** Dez notas por eixo dão IC95 de ±25 pontos percentuais: diferenças menores que isso não sustentam ranking.
- **Um único anotador.** 90 respostas de uma pessoa; sem dupla anotação não há Kappa.
- **Corpus template.** As notas seguem moldes e muitas enunciam a mecanismo no texto, o que favorece qualquer modelo que leia a frase.
- **XGBoost in-sample.** O modelo da tabela viu as 30 notas; 0,36 é teto otimista (fora da amostra: 0,33).

---

## 9. Próximos passos

1. **Dupla anotação** das 30 notas e Kappa — para saber quanto do 0,50 é teto real.
2. **Rodar n=100 por eixo** (IC95 ±7,8 pp) com o mesmo protocolo de validação.
3. **Re-treinar o XGBoost sem a coluna `Tag`** para medir quanto do desempenho é etiqueta decorada.
4. **Avaliar em notas de campo**, escritas por técnicos, sem molde.

---

## 10. Reprodução

```bash
pip install -r bench/requirements-bench.txt
python -m bench.build_eval_set --n 10 --modo piloto
python -m bench.run_llm --run-id pilot-zero-v2
python -m bench.run_llm --run-id pilot-iso-v1 --prompt-iso
python -m bench.run_llm --run-id pilot-exemplos-v1 --exemplos 1
python -m bench.validacao_humana --lote 1      # formulário cego
python -m bench.scoring_humano                 # pontua contra o gabarito humano
python -m bench.report
python -m bench.build_pdf
```

Relatório completo em PDF: `docs/RELATORIO_BENCHMARK.pdf` · figuras e tabelas: `bench/results/`

---

### Apêndice — prompt usado

```
SYSTEM
Voce e um engenheiro de confiabilidade especialista na taxonomia ISO 14224.
Classifique a nota de manutencao em tres eixos, escolhendo APENAS codigos das listas fornecidas.
Responda exclusivamente com JSON valido, sem markdown e sem texto fora do JSON, no formato:
{"modo":[{"codigo":"XXX","confianca":0.00}],
 "mecanismo":[{"codigo":"X.X","confianca":0.00}],
 "deteccao":[{"codigo":"X","confianca":0.00}]}
Ordene do mais provavel para o menos provavel, no maximo 3 itens por eixo.
Nao invente codigos: cada codigo precisa existir na lista do eixo correspondente.

USER
NOTA DE MANUTENCAO
Tag: {tag}
Impacto: {impacto}  (D=critica/parada, S=degradada, U=incipiente, X=outros)
Descricao: {descricao}

TAXONOMIA - MODO DE FALHA (FailMode)
{codigo} | {descricao pt/en}
... (62 codigos)

TAXONOMIA - MECANISMO (FailMech)
... (64 codigos)

TAXONOMIA - METODO DE DETECCAO (DetMethod)
... (10 codigos)
```
