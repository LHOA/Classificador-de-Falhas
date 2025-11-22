import streamlit as st
import pandas as pd
import joblib
import re
import nltk
import xgboost
from nltk.corpus import stopwords

# --- Configuração da Página ---
st.set_page_config(page_title="Classificador de Falhas", layout="centered")
st.title("🔧 Classificador de Falhas")

# --- Diagnóstico de Carregamento ---
status_text = st.empty()
status_text.text("Carregando bibliotecas e modelo...")

# --- Dicionários de Tradução (Baseados nas suas listas) ---

# Mapeamento: Código -> Descrição (Failure Mechanism)
map_mech = {
    '1.0': 'General (Geral)', '1.1': 'Leakage (Vazamento)', '1.2': 'Vibration (Vibração)', 
    '1.3': 'Clearance/alignment failure (Falha de folga/alinhamento)', '1.4': 'Deformation (Deformação)', 
    '1.5': 'Looseness (Afrouxamento)', '1.6': 'Sticking (Emperramento/Travamento)', 
    '1.7': 'Insulation damage (Dano no isolamento térmico/acústico)', '1.8': 'Degraded/insufficient support (Suporte degradado/insuficiente)', 
    '1.9': 'Coating damage (Dano no revestimento/pintura)', '1.10': 'Damage to outer sheath (Dano na capa externa)', 
    '1.11': 'Liquid filled annulus (Anular preenchido com líquido)', '1.12': 'Carcass collapse (Colapso da carcaça)', 
    '1.13': 'Pullout of liner (Arrancamento do liner/camada interna)', '1.14': 'Defective flameproof joint, mechanical (Junta à prova de explosão defeituosa - mecânica)', 
    '1.15': 'Defective enclosure/ IP (Invólucro defeituoso / Grau IP)', '2.0': 'General (Geral)', 
    '2.1': 'Cavitation (Cavitação)', '2.2': 'Corrosion internal (Corrosão interna)', '2.3': 'Erosion (Erosão)', 
    '2.4': 'Wear (Desgaste)', '2.5': 'Breakage (Quebra/Ruptura)', '2.6': 'Fatigue (Fadiga)', 
    '2.7': 'Overheating (Superaquecimento)', '2.8': 'Burst (Estouro/Ruptura por pressão)', '2.9': 'Corrosion external (Corrosão externa)', 
    '2.10': 'Crack (Trinca)', '2.11': 'Damage to flange (Dano no flange)', '2.12': 'Degraded bolting (Parafusos/Estojos degradados)', 
    '2.13': 'Insufficient cathodic protection (Proteção catódica insuficiente)', '2.14': 'Chloride penetration (Penetração de cloretos)', 
    '2.15': 'Damaged concrete (Concreto danificado)', '2.16': 'Defective flameproof joint, corrosion (Junta à prova de explosão defeituosa - corrosão)', 
    '2.17': 'Natural Degradation (Degradação natural)', '2.20': 'Corrosion under insulation (Corrosão sob isolamento - CUI)', 
    '2.21': 'Corrosion insulated bolts (Corrosão em parafusos isolados)', '3.0': 'General (Geral)', 
    '3.1': 'Control failure (Falha de controle)', '3.2': 'No signal/indication/alarm (Sem sinal/indicação/alarme)', 
    '3.3': 'Faulty signal/indication/alarm (Sinal/indicação/alarme defeituoso)', '3.4': 'Out of adjustment (Desajustado)', 
    '3.5': 'Software failure (Falha de software)', '3.6': 'Common cause/mode failure (Falha de causa comum/modo comum)', 
    '4.0': 'General (Geral)', '4.1': 'Short circuiting (Curto-circuito)', '4.2': 'Open circuit (Circuito aberto)', 
    '4.3': 'No power/voltage (Sem energia/tensão)', '4.4': 'Faulty power/voltage (Energia/tensão defeituosa)', 
    '4.5': 'Earth/isolation fault (Falha de terra/isolamento)', '4.6': 'Defective electrical connection (Conexão elétrica defeituosa)', 
    '5.0': 'General (Geral)', '5.1': 'Blockage/plugged (Bloqueio/Entupimento)', '5.2': 'Contamination (Contaminação)', 
    '5.3': 'Miscellaneous external influences (Influências externas diversas)', '5.4': 'Marine fouling (Incrustação marinha)', 
    '5.5': 'Seabed erosion (Erosão do leito marinho)', '5.6': 'Free span (Vão livre)', '5.7': 'Detrimental contact (Contato prejudicial)', 
    '5.8': 'Incorrect configuration (Configuração incorreta)', '5.9': 'Operation outside pressure and temp (Operação fora de pressão e temperatura)', 
    '6.0': 'General (Geral)', '6.1': 'No cause found (Nenhuma causa encontrada)', '6.2': 'Combined causes (Causas combinadas)', 
    '6.3': 'Other (Outro)', '6.4': 'Unknown (Desconhecido)', '6.5': 'Deviation from design (Desvio de projeto)'
}

