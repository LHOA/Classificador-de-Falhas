# Atalhos de desenvolvimento do Failure Map.
# O codigo da aplicacao esta em Classificador-de-Falhas-main/.
# Uso: make setup && make api   (em um terminal)
#      make web                (em outro terminal)

BACKEND := Classificador-de-Falhas-main/Backend
FRONTEND := Classificador-de-Falhas-main/Frontend

.PHONY: help setup setup-backend setup-frontend api web build clean

help:
	@echo "make setup   - cria venv, instala dependencias (back e front) e baixa stopwords"
	@echo "make api     - sobe a API em http://localhost:8000"
	@echo "make web     - sobe o frontend em http://localhost:5173"
	@echo "make build   - gera o build de producao do frontend"
	@echo "make clean   - remove venv, node_modules, dist e bancos locais"

setup: setup-backend setup-frontend

setup-backend:
	cd $(BACKEND) && python3 -m venv venv \
	  && ./venv/bin/pip install -q --upgrade pip \
	  && ./venv/bin/pip install -q -r requirements.txt \
	  && ./venv/bin/python -m nltk.downloader stopwords
	@echo "Backend pronto. Rode 'make api'."

setup-frontend:
	cd $(FRONTEND) && npm install
	@echo "Frontend pronto. Rode 'make web'."

api:
	cd $(BACKEND) && ./venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000 --reload

web:
	cd $(FRONTEND) && npm run dev

build:
	cd $(FRONTEND) && npm run build

clean:
	rm -rf $(BACKEND)/venv $(FRONTEND)/node_modules $(FRONTEND)/dist
	rm -f $(BACKEND)/failuremap.db $(BACKEND)/test.db
	@echo "Limpo."
