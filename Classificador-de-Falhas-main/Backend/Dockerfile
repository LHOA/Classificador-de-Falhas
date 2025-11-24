FROM python:3.10-slim

WORKDIR /app

# Instala dependências do sistema operacional necessárias para o XGBoost/Scikit (opcional, mas recomendado para evitar erros de build)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Baixa os dados do NLTK durante o build para não travar na execução
RUN python -m nltk.downloader stopwords

COPY . .

# O Railway injeta a variável PORT. O script abaixo usa ela ou 8501 como padrão.
CMD sh -c 'streamlit run app.py --server.port=${PORT:-8501} --server.address=0.0.0.0'
