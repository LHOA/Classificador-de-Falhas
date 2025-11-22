import streamlit as st
import pandas as pd
import joblib
import re
import nltk
from nltk.corpus import stopwords

# --- Configuração da Página ---
st.set_page_config(page_title="Classificador de Falhas", layout="centered")

# --- Funções Auxiliares (Precisam ser iguais ao treinamento) ---
# O Streamlit roda esse código toda vez que alguém clica, então usamos cache para não baixar stopwords toda hora
@st.cache_resource
def baixar_nltk():
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords')

baixar_nltk()
stop_words = set(stopwords.words('portuguese'))

def limpar_texto(texto):
    if not isinstance(texto, str):
        return ""
    texto = texto.lower()
    texto = re.sub(r'\d+', '', texto)
    texto = re.sub(r'[^\w\s]', '', texto)
    texto = ' '.join([palavra for palavra in texto.split() if palavra not in stop_words])
    return texto

# --- Carregar o Modelo Treinado ---
@st.cache_resource
def carregar_modelo():
    # Carrega o arquivo que você salvou no Passo 1
    return joblib.load('modelo_classificacao_falhas.pkl')

try:
    artefatos = carregar_modelo()
    modelos = artefatos['modelos']
    encoders = artefatos['encoders']
except FileNotFoundError:
    st.error("Erro: Arquivo 'modelo_classificacao_falhas.pkl' não encontrado. Certifique-se de que ele está na mesma pasta.")
    st.stop()

# --- Interface do Usuário (Front-end) ---
st.title("🔧 Classificador de Dados de Falha")
st.markdown("Insira os dados da falha abaixo para obter a classificação automática.")

with st.form("formulario_falha"):
    tag = st.text_input("Tag do Equipamento", value="1298-31-PIT-0122")
    
    # Opções de impacto (você pode ajustar conforme seus dados reais)
    impacto_opcoes = ['S', 'D', 'U', 'X', 'None'] 
    impacto = st.selectbox("Impacto da Falha (FailureImp)", impacto_opcoes)
    
    descricao = st.text_area("Descrição da Falha", height=100, placeholder="Ex: Vazamento no selo mecânico da bomba...")
    
    botao_enviar = st.form_submit_button("Classificar Falha")

# --- Lógica de Previsão ---
if botao_enviar:
    if not descricao:
        st.warning("Por favor, insira uma descrição.")
    else:
        # 1. Preparar os dados como um DataFrame (igual ao treinamento)
        dados_entrada = pd.DataFrame({
            'Tag': [tag],
            'FailureImp': [impacto],
            'Description': [descricao]
        })
        
        # 2. Aplicar a limpeza
        dados_entrada['TEXTO_LIMPO'] = dados_entrada['Description'].apply(limpar_texto)
        
        # 3. Fazer as previsões
        st.subheader("Resultados da Classificação:")
        col1, col2, col3 = st.columns(3)
        
        # FailMode
        pred_num_mode = modelos['FailMode'].predict(dados_entrada)
        pred_label_mode = encoders['FailMode'].inverse_transform(pred_num_mode)[0]
        col1.metric("Modo de Falha", pred_label_mode)
        
        # DetMethod
        pred_num_det = modelos['DetMethod'].predict(dados_entrada)
        pred_label_det = encoders['DetMethod'].inverse_transform(pred_num_det)[0]
        col2.metric("Método de Detecção", pred_label_det)
        
        # FailMech
        pred_num_mech = modelos['FailMech'].predict(dados_entrada)
        pred_label_mech = encoders['FailMech'].inverse_transform(pred_num_mech)[0]
        col3.metric("Mecanismo de Falha", pred_label_mech)
        
        st.success("Classificação concluída com sucesso!")