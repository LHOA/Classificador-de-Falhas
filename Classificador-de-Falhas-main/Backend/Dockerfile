FROM python:3.10-slim

WORKDIR /app

# CORREÇÃO AQUI: Removemos o 'software-properties-common' que estava dando erro.
# Mantivemos 'build-essential' (para compilar bibliotecas se precisar) e 'curl'.
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Baixa os dados do NLTK (Stopwords)
RUN python -m nltk.downloader stopwords

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Comando de inicialização usando a porta do Railway ($PORT)
CMD sh -c 'streamlit run app.py --server.port=${PORT:-8501} --server.address=0.0.0.0'
