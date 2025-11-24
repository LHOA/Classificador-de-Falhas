FROM python:3.10-slim

WORKDIR /app

# Copia os requisitos e instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante dos arquivos
COPY . .

# Expõe a porta que o Streamlit/API usa (Se for Streamlit é 8501, se for API é 8000 ou a variável PORT)
# Para o Railway, geralmente usamos a variável de ambiente, mas vamos deixar padrão aqui:
EXPOSE 8501

# Comando para rodar (Ajuste se for app.py ou api.py)
CMD ["streamlit", "run", "app.py", "--server.port", "8501", "--server.address", "0.0.0.0"]
