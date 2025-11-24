import pandas as pd
import joblib
import re
import nltk
from nltk.corpus import stopwords
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

# --- CONFIGURAÇÃO INICIAL ---
app = FastAPI(title="API Classificador de Falhas")

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CARREGAR MODELO ---
try:
    artefatos = joblib.load('modelo_classificacao_falhas.pkl')
    modelos = artefatos['modelos']
    encoders = artefatos['encoders']
except Exception as e:
    raise RuntimeError(f"Erro ao carregar modelo: {e}")

# --- CONFIGURAÇÃO NLTK ---
try:
    nltk.data.find('corpora/stopwords')
    stop_words = set(stopwords.words('portuguese'))
except LookupError:
    nltk.download('stopwords')
    stop_words = set(stopwords.words('portuguese'))

# --- FUNÇÕES ÚTEIS ---
def limpar_texto(texto):
    if not isinstance(texto, str): return ""
    texto = texto.lower()
    texto = re.sub(r'\d+', '', texto)
    texto = re.sub(r'[^\w\s]', '', texto)
    texto = ' '.join([palavra for palavra in texto.split() if palavra not in stop_words])
    return texto

# --- DICIONÁRIOS ---
# (Mantenha seus dicionários map_mech, map_det, map_mode aqui... 
#  Para economizar espaço na resposta, assumo que você manteve os dicionários iguais aos anteriores)
# ... COLE SEUS DICIONÁRIOS AQUI SE PRECISAR, MAS O CÓDIGO ANTERIOR JÁ OS TINHA ...
# Vou incluir apenas referências vazias para o código rodar, mas você deve manter os seus cheios:
map_mech = artefatos.get('map_mech', {}) # Se não tiver no pkl, use os do código anterior
map_det = artefatos.get('map_det', {})
map_mode = artefatos.get('map_mode', {})
# DICA: Se os mapas estavam hardcoded no api.py anterior, COPIE E COLE ELES AQUI NOVAMENTE.

# --- MODELOS DE DADOS ---
class DadosEntrada(BaseModel):
    tag: str = "N/A"
    descricao: str
    impacto: str 

class ItemClassificacao(BaseModel):
    codigo: str
    descricao: str
    confianca: float

class RespostaAPI(BaseModel):
    modo: list[ItemClassificacao]       # AGORA É UMA LISTA
    deteccao: list[ItemClassificacao]   # AGORA É UMA LISTA
    mecanismo: list[ItemClassificacao]  # AGORA É UMA LISTA
    texto_processado: str

# --- ROTA DE CLASSIFICAÇÃO ---
@app.post("/classificar", response_model=RespostaAPI)
def classificar_falha(dados: DadosEntrada):
    df_input = pd.DataFrame({
        'Tag': [dados.tag],
        'FailureImp': [dados.impacto],
        'Description': [dados.descricao]
    })
    df_input['TEXTO_LIMPO'] = df_input['Description'].apply(limpar_texto)
    
    try:
        # NOVA FUNÇÃO: Retorna TOP 3
        def prever_top3(coluna, dicionario_map):
            probs = modelos[coluna].predict_proba(df_input)[0]
            # Pega os índices dos 3 maiores valores
            top3_idxs = np.argsort(probs)[-3:][::-1]
            
            resultados = []
            for idx in top3_idxs:
                codigo = encoders[coluna].inverse_transform([idx])[0]
                confianca = float(probs[idx])
                # Tenta pegar descrição do dicionário interno ou usa o código
                texto_desc = str(codigo) 
                # Se você copiou os dicionários map_... para dentro deste arquivo, use:
                # texto_desc = dicionario_map.get(codigo, codigo)
                
                resultados.append({
                    "codigo": codigo,
                    "descricao": texto_desc, # O frontend fará a tradução final
                    "confianca": confianca
                })
            return resultados

        # IMPORTANTE: Você precisa garantir que map_mode, map_det, etc existam neste arquivo
        # Se você apagou eles na cópia, recupere do arquivo anterior.
        res_mode = prever_top3('FailMode', map_mode)
        res_det = prever_top3('DetMethod', map_det)
        res_mech = prever_top3('FailMech', map_mech)

        return {
            "modo": res_mode,
            "deteccao": res_det,
            "mecanismo": res_mech,
            "texto_processado": df_input['TEXTO_LIMPO'].iloc[0]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")
