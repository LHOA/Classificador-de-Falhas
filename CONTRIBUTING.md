# Contribuindo

Obrigado pelo interesse. Este projeto é pequeno de propósito: prefiro mudanças
pequenas e verificáveis a grandes reescritas.

## Antes de abrir um PR

1. Rode o que já existe:
   ```bash
   cd Classificador-de-Falhas-main/Frontend && npm run typecheck && npm run build
   cd ../Backend && python -c "import ast; ast.parse(open('api.py').read())"
   ```
2. Teste a API de verdade, não só o happy path do código:
   ```bash
   curl localhost:8000/health
   curl -X POST localhost:8000/classificar -H 'Content-Type: application/json' \
     -d '{"descricao":"vibração excessiva no mancal","impacto":"S"}'
   ```
3. Se a mudança afeta classificação, mostre **antes/depois** com 5–10 notas reais ou anonimizadas.

## O que tem mais valor aqui

- **Correções de taxonomia ISO 14224** com a referência da cláusula/tabela.
- **Bases de falhas anonimizadas** para avaliação e retreino.
- **Normalização de texto** (acentos, abreviações, gírias de campo) com medição de impacto.
- **Testes** — contribuições com suíte automatizada são especialmente valiosas; hoje a verificação é `npm run typecheck`, `npm run build` e os curls de smoke test.
- **Integrações** com CMMS (SAP PM, Maximo) para tirar o CSV do meio do caminho.

## O que evitar

- Trocar o modelo ou os hiperparâmetros sem mostrar a métrica antes/depois.
- Adicionar dependência pesada para resolver problema pequeno.
- Reformatação massiva de arquivos (dificulta a revisão).
- Subir dados de cliente, prints de tela com nomes de empresa ou qualquer coisa que identifique ativo real.

## Estilo

- Python: PEP 8, nomes em português quando o domínio é em português (`description` da API fica em inglês por compatibilidade).
- TypeScript/React: componentes funcionais, sem `any` novo.
- Commits: `tipo(escopo): resumo no imperativo` (`fix(api): corrige descrição do código UNS`).

## Reportando problema de classificação

Inclua:

```
descrição usada:
impacto selecionado:
top-1 do modelo (modo / mecanismo / detecção):
esperado (com o código ISO):
fonte da expectativa (experiência de campo, Tabela B.2, etc.):
```

Isso transforma "errou" em um caso de teste.
