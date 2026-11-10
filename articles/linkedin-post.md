Coloquei 5 modelos de LLM, um decision model e um modelo de machine learning para ver quem prediz melhor os modos de falha, os mecanismos e os métodos de detecção de acordo com a ISO 14224.

Modelos: Claude Haiku 5.5, GPT-6 Luna, DeepSeek V4.1 Flash, Qwen3.8 Flash, Qwen3.8 Max (LLMs), Laya (decision model) e XGBoost (machine learning).

30 notas reais de manutenção, 680 chamadas, 90 respostas de validação, US$ 1,38 no total.

Resultado geral (top-1 / top-3 / custo por 1.000 notas / latência):

- Qwen3.8 Max: 0,50 / 0,70 / US$ 5,24 / 3,7 s
- GPT-6 Luna: 0,48 / 0,58 / US$ 0,27 / 1,7 s
- Qwen3.8 Flash: 0,46 / 0,60 / US$ 0,44 / 2,9 s
- Claude Haiku 5.5: 0,42 / 0,64 / US$ 0,44 / 1,5 s
- DeepSeek V4.1 Flash: 0,36 / 0,66 / US$ 0,43 / 2,2 s
- XGBoost: 0,36 / 0,54 / US$ 0,00 / 53 ms
- Laya (zero-shot): 0,06 / 0,12 / US$ 0,00 / 91 ms

Quem foi melhor:

- Acurácia: Qwen3.8 Max, com 0,50 de top-1 e 0,70 de top-3.
- Custo-benefício: GPT-6 Luna. Faz 0,48 — dois pontos atrás do líder — por US$ 0,27, ou seja 19× mais barato.
- Melhor top-3 entre os baratos: DeepSeek V4.1 Flash, com 0,66. Ele erra mais na primeira sugestão, mas quase sempre coloca a resposta certa na lista de três.
- Modelos locais: o XGBoost empata com o DeepSeek em top-1 (0,36) a custo zero e em 53 ms; o Laya zero-shot não encontrou sinal (0,06).

Por eixo:

- Modo de falha: Claude Haiku 0,60 (melhor), Qwen Flash e Max 0,50, GPT-6 0,47, DeepSeek 0,37, XGBoost 0,33, Laya 0,03.
- Mecanismo: GPT-6 e Qwen Max 0,53, Qwen Flash 0,50, DeepSeek 0,47, Claude 0,43, XGBoost 0,40, Laya 0,00.
- Método de detecção: Qwen Max 0,47, GPT-6 0,43, Qwen Flash 0,37, XGBoost 0,33, Claude e DeepSeek 0,23, Laya 0,13.

Custo em volume: para 30 mil notas por mês, os modelos econômicos ficam entre US$ 8 e US$ 13; o premium, US$ 157; os locais, US$ 0. O XGBoost responde em 53 ms, contra 1,5 a 3,7 segundos dos LLMs — de 28 a 70 vezes mais rápido.

O que testei e não ajudou:

- Enriquecer o prompt com as descrições da ISO 14224, ou com uma nota real de exemplo por código: o top-1 ficou em 0,43 contra 0,44 do prompt mínimo, com 1,7× e 3,2× o custo.
- Ajuste de hiperparâmetros do XGBoost em 10 configurações: a melhor ganhou 1,6 ponto na validação interna e perdeu 7 pontos no teste cego.

Confiabilidade: zero código fora da taxonomia e zero JSON inválido em 680 chamadas; concordância de 93% a 100% em cinco repetições da mesma nota.

Gráfico em anexo.

Resultados detalhados, método e código: github.com/LHOA/Classificador-de-Falhas

#Confiabilidade #Manutenção #ISO14224 #MachineLearning #LLMs #GestãoDeAtivos
