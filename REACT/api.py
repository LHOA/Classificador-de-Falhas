from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import joblib
import re
import nltk
from nltk.corpus import stopwords
import xgboost

# --- 1. Configuração Inicial ---
app = FastAPI(
    title="API de Classificação de Falhas",
    description="Recebe dados de falha e retorna a classificação sugerida (Modo, Detecção, Mecanismo)."
)

# --- 2. Carregar Modelo e Dependências ---
# (Executado apenas uma vez quando a API liga)
try:
    artefatos = joblib.load('modelo_classificacao_falhas.pkl')
    modelos = artefatos['modelos']
    encoders = artefatos['encoders']
    print("Modelo carregado com sucesso!")
except Exception as e:
    print(f"ERRO ao carregar modelo: {e}")

# Configurar NLTK
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')
stop_words = set(stopwords.words('portuguese'))

# --- 3. Funções Auxiliares e Dicionários ---
def limpar_texto(texto):
    if not isinstance(texto, str):
        return ""
    texto = texto.lower()
    texto = re.sub(r'\d+', '', texto)
    texto = re.sub(r'[^\w\s]', '', texto)
    texto = ' '.join([palavra for palavra in texto.split() if palavra not in stop_words])
    return texto

# Copie aqui os seus dicionários (Resumidos aqui para economizar espaço, mas use os completos)
map_mode = {'OTH': 'Other (Outros)', 'PLU': 'Plugged (Entupido)', '...': '...'} 
map_det = {'1': 'Maintenance', '...': '...'}
map_mech = {'1.1': 'Leakage', '...': '...'}
# DICA: No código real, cole os dicionários completos que usamos no Streamlit!

# --- 4. Definição do Formato de Entrada (Schema) ---
class DadosFalha(BaseModel):
    tag: str
    impacto: str  # Ex: S, D, U
    descricao: str

# --- 5. O Endpoint (A rota da API) ---
@app.post("/classificar")
def classificar_falha(dados: DadosFalha):
    try:
        # 1. Criar DataFrame com os dados recebidos
        df_input = pd.DataFrame({
            'Tag': [dados.tag],
            'FailureImp': [dados.impacto],
            'Description': [dados.descricao]
        })
        
        # 2. Limpeza
        df_input['TEXTO_LIMPO'] = df_input['Description'].apply(limpar_texto)
        
        # 3. Função de Previsão Interna
        def obter_previsao(coluna, dicionario):
            # Prever Classe
            pred_num = modelos[coluna].predict(df_input)
            codigo = encoders[coluna].inverse_transform(pred_num)[0]
            texto = dicionario.get(codigo, codigo)
            
            # Prever Confiança (Probabilidade)
            probs = modelos[coluna].predict_proba(df_input)
            confianca = float(max(probs[0]))
            
            return {"codigo": codigo, "descricao": texto, "confianca": confianca}

        # 4. Executar para os 3 alvos
        resultado = {
            "modo_falha": obter_previsao('FailMode', map_mode),
            "metodo_deteccao": obter_previsao('DetMethod', map_det),
            "mecanismo_falha": obter_previsao('FailMech', map_mech),
            "dados_recebidos": {
                "tag": dados.tag,
                "desc_limpa": df_input['TEXTO_LIMPO'][0]
            }
        }
        
        return resultado

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 6. Rota de Teste ---
@app.get("/")
def home():
    return {"status": "API Online", "versao": "1.0"}
