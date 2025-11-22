import streamlit as st
import pandas as pd
import joblib
import re
import nltk
import xgboost
import numpy as np
from nltk.corpus import stopwords
import plotly.express as px # Adicionei para gráficos bonitos (pip install plotly)

# --- Configuração da Página ---
st.set_page_config(page_title="Classificador de Falhas Pro", layout="wide")
st.title("🔧 Classificador de Falhas - Versão Pro")

# --- Inicializar Histórico ---
if 'historico' not in st.session_state:
    st.session_state.historico = []

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

# --- Dicionários (Mantendo seus dados) ---
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

map_det = {
    '1': 'Periodic maintenance', '2': 'Functional testing', '3': 'Inspection', 
    '4': 'Periodic condition monitoring', '5': 'Continuous condition monitoring', 
    '6': 'Production interference', '7': 'Casual observation', '8': 'Corrective maintenance', 
    '9': 'On demand', '10': 'Other'
}

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

# --- Carregar o Modelo ---
@st.cache_resource
def carregar_modelo():
    try:
        return joblib.load('modelo_classificacao_falhas.pkl')
    except Exception as e:
        return None

artefatos = carregar_modelo()
if artefatos is None:
    st.error("ERRO: Arquivo 'modelo_classificacao_falhas.pkl' não encontrado.")
    st.stop()

modelos = artefatos['modelos']
encoders = artefatos['encoders']

# --- LOGICA PRINCIPAL ---
tab1, tab2, tab3, tab4 = st.tabs(["📝 Individual & Top 3", "🚀 Avaliação em Massa", "📊 Dashboard & Histórico", "📚 Dicionário"])

# === ABA 1: INDIVIDUAL + TOP 3 ===
with tab1:
    col1, col2 = st.columns(2)
    with col1:
        tag = st.text_input("Tag", value="1298-31-PIT-0122")
    with col2:
        impacto = st.selectbox("Impacto", ['S', 'D', 'U', 'X', 'None'])
    descricao = st.text_area("Descrição", height=80, placeholder="Ex: Vazamento no selo...")

    if st.button("Classificar", type="primary"):
        if not descricao:
            st.warning("Insira uma descrição.")
        else:
            dados = pd.DataFrame({'Tag': [tag], 'FailureImp': [impacto], 'Description': [descricao]})
            dados['TEXTO_LIMPO'] = dados['Description'].apply(limpar_texto)

            # Função Top 3
            def get_top3(coluna, dic):
                probs = modelos[coluna].predict_proba(dados)[0]
                top3_idx = np.argsort(probs)[-3:][::-1] # Pega indices dos 3 maiores
                
                resultados = []
                for idx in top3_idx:
                    codigo = encoders[coluna].inverse_transform([idx])[0]
                    confianca = probs[idx]
                    texto = dic.get(codigo, codigo)
                    resultados.append((codigo, texto, confianca))
                return resultados

            # Exibir Resultados
            res_mode = get_top3('FailMode', map_mode)
            res_det = get_top3('DetMethod', map_det)
            res_mech = get_top3('FailMech', map_mech)

            st.subheader("Resultados Principais")
            c1, c2, c3 = st.columns(3)
            
            # Função display bonitinho
            def mostrar_top3(titulo, resultados, col_obj):
                with col_obj:
                    # O Vencedor
                    principal = resultados[0]
                    st.metric(titulo, principal[0], delta=f"{principal[2]:.1%}", delta_color="off")
                    st.caption(principal[1])
                    
                    # Expander para "Segunda Opinião"
                    with st.expander("Ver outras possibilidades"):
                        for i, (cod, txt, prob) in enumerate(resultados[1:]):
                            st.markdown(f"**{i+2}º Opção:** {cod} ({prob:.1%})")
                            st.caption(txt)
                            st.markdown("---")

            mostrar_top3("Modo de Falha", res_mode, c1)
            mostrar_top3("Detecção", res_det, c2)
            mostrar_top3("Mecanismo", res_mech, c3)

            # Salvar Histórico
            st.session_state.historico.append({
                "Tag": tag, "Descrição": descricao,
                "Modo": res_mode[0][0], "Conf_Modo": res_mode[0][2],
                "Detecção": res_det[0][0], "Conf_Det": res_det[0][2],
                "Mecanismo": res_mech[0][0], "Conf_Mech": res_mech[0][2]
            })
            st.toast("Salvo no histórico!", icon="✅")