# Mapeamento: Código -> Descrição (Detection Method)
map_det = {
    '1': 'Periodic maintenance', '2': 'Functional testing', '3': 'Inspection', 
    '4': 'Periodic condition monitoring', '5': 'Continuous condition monitoring', 
    '6': 'Production interference', '7': 'Casual observation', '8': 'Corrective maintenance', 
    '9': 'On demand', '10': 'Other'
}

# Mapeamento: Código -> Descrição (Failure Mode - Simplificado dos dados extraídos)
map_mode = {
    'OTH': 'Other / Outros', 'ELP': 'External leakage - process medium', 'BRD': 'Breakdown', 
    'ELU': 'External leakage - utility medium', 'FTI': 'Failure to function as intended', 
    'FTO': 'Failure to open on demand', 'LCP': 'Leakage in close position', 'DOP': 'Delayed operation', 
    'LOO': 'Low output', 'PDE': 'Parameter deviation', 'FTF': 'Failure to function on demand', 
    'STD': 'Structural Deficiency', 'DEX': 'Defective EX Protection', 'FTS': 'Failure to start on demand', 
    'FTC': 'Failure to close on demand', 'LOP': 'Loss Of Power', 'STP': 'Failure to stop on demand', 
    'SLP': 'Slippage', 'PLU': 'Plugged / Choked', 'OHE': 'Overheating', 'IHT': 'Insufficient heat transfer', 
    'CTD': 'Contact danger / Electric shock', 'LOA': 'Load drop', 'EXP': 'Overpressure/Explosion', 
    'VIB': 'Vibration', 'B000': 'Abnormal instrument signal', 'C000': 'External leakage', 
    'I000': 'Blocked/restricted/coated/scaling', 'F000': 'Opererer ikke ved behov', 'K000': 'Vibration/ noise', 
    'D000': 'Internal leakage', 'INL': 'Internal leakage', 'LOR': 'Loss of redundancy', 
    'AOL': 'Abnormal output - low', 'HIO': 'High output', 'FOV': 'Faulty output voltage', 
    'NAC': 'Not acceptable alarm condition', 'ELF': 'External leakage - fuel', 
    'OSR': 'Overload/slow response/system warning', 'STC': 'Struct. deficiency containment risk', 
    'UST': 'Spurious stop', 'AIR': 'Abnormal instrument reading', 'SER': 'Minor in-service problems', 
    'FCO': 'Failure to connect', 'ERO': 'Erratic output', 'NOI': 'Noise', 'SPO': 'Spurious operation', 
    'UNK': 'Unknown', 'SHH': 'Spurious high alarm level', 'NOO': 'No output', 'FRO': 'Failure to rotate', 
    'PTF': 'Power / signal transmission failure', 'Y000': 'Ingen feil', 'POW': 'Insufficient power', 
    'FTL': 'Failure to lock/unlock', 'FDC': 'Failure to disconnect', '021': 'COM I/O module error', 
    'SBU': 'Sludge build-up', 'NON': 'No immediate effect', 'J000': 'Minor In-service Problem', 
    '000': 'UPS-failure', 'SLL': 'Spurious low alarm level', '002': 'Transformer oil level too low', 
    '112': 'Transformer oil level too low', 'SCF': 'Secondary containment failure', 
    'WCL': 'Well-to-control-line communication', 'E000': 'Physical damage', 
    'CSF': 'Control / signal failure', 'LRM': 'Loss of remote management', 
    'ISB': 'Information security breach', 'ILP': 'Internal leakage - process medium', 
    'EFA': 'Electronic failure', '2-RC': 'Recommendation', '5-OK': 'OK', 'H000': 'Failed During Operation'
}

