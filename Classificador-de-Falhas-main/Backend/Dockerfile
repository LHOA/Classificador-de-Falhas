FROM python:3.10-slim

WORKDIR /app

# 1. Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2. Copia o requirements PRIMEIRO
COPY requirements.txt .

# 3. Instala as bibliotecas (incluindo o NLTK)
RUN pip install --no-cache-dir -r requirements.txt

# 4. AGORA baixa os dados do NLTK (pois a biblioteca já foi instalada no passo anterior)
RUN python -m nltk.downloader stopwords

# 5. Copia o restante do código
COPY . .

# 6. Comando final
CMD sh -c 'streamlit run app.py --server.port=${PORT:-8501} --server.address=0.0.0.0'
