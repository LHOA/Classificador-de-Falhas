# Política de Segurança

## Versões suportadas

| Versão | Suporte |
| --- | --- |
| 1.x (branch `main`) | sim |

## Como reportar uma vulnerabilidade

Não abra issue pública para falhas de segurança. Escreva para
**[luishenrique240@gmail.com](mailto:luishenrique240@gmail.com)** com o assunto
`[SECURITY] Failure Map` ou mande mensagem no
[LinkedIn](https://www.linkedin.com/in/luishenriqueifma/).

Inclua, se possível: versão/commit, passos para reproduzir, impacto e sugestão
de correção. Retorno em até **5 dias úteis**, com prioridade para falhas críticas.

## Modelo de ameaça

O projeto é uma **ferramenta local/demonstração**, feita para rodar na máquina do
usuário ou atrás de um proxy. Ele **não** implementa autenticação, autorização,
multiusuário nem TLS. Isso é decisão de projeto (open source, uso pessoal e
demonstrações), não esquecimento.

Consequências que você precisa assumir:

- **Quem alcança a porta da API pode classificar e gravar registros.** Não há
  login. Em rede aberta, qualquer um pode usar.
- **O histórico é único.** Não há separação por usuário: `/history` devolve os
  últimos registros salvos, de qualquer origem.
- **HTTP puro por padrão.** Sem TLS, o conteúdo das notas trafega legível. Use
  HTTPS no proxy reverso se sair do `localhost`.

## Controles implementados

| Controle | Onde | Observação |
| --- | --- | --- |
| Validação de entrada | `api.py` (Pydantic) | `descricao` 1–4.000 caracteres, `tag` ≤120, `impacto` restrito a `D/S/U/X` |
| Limite de requisições | `api.py` (middleware) | 60 req/min por IP em `/classificar`, `/save-record`, `/save-batch-records`; ajuste com `RATE_LIMIT_PER_MIN` (0 desativa) |
| Limite de consulta | `GET /history` | `limit` preso entre 1 e 500 |
| SQL parametrizado | SQLModel/SQLAlchemy | Sem concatenação de SQL |
| CORS configurável | `ALLOWED_ORIGINS` | Padrão `*` (API pública); restrinja ao seu domínio em produção |
| Sem execução de conteúdo do usuário | front e back | Nenhum `eval`, `exec` ou `pickle` de dado externo (o `.pkl` é artefato do próprio projeto) |
| Sem upload no servidor | frontend | O CSV em lote é lido no navegador; o servidor recebe apenas JSON |
| Dependências | `npm audit`, `pip check` | Sem vulnerabilidades conhecidas na data da varredura |
| Container sem root | `Backend/Dockerfile` | Usuário `appuser` (uid 10001) |

## Checklist para quem for hospedar

1. **Não exponha a API direto.** Suba o uvicorn em `127.0.0.1` e deixe o Nginx na frente:
   `uvicorn api:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips=127.0.0.1`.
2. **TLS obrigatório** se houver qualquer acesso externo (`certbot` ou Cloudflare).
3. **Restrinja o CORS**: `ALLOWED_ORIGINS=https://seu-dominio`.
4. **Feche o `/docs`** se não quiser a API descoberta:
   `app = FastAPI(docs_url=None, redoc_url=None)` ou bloqueio no proxy.
5. **Rate limit no proxy** também (`limit_req_zone`), como segunda camada.
6. **Basic auth** no Nginx se a instância for privada (`auth_basic`).
7. **Firewall**: só 80/443 abertos. Nada de banco, 8000 ou portas de dev expostas.
8. **Backup** do `failuremap.db` (ou do Postgres) — e trate o arquivo como dado sensível.
9. **Atualize dependências** (`pip list --outdated`, `npm outdated`) antes de cada deploy.

## Privacidade e LGPD

Notas de manutenção frequentemente contêm nomes de pessoas, turnos, fornecedores
e detalhes de operação. Se você rodar uma instância **pública**, qualquer pessoa
pode enviar texto — e esse texto fica no seu banco. Recomendações:

- Não use dados de cliente em instância pública; anonimize antes.
- Se for coletar notas reais, informe a finalidade e o prazo de retenção.
- Apague o histórico periodicamente (`DELETE FROM failurelog WHERE created_at < ...`).
- O modelo (`.pkl`) não contém PII verificável, mas contém vocabulário extraído da
  base de treino — trate-o como material interno, não como dado público.

## Varredura feita neste repositório

Data: 2026-10-29. Escopo: árvore de trabalho, histórico Git completo, bundle
publicado, dependências e configuração do servidor de demonstração.

| Verificação | Resultado |
| --- | --- |
| Segredos na árvore de trabalho (chaves, tokens, `.env`, chaves privadas, URLs com credencial) | Nenhum achado. Só os `.env.example` com placeholders |
| Segredos nos 227 blobs / 248 commits do histórico | Nenhum achado |
| Arquivos sensíveis já versionados (`.env`, `.pem`, `.key`, `.db`) | Nenhum |
| Chaves no bundle publicado (`dist/*.js`) | Nenhuma |
| Source maps publicados | Não existem |
| PII no modelo (e-mail, CPF, CNPJ) | Nenhuma ocorrência real |
| E-mail do autor nos commits | `38542915+LHOA@users.noreply.github.com` (noreply) |
| Dependências JS (`npm audit --omit=dev`) | 0 vulnerabilidades |
| Dependências Python (`pip check`) | Sem conflitos |
| Validação de entrada | Rejeita `impacto` inválido (422) e texto >4.000 caracteres (422) |
| Rate limit | 429 após 60 requisições/minuto por IP |
| Bind do backend na demo | `127.0.0.1:8003` (só via Nginx) |

Limites desta varredura: foi um scan por padrões (não usamos `gitleaks`/`trufflehog`,
que não estão instalados), sem teste dinâmico de aplicação (DAST) e sem checagem
de CVE em dependências Python além do `pip check`. Se quiser, o próximo passo é
rodar `pip-audit` e `npm audit --production` num CI.

## Fora de escopo

- Ataques de negação de serviço volumétricos (rate limit em memória não segura
  contra DDoS distribuído; use Cloudflare/proxy).
- Comprometimento da máquina hospedeira.
- Uso indevido por quem tem acesso físico/SSH ao servidor.
