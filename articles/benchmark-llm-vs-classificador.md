# O modelo mais caro ganhou — por dois pontos e 19× o preço

*Benchmark aberto do Failure Map: sete modelos, 30 notas de manutenção, gabarito validado por especialista. 680 chamadas, US$ 1,38.*

---

O Failure Map transforma nota de manutenção em código ISO 14224: modo de falha, mecanismo e método de detecção. É um XGBoost pequeno, roda local, custa zero por classificação.

No README eu escrevo que LLM de propósito geral custa por token, demora e pode inventar código. Escrever isso é fácil. Medir é outra história.

Separei 30 notas do histórico — dez por eixo, da classe mais frequente à cauda longa — e mandei o mesmo prompt para cinco LLMs (Claude Haiku 5.5, GPT-6 Luna, DeepSeek V4.1 Flash, Qwen3.8 Flash, Qwen3.8 Max) e para o Laya, um encoder com cabeças de decisão que roda local.

O detalhe que muda tudo: **o gabarito não é o rótulo do dataset**. Cada nota foi submetida a um engenheiro de confiabilidade — três opções por eixo, embaralhadas, mais a saída "nenhuma destas" — sem ele ver o rótulo nem as previsões dos modelos. A resposta dele é a referência.

## O placar

| Modelo | Top-1 | Top-3 | US$ / 1.000 notas | Latência |
|---|---|---|---|---|
| **Qwen3.8 Max** | **0,50** | **0,70** | 5,24 | 3,7 s |
| GPT-6 Luna | 0,48 | 0,58 | 0,27 | 1,7 s |
| Qwen3.8 Flash | 0,46 | 0,60 | 0,44 | 2,9 s |
| Claude Haiku 5.5 | 0,42 | 0,64 | 0,44 | 1,5 s |
| DeepSeek V4.1 Flash | 0,36 | 0,66 | 0,43 | 2,2 s |
| **XGBoost** | 0,36 | 0,54 | **0,00** | **53 ms** |
| Laya (zero-shot) | 0,06 | 0,12 | 0,00 | 91 ms |

**O LLM de prateleira ganha do classificador.** Não é pouco: são 14 pontos percentuais no top-1, e a diferença aparece nos três eixos.

**E o mais caro ganha por dois pontos.** O Qwen3.8 Max custa US$ 5,24 por mil notas; o GPT-6 Luna faz 0,48 por US$ 0,27 — 19 vezes menos para ficar 2 pontos atrás. Se a decisão for custo por acerto, o Luna é o escolhido; se for acurácia máxima, o Max.

**O XGBoost não perdeu por arquitetura.** Perdeu porque aprendeu o molde do corpus: as notas seguem o formato "X apresentou *sintoma*. A análise indica *causa*, resultando em *consequência*", e o TF-IDF decora essa estrutura. Quando a nota foge do molde, ele não generaliza.

## Onde cada um vai bem

Separando por eixo, o padrão fica claro. No **modo de falha**, o Claude Haiku dispara (0,60) e o XGBoost fica em 0,33. No **mecanismo**, os cinco LLMs e o XGBoost cabem entre 0,40 e 0,53 — é o que o texto enuncia com clareza. Na **detecção**, quase todos caem: a nota diz *o que* falhou, não *como* alguém descobriu. É o eixo mais fraco do benchmark inteiro — inclusive para o especialista, que reconheceu o rótulo de detecção em só 37% dos casos.

## Três coisas que o teste me obrigou a corrigir

**1. "Pode inventar código que não existe."** Em 680 chamadas, com a taxonomia completa no prompt: zero códigos inválidos, zero JSON inválido. Nem nos modelos mais baratos. Quando a lista fechada está no contexto, os modelos a respeitam.

**2. "Varia entre execuções."** Cinco repetições da mesma nota, temperatura zero: concordância entre 93% e 100%. O DeepSeek deu 100%. A variação existe, mas é muito menor do que eu dava a entender.

**3. "Enriquecer o prompt resolve."** Não resolve. Dar a descrição ISO 14224 de cada código ou uma nota real de exemplo por código **não melhorou** o top-1 de forma consistente: só o DeepSeek subiu com os exemplos (0,36 → 0,43) e o Claude caiu (0,42 → 0,34). O custo, esse subiu sempre — 1,7× com a ISO e 3,2× com os exemplos.

## O que fica

Um benchmark que só confirma o que o autor já acreditava não vale nada. Este me obrigou a corrigir três afirmações do meu próprio README — e a reconhecer que o gabarito original do dataset não servia como verdade: ele concordou com o especialista em menos da metade das respostas.

O próximo passo não é trocar de modelo. É **anotar em dobro** as mesmas notas e medir o Kappa. Sem isso, 0,50 pode ser teto do gabarito, não do modelo.

---

*Repositório: github.com/LHOA/Classificador-de-Falhas · Relatório com método, prompt, figuras e tabelas: `docs/BENCHMARK.md`, `docs/RESULTADOS.md` e `docs/RELATORIO_BENCHMARK.pdf`*
