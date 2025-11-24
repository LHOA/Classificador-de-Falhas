FROM python:3.10-slim

WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements primeiro
COPY requirements.txt .

# Instala bibliotecas
RUN pip install --no-cache-dir -r requirements.txt

# Baixa stopwords do NLTK (necessário após instalar nltk)
RUN python -m nltk.downloader stopwords

# Copia o código da API e o modelo
COPY . .

# Comando para rodar a API (Uvicorn)
# O host 0.0.0.0 permite acesso externo
# A variável PORT é injetada pelo Railway
CMD sh -c 'uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}'