# === ABA 2: EM MASSA ===
with tab2:
    st.markdown("### Upload de Arquivo CSV")
    st.info("O arquivo deve ter pelo menos as colunas: `Tag`, `Description` e `FailureImp`.")
    arquivo = st.file_uploader("Solte seu CSV aqui", type=["csv"])

    if arquivo:
        df_upload = pd.read_csv(arquivo)
        st.write(f"Carregado: {len(df_upload)} linhas.")
        
        if st.button("Processar Planilha Inteira"):
            with st.spinner("Processando... (Isso é rápido!)"):
                # Prepara dados
                df_proc = df_upload.copy()
                # Garante colunas
                for col_nec in ['Tag', 'FailureImp', 'Description']:
                     if col_nec not in df_proc.columns:
                         df_proc[col_nec] = "" # Preenche vazio se não tiver
                
                df_proc['TEXTO_LIMPO'] = df_proc['Description'].astype(str).apply(limpar_texto)
                
                # Loop de previsão (Poderia ser vetorizado, mas loop é mais seguro pra evitar erros de memória aqui)
                preds_mode, preds_det, preds_mech = [], [], []
                
                # Previsão em Batch
                # Fail Mode
                p_num = modelos['FailMode'].predict(df_proc)
                preds_mode = encoders['FailMode'].inverse_transform(p_num)
                
                # Det Method
                p_num = modelos['DetMethod'].predict(df_proc)
                preds_det = encoders['DetMethod'].inverse_transform(p_num)
                
                # Fail Mech
                p_num = modelos['FailMech'].predict(df_proc)
                preds_mech = encoders['FailMech'].inverse_transform(p_num)
                
                # Adiciona ao DF
                df_proc['PRED_FailMode'] = preds_mode
                df_proc['DESC_FailMode'] = [map_mode.get(x, x) for x in preds_mode]
                
                df_proc['PRED_DetMethod'] = preds_det
                df_proc['DESC_DetMethod'] = [map_det.get(x, x) for x in preds_det]
                
                df_proc['PRED_FailMech'] = preds_mech
                df_proc['DESC_FailMech'] = [map_mech.get(x, x) for x in preds_mech]

                st.success("Processamento Concluído!")
                st.dataframe(df_proc.head())
                
                # Download
                csv_final = df_proc.to_csv(index=False).encode('utf-8')
                st.download_button("📥 Baixar Planilha Preenchida", csv_final, "falhas_classificadas.csv", "text/csv")

# === ABA 3: DASHBOARD ===
with tab3:
    if len(st.session_state.historico) > 0:
        df_h = pd.DataFrame(st.session_state.historico)
        
        col_g1, col_g2 = st.columns(2)
        
        with col_g1:
            fig1 = px.pie(df_h, names='Modo', title='Distribuição de Modos de Falha')
            st.plotly_chart(fig1, use_container_width=True)
            
        with col_g2:
            fig2 = px.bar(df_h, x='Mecanismo', title='Contagem de Mecanismos')
            st.plotly_chart(fig2, use_container_width=True)
            
        st.dataframe(df_h, use_container_width=True)
    else:
        st.info("Use a aba 'Individual' para gerar dados para o Dashboard.")

# === ABA 4: DICIONÁRIO ===
with tab4:
    st.markdown("### Consulta de Códigos")
    # Mesma lógica de antes
    with st.expander("Modos de Falha"):
        st.table(pd.DataFrame(list(map_mode.items()), columns=['Cod', 'Desc']))
    with st.expander("Mecanismos"):
        st.table(pd.DataFrame(list(map_mech.items()), columns=['Cod', 'Desc']))
    with st.expander("Detecção"):
        st.table(pd.DataFrame(list(map_det.items()), columns=['Cod', 'Desc']))
