# bench — Benchmark LLM × Failure Map

Compara o classificador local (TF-IDF + XGBoost) com LLMs de prateleira nos três
eixos da ISO 14224: modo de falha, mecanismo e método de detecção.

Resultado do piloto: [`docs/BENCHMARK.md`](../docs/BENCHMARK.md).

## Por que existe um venv separado

O `.pkl` do deploy foi gerado com **scikit-learn 1.6.1**. Em versões novas ele não
abre (`AttributeError: _RemainderColsList`). Use o venv pinado:

```bash
python -m venv .venv
python -m pip install -r bench/requirements-bench.txt
```

## Ordem de execução

```bash
# 1. conjunto de avaliação + treino sem as notas de teste
python -m bench.build_eval_set --n 5 --modo piloto      # piloto
python -m bench.build_eval_set --n 100 --modo principal # publicação

# 2. re-treino do baseline SEM as notas de avaliação
python -m bench.retrain_heldout --n-estimators 100      # valor vem de GET /model-info

# 3. API local servindo o modelo held-out
MODEL_PATH=bench/artifacts/modelo_heldout.pkl \
  python -m uvicorn api:app --port 8001 \
  --app-dir Classificador-de-Falhas-main/Backend

# 4. avaliação
python -m bench.run_local --run-id local-heldout
python -m bench.run_llm   --run-id pilot-zero --variante zero
python -m bench.run_llm   --run-id pilot-few  --variante few
python -m bench.run_llm   --run-id det        --repetir 5 --limite-notas 5

# 5. pontuação e relatório
python -m bench.score --runs local-heldout,pilot-zero,pilot-few --det-runs det
python -m bench.report
```

## Armadilhas já pagas (não repita)

- **`dtype=str` obrigatório** ao ler `data.csv` e os CSVs intermediários. Sem isso o
  pandas converte `FailMech` em float: `1.10` vira `1.1` (outro código) e `11` vira `11.0`.
- **O endpoint exige o header `x-opencode-session`** (sem ele: HTTP 400
  `MissingSessionID`) e bloqueia `urllib` com 403 do Cloudflare — use `requests` com
  User-Agent de navegador.
- **`POST /classificar` não aceita parâmetro de modelo**: para avaliar outro `.pkl`
  é preciso subir a API com `MODEL_PATH` apontando para ele.
- **`thinking: {type: disabled}` não é aceito para Claude** via endpoint compatível com
  OpenAI (HTTP 400 `cannot be represented by anthropic-messages`). Use
  `reasoning_effort: none`.

## Saídas

| Arquivo | Conteúdo |
| --- | --- |
| `results/eval_set.csv` | notas de avaliação, com marcação de eixo |
| `results/train_set.csv` | treino (sem as notas de avaliação) |
| `results/raw/*.jsonl` | uma linha por chamada: predição, tokens, latência, custo, resposta crua |
| `results/scoring.csv` | métricas por modelo × eixo |
| `results/determinismo.csv` | concordância entre repetições |
| `results/figures/*.png` | acurácia por eixo, custo × acurácia |

`artifacts/` e `results/raw/` não vão para o git (modelo grande e respostas cruas).
