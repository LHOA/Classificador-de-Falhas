import streamlit as st
import pandas as pd
import joblib
import re
import nltk
import xgboost
import numpy as np
from nltk.corpus import stopwords
import plotly.express as px 

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

# --- DICIONÁRIOS DE TRADUÇÃO (ATUALIZADOS) ---

# Mapeamento: Mecanismo de Falha (Já estava com tradução)
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

# Mapeamento: Método de Detecção (AGORA COM TRADUÇÃO)
map_det = {
    '1': 'Periodic maintenance (Manutenção Periódica)', 
    '2': 'Functional testing (Teste Funcional)', 
    '3': 'Inspection (Inspeção)', 
    '4': 'Periodic condition monitoring (Monitoramento de condição periódico)', 
    '5': 'Continuous condition monitoring (Monitoramento de condição contínuo)', 
    '6': 'Production interference (Interferência na produção)', 
    '7': 'Casual observation (Observação casual)', 
    '8': 'Corrective maintenance (Manutenção corretiva)', 
    '9': 'On demand (Sob demanda)', 
    '10': 'Other (Outro)'
}

# Mapeamento: Modo de Falha (AGORA COM TRADUÇÃO)
map_mode = {
    'OTH': 'Other (Outros)', 
    'ELP': 'External leakage - process medium (Vazamento externo - meio de processo)', 
    'BRD': 'Breakdown (Quebra/Colapso)', 
    'ELU': 'External leakage - utility medium (Vazamento externo - utilidades)', 
    'FTI': 'Failure to function as intended (Falha na função pretendida)', 
    'FTO': 'Failure to open on demand (Falha ao abrir sob demanda)', 
    'LCP': 'Leakage in close position (Vazamento na posição fechada)', 
    'DOP': 'Delayed operation (Operação atrasada)', 
    'LOO': 'Low output (Saída baixa)', 
    'PDE': 'Parameter deviation (Desvio de parâmetro)', 
    'FTF': 'Failure to function on demand (Falha ao funcionar sob demanda)', 
    'STD': 'Structural Deficiency (Deficiência Estrutural)', 
    'DEX': 'Defective EX Protection (Proteção EX defeituosa)', 
    'FTS': 'Failure to start on demand (Falha ao partir sob demanda)', 
    'FTC': 'Failure to close on demand (Falha ao fechar sob demanda)', 
    'LOP': 'Loss Of Power (Perda de Potência/Energia)', 
    'STP': 'Failure to stop on demand (Falha ao parar sob demanda)', 
    'SLP': 'Slippage (Deslizamento/Patinação)', 
    'PLU': 'Plugged / Choked (Entupido/Obstruído)', 
    'OHE': 'Overheating (Superaquecimento)', 
    'IHT': 'Insufficient heat transfer (Transferência de calor insuficiente)', 
    'CTD': 'Contact danger / Electric shock (Perigo de contato / Choque elétrico)', 
    'LOA': 'Load drop (Queda de carga)', 
    'EXP': 'Overpressure/Explosion (Sobrepressão/Explosão)', 
    'VIB': 'Vibration (Vibração)', 
    'B000': 'Abnormal instrument signal (Sinal de instrumento anormal)', 
    'C000': 'External leakage (Vazamento externo)', 
    'I000': 'Blocked/restricted/coated/scaling (Bloqueado/restrito/incrustado)', 
    'F000': 'Does not operate on demand (Não opera sob demanda)', 
    'K000': 'Vibration/ noise (Vibração/Ruído)', 
    'D000': 'Internal leakage (Vazamento interno)', 
    'INL': 'Internal leakage (Vazamento interno)', 
    'LOR': 'Loss of redundancy (Perda de redundância)', 
    'AOL': 'Abnormal output - low (Saída anormal - baixa)', 
    'HIO': 'High output (Saída alta)', 
    'FOV': 'Faulty output voltage (Tensão de saída defeituosa)', 
    'NAC': 'Not acceptable alarm condition (Condição de alarme não aceitável)', 
    'ELF': 'External leakage - fuel (Vazamento externo - combustível)', 
    'OSR': 'Overload/slow response/system warning (Sobrecarga/resposta lenta/aviso)', 
    'STC': 'Struct. deficiency containment risk (Deficiência estrutural - risco de contenção)', 
    'UST': 'Spurious stop (Parada espúria)', 
    'AIR': 'Abnormal instrument reading (Leitura anormal de instrumento)', 
    'SER': 'Minor in-service problems (Pequenos problemas em serviço)', 
    'FCO': 'Failure to connect (Falha ao conectar)', 
    'ERO': 'Erratic output (Saída errática)', 
    'NOI': 'Noise (Ruído)', 
    'SPO': 'Spurious operation (Operação espúria)', 
    'UNK': 'Unknown (Desconhecido)', 
    'SHH': 'Spurious high alarm level (Nível de alarme alto espúrio)', 
    'NOO': 'No output (Sem saída)', 
    'FRO': 'Failure to rotate (Falha ao rotacionar)', 
    'PTF': 'Power / signal transmission failure (Falha de transmissão de energia/sinal)', 
    'Y000': 'No failure (Sem falha)', 
    'POW': 'Insufficient power (Potência insuficiente)', 
    'FTL': 'Failure to lock/unlock (Falha ao travar/destravar)', 
    'FDC': 'Failure to disconnect (Falha ao desconectar)', 
    '021': 'COM I/O module error (Erro de módulo I/O)', 
    'SBU': 'Sludge build-up (Acúmulo de borra/lodo)', 
    'NON': 'No immediate effect (Sem efeito imediato)', 
    'J000': 'Minor In-service Problem (Pequeno problema em serviço)', 
    '000': 'UPS-failure (Falha de UPS)', 
    'SLL': 'Spurious low alarm level (Nível de alarme baixo espúrio)', 
    '002': 'Transformer oil level too low (Nível de óleo do transformador muito baixo)', 
    '112': 'Transformer oil level too low (Nível de óleo do transformador muito baixo)', 
    'SCF': 'Secondary containment failure (Falha na contenção secundária)', 
    'WCL': 'Well-to-control-line communication (Comunicação poço-linha de controle)', 
    'E000': 'Physical damage (Dano físico)', 
    'CSF': 'Control / signal failure (Falha de controle/sinal)', 
    'LRM': 'Loss of remote management (Perda de gerenciamento remoto)', 
    'ISB': 'Information security breach (Violação de segurança da informação)', 
    'ILP': 'Internal leakage - process medium (Vazamento interno - fluido de processo)', 
    'EFA': 'Electronic failure (Falha eletrônica)', 
    '2-RC': 'Recommendation (Recomendação)', 
    '5-OK': 'OK (OK)', 
    'H000': 'Failed During Operation (Falhou durante operação)'
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


# === ABA 1: INDIVIDUAL + FEEDBACK ===
with tab1:
    col1, col2 = st.columns(2)
    with col1:
        tag = st.text_input("Tag", value="1298-31-PIT-0122")
    with col2:
        impacto = st.selectbox("Impacto", ['S', 'D', 'U', 'X', 'None'])
    descricao = st.text_area("Descrição", height=80, placeholder="Ex: Vazamento no selo...")

    # Variáveis para guardar o resultado da IA (para usar na correção depois)
    if 'resultado_ia' not in st.session_state:
        st.session_state.resultado_ia = None

    if st.button("Classificar", type="primary"):
        if not descricao:
            st.warning("Insira uma descrição.")
        else:
            dados = pd.DataFrame({'Tag': [tag], 'FailureImp': [impacto], 'Description': [descricao]})
            dados['TEXTO_LIMPO'] = dados['Description'].apply(limpar_texto)

            # --- Função de Previsão (Mesma de antes) ---
            def get_top3(coluna, dic):
                probs = modelos[coluna].predict_proba(dados)[0]
                top3_idx = np.argsort(probs)[-3:][::-1]
                resultados = []
                for idx in top3_idx:
                    codigo = encoders[coluna].inverse_transform([idx])[0]
                    confianca = probs[idx]
                    texto = dic.get(codigo, codigo)
                    resultados.append((codigo, texto, confianca))
                return resultados

            # Previsões
            res_mode = get_top3('FailMode', map_mode)
            res_det = get_top3('DetMethod', map_det)
            res_mech = get_top3('FailMech', map_mech)

            # Guardar no session state para o formulário de feedback usar
            st.session_state.resultado_ia = {
                'mode': res_mode[0][0],
                'det': res_det[0][0],
                'mech': res_mech[0][0]
            }

            # Mostrar Resultados (Igual antes)
            st.subheader("Resultados da IA")
            c1, c2, c3 = st.columns(3)
            
            def mostrar_top3(titulo, resultados, col_obj):
                with col_obj:
                    principal = resultados[0]
                    st.metric(titulo, principal[0], delta=f"{principal[2]:.1%}", delta_color="off")
                    st.caption(principal[1])
                    with st.expander("Ver outras opções"):
                        for i, (cod, txt, prob) in enumerate(resultados[1:]):
                            st.markdown(f"**{i+2}º:** {cod} ({prob:.1%}) - {txt}")
                            st.markdown("---")

            mostrar_top3("Modo de Falha", res_mode, c1)
            mostrar_top3("Detecção", res_det, c2)
            mostrar_top3("Mecanismo", res_mech, c3)

    # --- ÁREA DE FEEDBACK / CORREÇÃO (NOVIDADE) ---
    st.markdown("---")
    with st.expander("❌ A classificação está errada? Ensine a IA aqui!"):
        st.info("Se a IA errou, selecione a opção correta abaixo e clique em salvar. Isso vai melhorar o modelo futuro.")
        
        with st.form("form_feedback"):
            # Pega listas de códigos para os dropdowns
            lista_modos = list(map_mode.keys())
            lista_dets = list(map_det.keys())
            lista_mechs = list(map_mech.keys())
            
            # Tenta pré-selecionar o que a IA sugeriu (se houver)
            idx_mode = 0
            idx_det = 0
            idx_mech = 0
            
            if st.session_state.resultado_ia:
                try:
                    idx_mode = lista_modos.index(st.session_state.resultado_ia['mode'])
                    idx_det = lista_dets.index(st.session_state.resultado_ia['det'])
                    idx_mech = lista_mechs.index(st.session_state.resultado_ia['mech'])
                except:
                    pass # Se não achar, deixa o primeiro

            # Dropdowns de correção
            col_f1, col_f2, col_f3 = st.columns(3)
            
            # Mostra Código + Descrição no dropdown para facilitar
            def format_func_mode(x): return f"{x} - {map_mode.get(x,'')}"
            def format_func_det(x): return f"{x} - {map_det.get(x,'')}"
            def format_func_mech(x): return f"{x} - {map_mech.get(x,'')}"

            novo_modo = col_f1.selectbox("Modo Correto", lista_modos, index=idx_mode, format_func=format_func_mode)
            novo_det = col_f2.selectbox("Detecção Correta", lista_dets, index=idx_det, format_func=format_func_det)
            novo_mech = col_f3.selectbox("Mecanismo Correto", lista_mechs, index=idx_mech, format_func=format_func_mech)

            submit_feedback = st.form_submit_button("💾 Salvar Aprendizado")

            if submit_feedback:
                # Cria um mini dataframe com a correção
                df_feedback = pd.DataFrame({
                    'Tag': [tag],
                    'Description': [descricao],
                    'FailureImp': [impacto],
                    'FailMode': [novo_modo],
                    'DetMethod': [novo_det],
                    'FailMech': [novo_mech]
                })
                
                # Salva num arquivo CSV separado (modo 'append' para não apagar os anteriores)
                arquivo_feedback = 'novos_dados_treino.csv'
                try:
                    # Se arquivo não existe, cria com cabeçalho. Se existe, só adiciona linha.
                    header = not joblib.os.path.exists(arquivo_feedback)
                    df_feedback.to_csv(arquivo_feedback, mode='a', header=header, index=False)
                    st.success(f"Obrigado! O exemplo foi salvo em '{arquivo_feedback}'. O modelo ficará mais esperto na próxima atualização.")
                except Exception as e:
                    st.error(f"Erro ao salvar: {e}")

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
                df_proc = df_upload.copy()
                for col_nec in ['Tag', 'FailureImp', 'Description']:
                     if col_nec not in df_proc.columns:
                         df_proc[col_nec] = ""
                
                df_proc['TEXTO_LIMPO'] = df_proc['Description'].astype(str).apply(limpar_texto)
                
                # Previsões
                p_num = modelos['FailMode'].predict(df_proc)
                preds_mode = encoders['FailMode'].inverse_transform(p_num)
                
                p_num = modelos['DetMethod'].predict(df_proc)
                preds_det = encoders['DetMethod'].inverse_transform(p_num)
                
                p_num = modelos['FailMech'].predict(df_proc)
                preds_mech = encoders['FailMech'].inverse_transform(p_num)
                
                # Salvar no DF (Código e Descrição Traduzida)
                df_proc['Cod_FailMode'] = preds_mode
                df_proc['Desc_FailMode'] = [map_mode.get(x, x) for x in preds_mode]
                
                df_proc['Cod_DetMethod'] = preds_det
                df_proc['Desc_DetMethod'] = [map_det.get(x, x) for x in preds_det]
                
                df_proc['Cod_FailMech'] = preds_mech
                df_proc['Desc_FailMech'] = [map_mech.get(x, x) for x in preds_mech]

                st.success("Processamento Concluído!")
                st.dataframe(df_proc.head())
                
                csv_final = df_proc.to_csv(index=False).encode('utf-8')
                st.download_button("📥 Baixar Planilha Preenchida", csv_final, "falhas_classificadas_traduzidas.csv", "text/csv")

# === ABA 3: DASHBOARD ===
with tab3:
    if len(st.session_state.historico) > 0:
        df_h = pd.DataFrame(st.session_state.historico)
        
        col_g1, col_g2 = st.columns(2)
        with col_g1:
            # Gráficos agora usarão a descrição traduzida que salvamos no histórico
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
    st.markdown("### Consulta de Códigos e Traduções")
    with st.expander("Modos de Falha (Failure Mode)"):
        st.table(pd.DataFrame(list(map_mode.items()), columns=['Código', 'Descrição (EN/PT)']))
    with st.expander("Mecanismos (Failure Mechanism)"):
        st.table(pd.DataFrame(list(map_mech.items()), columns=['Código', 'Descrição (EN/PT)']))
    with st.expander("Detecção (Detection Method)"):
        st.table(pd.DataFrame(list(map_det.items()), columns=['Código', 'Descrição (EN/PT)']))

