# Failure Map — Classificador de Falhas ISO 14224

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/react-19-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Sem LLM](https://img.shields.io/badge/classifica%C3%A7%C3%A3o-local%20%C2%B7%20sem%20LLM-4f46e5.svg)](#por-que-não-um-llm)

Transforme notas de manutenção em texto livre em **dado padronizado**: modo de falha, mecanismo e método de detecção, com taxonomia baseada na **ISO 14224**.

Modelo local, determinístico e sem custo por inferência — uma alternativa ao uso de LLMs para classificação de falhas. Sem login, sem cota, sem chave de API.

![Tela do classificador](docs/screenshot.png)

---

## Sumário

- [Comece em dois minutos](#comece-em-dois-minutos)
- [O problema](#o-problema)
- [A solução](#a-solução)
- [Por que não um LLM?](#por-que-não-um-llm)
- [Funcionalidades](#funcionalidades)
- [Como funciona](#como-funciona)
- [Uso](#uso)
- [API REST](#api-rest)
- [Instalação detalhada](#instalação-detalhada)
- [Configuração](#configuração)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Deploy](#deploy)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)
- [Segurança](#segurança)
- [Licença](#licença)
- [Autor](#autor)

---

## Comece em dois minutos

```bash
git clone https://github.com/LHOA/Classificador-de-Falhas.git
cd Classificador-de-Falhas

make setup   # backend (venv + dependências + stopwords) e frontend (npm install)
make api     # API em http://localhost:8000  (deixe este terminal aberto)
make web     # frontend em http://localhost:5173  (em outro terminal)
```

Pronto: abra `http://localhost:5173`, cole uma nota de campo e veja a classificação em três eixos. O banco SQLite é criado automaticamente na primeira execução.

Sem `make`? O [passo a passo completo](#instalação-detalhada) faz exatamente o mesmo.

## O problema

Históricos de manutenção são ricos em informação e pobres em estrutura. A causa, o sintoma e a circunstância da falha vivem no texto livre da nota de manutenção ou da ordem de serviço — com gírias regionais, abreviações e erros de digitação. O resultado é conhecido: não dá para agregar, comparar entre ativos nem alimentar indicadores de confiabilidade (MTBF, disponibilidade) com confiança.

## A solução

O Failure Map ataca a primeira milha do dado. A partir de uma descrição livre, devolve os **três códigos mais prováveis** em cada eixo da taxonomia ISO 14224, com a probabilidade de cada sugestão.

A revisão humana continua no centro: o resultado vem como top-3, a interface permite trocar a sugestão antes de salvar e o registro guarda se houve curadoria (`Human`) ou se a sugestão da IA foi aceita (`IA`). É aceleração do trabalho do engenheiro, não substituição.

## Por que não um LLM?

Classificar uma nota com um LLM de propósito geral funciona bem na demonstração e mal na conta: cada chamada custa token, depende de rede, devolve resposta diferente a cada execução e pode inventar um código que não existe na taxonomia. Em uma base com dezenas de milhares de notas isso vira custo recorrente e perda de auditabilidade — e, em confiabilidade, "por que esse código?" precisa de resposta reproduzível.

O Failure Map faz o caminho oposto: um modelo supervisionado pequeno, treinado na taxonomia do domínio, que roda na sua máquina e devolve sempre códigos existentes.

| Critério | Failure Map (TF-IDF + XGBoost) | LLM de propósito geral |
| --- | --- | --- |
| Custo por classificação | zero (só CPU) | por token, recorrente |
| Latência | ~6–10 ms por registro | centenas de ms a segundos, mais rede |
| Determinismo | mesma entrada, mesma saída | varia entre execuções e versões |
| Saída | sempre um código da taxonomia, com probabilidade | pode inventar código ou descrição |
| Offline / privacidade | sim; nada sai da máquina | depende de API e do provedor |
| Auditabilidade | pesos versionados e reprodutíveis | caixa-preta que muda a cada atualização |
| Explicação | top-3 com probabilidade | texto livre, sem probabilidade calibrada |

O LLM é a ferramenta certa quando ainda não existe histórico rotulado, quando o vocabulário muda o tempo todo ou quando o requisito é multilíngue. O modelo supervisionado é a ferramenta certa quando há histórico classificado — o caso de quem faz gestão de ativos — e quando custo, latência e reprodutibilidade pesam. As duas abordagens combinam bem: usar o LLM para gerar rótulos iniciais e treinar um modelo local para produção é um caminho comum e econômico.

## Funcionalidades

- **Classificação individual** — descrição livre → top-3 de modo, mecanismo e método de detecção, com confiança por código.
- **Revisão humana** — cada eixo é um seletor com as três alternativas da IA; o registro salvo indica `IA` ou `Human`.
- **Processamento em lote** — upload de CSV, classificação linha a linha, prévia e exportação do resultado.
- **Dicionário de códigos** — consulta das três taxonomias, com busca e descrição PT/EN.
- **Painel de acompanhamento** — total de registros, distribuição por impacto, top 5 modos e mecanismos, histórico e exportação CSV.
- **API REST** — FastAPI com documentação automática em `/docs`, pronta para integrar com CMMS.
- **Bilíngue** — interface em português e inglês.
- **Local-first** — SQLite criado automaticamente; nenhum dado sai da máquina.

## Como funciona

```
   Nota de campo (texto livre)
             │
             ▼
   ┌───────────────────┐        HTTP/JSON       ┌──────────────────────────┐
   │  Frontend React   │ ────────────────────▶ │  API FastAPI             │
   │  Vite + TS        │ ◀──────────────────── │                          │
   │  Recharts/i18n    │      top-3 + probs    └────────────┬─────────────┘
   └───────────────────┘                                   │
             │                                             ▼
             │                              ┌──────────────────────────────┐
             │                              │ limpar_texto()               │
             │                              │ normalização + stopwords     │
             │                              └──────────────┬───────────────┘
             │                                             ▼
             │                              ┌──────────────────────────────┐
             │                              │ TF-IDF (1.500 termos)        │
             │                              │ + one-hot (Tag, Impacto)     │
             │                              └──────────────┬───────────────┘
             │                                             ▼
             │                              ┌──────────────────────────────┐
             │                              │ XGBoost ×3                   │
             │                              │ modo · mecanismo · detecção  │
             │                              └──────────────┬───────────────┘
             │                                             ▼
             │                              ┌──────────────────────────────┐
             └──────── histórico ◀────────── │ SQLite (registros salvos)    │
                                            └──────────────────────────────┘
```

**Pipeline**

1. **Normalização** — minúsculas, remoção de dígitos, pontuação e stopwords do português.
2. **Vetorização** — TF-IDF com 1.500 termos, combinado com one-hot das colunas categóricas.
3. **Classificação** — um `XGBClassifier` por eixo (100 árvores, `random_state=42`), com `predict_proba` para o top-3.
4. **Enriquecimento** — código → descrição bilíngue, via dicionários ISO no backend e no frontend.

| Eixo | Classes |
| --- | --- |
| Modo de falha (`FailMode`) | 61 |
| Mecanismo de falha (`FailMech`) | 60 |
| Método de detecção (`DetMethod`) | 10 |

O modelo acompanha o repositório e funciona offline. A configuração exata do artefato publicado é consultável em `GET /model-info` (classes, número de features, hiperparâmetros), e o pipeline é reprodutível: para incorporar vocabulário novo da sua operação, basta retreinar com as suas notas rotuladas.

**Stack**

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 6, Recharts, TanStack Query, Tailwind |
| Backend | FastAPI, Pydantic v2, SQLModel |
| ML | scikit-learn 1.6, XGBoost 3.1, pandas, NLTK |
| Persistência | SQLite por padrão (qualquer `DATABASE_URL` SQLAlchemy funciona) |

## Uso

### Interface

1. **Classificador IA** — preencha a descrição (e, se quiser, a tag e o impacto) e clique em *Classificar com IA*. Ajuste o top-3 se discordar e salve.
2. **Processar em Lote** — envie um CSV com as colunas `tag,descricao,impacto` (cabeçalho obrigatório, separador `,` ou `;`), acompanhe o progresso e baixe o resultado.
3. **Dicionário de Códigos** — consulte códigos e descrições das três taxonomias.
4. **Visão Geral** — painel com o histórico salvo, gráficos e exportação CSV.

Exemplo de CSV para lote:

```csv
tag,descricao,impacto
P-101A,"vibração excessiva no mancal, ruído anormal",S
V-204,"vazamento de óleo pelo selo mecânico",D
M-310,"motor superaquecendo após partida",U
```

Impacto: `D` crítica (Dead), `S` degradada (Serious), `U` incipiente (Unwell), `X` outros.

### Chamada direta da API

```bash
curl -X POST http://localhost:8000/classificar \
  -H "Content-Type: application/json" \
  -d '{
        "tag": "P-101A",
        "descricao": "vibração excessiva no mancal do lado acoplado, com ruído anormal",
        "impacto": "S"
      }'
```

## API REST

Documentação interativa em `http://localhost:8000/docs`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/` | Identificação do serviço |
| `GET` | `/health` | Status e se o modelo carregou |
| `GET` | `/model-info` | Classes, features e hiperparâmetros do artefato |
| `POST` | `/classificar` | Top-3 por eixo a partir do texto livre |
| `POST` | `/save-record` | Salva uma classificação revisada |
| `POST` | `/save-batch-records` | Salva um lote |
| `GET` | `/history?limit=50` | Últimos registros salvos (1–500) |

Resposta de `/classificar`:

```json
{
  "modo": [
    {"codigo": "VIB", "descricao": "Vibration (Vibração)", "confianca": 0.929},
    {"codigo": "STD", "descricao": "Structural Deficiency", "confianca": 0.021},
    {"codigo": "PDE", "descricao": "Parameter deviation", "confianca": 0.004}
  ],
  "mecanismo": [
    {"codigo": "2.4", "descricao": "Wear (Desgaste)", "confianca": 0.415}
  ],
  "deteccao": [
    {"codigo": "5", "descricao": "Continuous condition monitoring", "confianca": 0.824}
  ],
  "texto_processado": "bba vibrando mto ruido pedregulho"
}
```

> Os campos `modo`, `mecanismo` e `deteccao` trazem sempre três itens; o exemplo está abreviado.

## Instalação detalhada

### Pré-requisitos

- Python 3.10+
- Node.js 18+ (testado com Node 26)
- ~250 MB de disco

O código da aplicação fica em `Classificador-de-Falhas-main/`. Os caminhos abaixo já consideram isso.

### Backend

```bash
cd Classificador-de-Falhas-main/Backend

python3 -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m nltk.downloader stopwords

uvicorn api:app --reload --port 8000
```

Verificação:

```bash
curl http://localhost:8000/health
# {"status":"ok","model_loaded":true}
```

### Frontend

```bash
cd Classificador-de-Falhas-main/Frontend
npm install

echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev      # http://localhost:5173
```

Build de produção:

```bash
npm run build    # gera dist/
npm run preview
```

### Docker (backend)

```bash
cd Classificador-de-Falhas-main/Backend
docker build -t failure-map-api .
docker run --rm -p 8000:8000 -v "$PWD/data:/app/data" failure-map-api
```

## Configuração

| Variável | Onde | Padrão | Descrição |
| --- | --- | --- | --- |
| `VITE_API_URL` | Frontend | `http://localhost:8000` | URL base da API |
| `VITE_PROXY_TARGET` | Frontend | `http://127.0.0.1:8000` | Destino do proxy `/api` no dev server |
| `DATABASE_URL` | Backend | `sqlite:///./failuremap.db` | Qualquer URL SQLAlchemy |
| `ALLOWED_ORIGINS` | Backend | `*` | Origens CORS, separadas por vírgula |
| `RATE_LIMIT_PER_MIN` | Backend | `60` | Requisições/minuto por IP nas rotas de inferência e escrita (`0` desativa) |

## Estrutura do repositório

```
Classificador-de-Falhas/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
├── Makefile
├── Classificador-de-Falhas-main/
│   ├── Backend/
│   │   ├── api.py                          # endpoints, taxonomia e normalização
│   │   ├── modelo_classificacao_falhas.pkl # modelo treinado (16 MB)
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── Frontend/
│       ├── App.tsx, index.tsx, types.ts, constants.ts
│       ├── components/                     # Classifier, BatchProcessor, Dashboard, Dictionary...
│       ├── services/aiService.ts           # cliente HTTP da API
│       ├── contexts/LanguageContext.tsx    # i18n PT/EN
│       └── vite.config.ts
└── docs/
    └── screenshot.png
```

## Deploy

Exemplo de Nginx servindo o build e encaminhando a API no mesmo domínio (sem CORS):

```nginx
server {
    listen 80;
    server_name failuremap.exemplo.com;
    root /var/www/failuremap;
    index index.html;

    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Build correspondente:

```bash
VITE_API_URL=/api npm run build
rsync -a --delete dist/ /var/www/failuremap/
```

O backend roda como serviço (`uvicorn api:app --host 127.0.0.1 --port 8000`), com `DATABASE_URL` apontando para onde você quer persistir.

## Roadmap

- [ ] Docker Compose com API + front em um comando.
- [ ] Testes automatizados (pytest no backend, vitest no frontend).
- [ ] Retreino assistido a partir do histórico revisado na própria interface.
- [ ] Suporte a inglês no texto de entrada.
- [ ] Exportação direta para CMMS (SAP PM, Maximo).
- [ ] Migrar o Tailwind do CDN para build local.

## Contribuindo

Contribuições são bem-vindas — código, crítica metodológica, bases de falhas anonimizadas e correções de taxonomia. Leia o [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir um PR.

Para reportar problema de classificação, envie: descrição usada, impacto selecionado, o que o modelo respondeu e o que você esperava (com o código ISO).

## Segurança

A aplicação é feita para rodar na sua máquina ou atrás de um proxy. O que já está implementado: validação de entrada com limites de tamanho, limite de 60 requisições/minuto por IP nas rotas de inferência e escrita, CORS configurável, SQL parametrizado, container sem root e bind em `127.0.0.1` recomendado.

O modelo de ameaça, o checklist de hospedagem, a política de privacidade e o resultado da varredura de segredos estão em [SECURITY.md](SECURITY.md).

Para reportar vulnerabilidade: [luishenrique240@gmail.com](mailto:luishenrique240@gmail.com), assunto `[SECURITY] Failure Map`.

## Licença

[MIT](LICENSE) © 2026 Luis Henrique Oliveira.

## Autor

**Luis Henrique Oliveira** — Engenheiro de Manutenção e Confiabilidade.

Trabalho com gestão de ativos, análise de falhas e confiabilidade em operação industrial. Este projeto nasceu da frustração de ver análises de causa raiz travarem na qualidade do registro, não na competência da equipe.

- LinkedIn: [linkedin.com/in/luishenriqueifma](https://www.linkedin.com/in/luishenriqueifma/)
- E-mail: [luishenrique240@gmail.com](mailto:luishenrique240@gmail.com)

Feedback, crítica técnica e contribuição com bases de falhas são bem-vindos.

---

Feito para a comunidade de manutenção e confiabilidade. Se este projeto te ajudar, conte como foi.