# --- Funções Auxiliares ---
@st.cache_resource
def configurar_nltk():
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords')
    return set(stopwords.words('portuguese'))

stop_words = configurar_nltk()

def limpar_texto(texto):
    if not isinstance(texto, str):
        return ""
    texto = texto.lower()
    texto = re.sub(r'\d+', '', texto)
    texto = re.sub(r'[^\w\s]', '', texto)
    texto = ' '.join([palavra for palavra in texto.split() if palavra not in stop_words])
    return texto

# --- Carregar o Modelo ---
@st.cache_resource
def carregar_modelo():
    try:
        return joblib.load('modelo_classificacao_falhas.pkl')
    except Exception as e:
        return None

artefatos = carregar_modelo()

# Verifica se carregou corretamente
if artefatos is None:
    status_text.error("ERRO: Arquivo 'modelo_classificacao_falhas.pkl' não encontrado.")
    st.stop()

modelos = artefatos['modelos']
encoders = artefatos['encoders']

status_text.text("Sistema pronto!")
status_text.empty() 

# --- Interface ---
st.markdown("### Dados da Falha")

col1, col2 = st.columns(2)
with col1:
    tag = st.text_input("Tag do Equipamento", value="1298-31-PIT-0122")
with col2:
    impacto = st.selectbox("Impacto (FailureImp)", ['S', 'D', 'U', 'X', 'None'])

descricao = st.text_area("Descrição da Falha", height=100, placeholder="Descreva o problema aqui...")

# Botão de ação
if st.button("Classificar Agora", type="primary"):
    if not descricao:
        st.warning("⚠️ Por favor, escreva uma descrição antes de classificar.")
    else:
        with st.spinner('Analisando...'):
            # 1. Preparar DataFrame
            dados = pd.DataFrame({
                'Tag': [tag],
                'FailureImp': [impacto],
                'Description': [descricao]
            })
            dados['TEXTO_LIMPO'] = dados['Description'].apply(limpar_texto)

            # 2. Fazer Previsões
            st.markdown("---")
            st.subheader("🔍 Resultados da IA:")
            
            r_col1, r_col2, r_col3 = st.columns(3)

            # Helper para prever e traduzir
            def prever_e_traduzir(coluna_alvo, dicionario):
                # Previsão numérica do modelo
                pred_num = modelos[coluna_alvo].predict(dados)
                # Converte número de volta para o código original (ex: 0 -> '1.1')
                codigo_original = encoders[coluna_alvo].inverse_transform(pred_num)[0]
                # Procura a descrição no dicionário. Se não achar, mostra só o código
                descricao_texto = dicionario.get(codigo_original, codigo_original)
                
                return codigo_original, descricao_texto

            # Fail Mode
            cod_mode, desc_mode = prever_e_traduzir('FailMode', map_mode)
            r_col1.metric("Modo de Falha", f"{cod_mode}", delta=desc_mode, delta_color="off")
            
            # Det Method
            cod_det, desc_det = prever_e_traduzir('DetMethod', map_det)
            r_col2.metric("Método de Detecção", f"{cod_det}", delta=desc_det, delta_color="off")
            
            # Fail Mech
            cod_mech, desc_mech = prever_e_traduzir('FailMech', map_mech)
            r_col3.metric("Mecanismo de Falha", f"{cod_mech}", delta=desc_mech, delta_color="off")
            
            st.success("Classificação concluída.")
