import streamlit as st
import pandas as pd
import joblib
import re
import nltk
import xgboost
import numpy as np
import os
from nltk.corpus import stopwords
import plotly.express as px 

# --- 1. CONFIGURAÇÃO DA PÁGINA ---
st.set_page_config(page_title="Classificador de Falhas Pro", layout="wide")
st.title("🔧 Classificador de Falhas - ISO 14224 - v1.0")

# --- 2. INICIALIZAR MEMÓRIA ---
if 'historico' not in st.session_state:
    st.session_state.historico = []
if 'resultado_ia' not in st.session_state:
    st.session_state.resultado_ia = None

# --- 3. FUNÇÕES E CARREGAMENTO ---
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

# --- 4. DICIONÁRIOS (TRADUZIDOS) ---
map_impacto_frontend = {
    "D - Falha Crítica (Dead)": "D",
    "S - Falha Degradada (Degraded)": "S",
    "U - Falha Incipiente (Unwell)": "U",
    "Outros (X / None)": "X"
}
map_impacto_backend = {v: k for k, v in map_impacto_frontend.items()}

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
    '1': 'Periodic maintenance (Manutenção Periódica)', '2': 'Functional testing (Teste Funcional)', 
    '3': 'Inspection (Inspeção)', '4': 'Periodic condition monitoring (Monitoramento de condição periódico)', 
    '5': 'Continuous condition monitoring (Monitoramento de condição contínuo)', '6': 'Production interference (Interferência na produção)', 
    '7': 'Casual observation (Observação casual)', '8': 'Corrective maintenance (Manutenção corretiva)', 
    '9': 'On demand (Sob demanda)', '10': 'Other (Outro)'
}

map_mode = {
    'OTH': 'Other (Outros)', 'ELP': 'External leakage - process medium (Vazamento externo - meio de processo)', 
    'BRD': 'Breakdown (Quebra/Colapso)', 'ELU': 'External leakage - utility medium (Vazamento externo - utilidades)', 
    'FTI': 'Failure to function as intended (Falha na função pretendida)', 'FTO': 'Failure to open on demand (Falha ao abrir sob demanda)', 
    'LCP': 'Leakage in close position (Vazamento na posição fechada)', 'DOP': 'Delayed operation (Operação atrasada)', 
    'LOO': 'Low output (Saída baixa)', 'PDE': 'Parameter deviation (Desvio de parâmetro)', 
    'FTF': 'Failure to function on demand (Falha ao funcionar sob demanda)', 'STD': 'Structural Deficiency (Deficiência Estrutural)', 
    'DEX': 'Defective EX Protection (Proteção EX defeituosa)', 'FTS': 'Failure to start on demand (Falha ao partir sob demanda)', 
    'FTC': 'Failure to close on demand (Falha ao fechar sob demanda)', 'LOP': 'Loss Of Power (Perda de Potência/Energia)', 
    'STP': 'Failure to stop on demand (Falha ao parar sob demanda)', 'SLP': 'Slippage (Deslizamento/Patinação)', 
    'PLU': 'Plugged / Choked (Entupido/Obstruído)', 'OHE': 'Overheating (Superaquecimento)', 
    'IHT': 'Insufficient heat transfer (Transferência de calor insuficiente)', 'CTD': 'Contact danger / Electric shock (Perigo de contato / Choque elétrico)', 
    'LOA': 'Load drop (Queda de carga)', 'EXP': 'Overpressure/Explosion (Sobrepressão/Explosão)', 
    'VIB': 'Vibration (Vibração)', 'B000': 'Abnormal instrument signal (Sinal de instrumento anormal)', 
    'C000': 'External leakage (Vazamento externo)', 'I000': 'Blocked/restricted/coated/scaling (Bloqueado/restrito/incrustado)', 
    'F000': 'Does not operate on demand (Não opera sob demanda)', 'K000': 'Vibration/ noise (Vibração/Ruído)', 
    'D000': 'Internal leakage (Vazamento interno)', 'INL': 'Internal leakage (Vazamento interno)', 
    'LOR': 'Loss of redundancy (Perda de redundância)', 'AOL': 'Abnormal output - low (Saída anormal - baixa)', 
    'HIO': 'High output (Saída alta)', 'FOV': 'Faulty output voltage (Tensão de saída defeituosa)', 
    'NAC': 'Not acceptable alarm condition (Condição de alarme não aceitável)', 'ELF': 'External leakage - fuel (Vazamento externo - combustível)', 
    'OSR': 'Overload/slow response/system warning (Sobrecarga/resposta lenta/aviso)', 'STC': 'Struct. deficiency containment risk (Deficiência estrutural - risco de contenção)', 
    'UST': 'Spurious stop (Parada espúria)', 'AIR': 'Abnormal instrument reading (Leitura anormal de instrumento)', 
    'SER': 'Minor in-service problems (Pequenos problemas em serviço)', 'FCO': 'Failure to connect (Falha ao conectar)', 
    'ERO': 'Erratic output (Saída errática)', 'NOI': 'Noise (Ruído)', 'SPO': 'Spurious operation (Operação espúria)', 
    'UNK': 'Unknown (Desconhecido)', 'SHH': 'Spurious high alarm level (Nível de alarme alto espúrio)', 
    'NOO': 'No output (Sem saída)', 'FRO': 'Failure to rotate (Falha ao rotacionar)', 
    'PTF': 'Power / signal transmission failure (Falha de transmissão de energia/sinal)', 'Y000': 'No failure (Sem falha)', 
    'POW': 'Insufficient power (Potência insuficiente)', 'FTL': 'Failure to lock/unlock (Falha ao travar/destravar)', 
    'FDC': 'Failure to disconnect (Falha ao desconectar)', '021': 'COM I/O module error (Erro de módulo I/O)', 
    'SBU': 'Sludge build-up (Acúmulo de borra/lodo)', 'NON': 'No immediate effect (Sem efeito imediato)', 
    'J000': 'Minor In-service Problem (Pequeno problema em serviço)', '000': 'UPS-failure (Falha de UPS)', 
    'SLL': 'Spurious low alarm level (Nível de alarme baixo espúrio)', '002': 'Transformer oil level too low (Nível de óleo do transformador muito baixo)', 
    '112': 'Transformer oil level too low (Nível de óleo do transformador muito baixo)', 'SCF': 'Secondary containment failure (Falha na contenção secundária)', 
    'WCL': 'Well-to-control-line communication (Comunicação poço-linha de controle)', 'E000': 'Physical damage (Dano físico)', 
    'CSF': 'Control / signal failure (Falha de controle/sinal)', 'LRM': 'Loss of remote management (Perda de gerenciamento remoto)', 
    'ISB': 'Information security breach (Violação de segurança da informação)', 'ILP': 'Internal leakage - process medium (Vazamento interno - fluido de processo)', 
    'EFA': 'Electronic failure (Falha eletrônica)', '2-RC': 'Recommendation (Recomendação)', 
    '5-OK': 'OK (OK)', 'H000': 'Failed During Operation (Falhou durante operação)'
}

# --- 5. CARREGAR MODELO ---
@st.cache_resource
def carregar_modelo():
    try:
        return joblib.load('modelo_classificacao_falhas.pkl')
    except Exception as e:
        return None

artefatos = carregar_modelo()
if artefatos is None:
    st.error("ERRO CRÍTICO: Arquivo 'modelo_classificacao_falhas.pkl' não encontrado.")
    st.stop()

modelos = artefatos['modelos']
encoders = artefatos['encoders']

# --- 6. ESTRUTURA DE ABAS ---
tab1, tab2, tab3, tab4 = st.tabs(["📝 Classificador & Feedback", "🚀 Avaliação em Massa", "📊 Dashboard", "📚 Dicionário"])

# === ABA 1: CLASSIFICADOR ===
with tab1:
    col1, col2 = st.columns(2)
    with col1:
        tag = st.text_input("Tag", value="Bomba 1234-B-456")
    with col2:
        opcoes_impacto = list(map_impacto_frontend.keys())
        impacto_selecionado = st.selectbox("Impacto da Falha (FailureImp)", opcoes_impacto)
        codigo_impacto = map_impacto_frontend[impacto_selecionado]

    with st.expander("ℹ️ Entenda os Tipos de Impacto", expanded=False):
        st.markdown("""
        * 🔴 **D - Falha Crítica (Dead):** Cessa a função fundamental.
        * 🟠 **S - Falha Degradada (Serious):** Reduz desempenho ou afeta função secundária.
        * 🟡 **U - Falha Incipiente (Unwell):** Imperfeição que pode evoluir.
        * ⚪ **Outros:** Falhas indefinidas.
        """)

    descricao = st.text_area("Descrição da Falha", height=100)

    if st.button("Classificar", type="primary"):
        if not descricao:
            st.warning("Digite uma descrição.")
        else:
            dados = pd.DataFrame({'Tag': [tag], 'FailureImp': [codigo_impacto], 'Description': [descricao]})
            dados['TEXTO_LIMPO'] = dados['Description'].apply(limpar_texto)

            def get_top3(col, dic):
                probs = modelos[col].predict_proba(dados)[0]
                idxs = np.argsort(probs)[-3:][::-1]
                res = []
                for i in idxs:
                    cod = encoders[col].inverse_transform([i])[0]
                    conf = probs[i]
                    txt = dic.get(cod, cod)
                    res.append((cod, txt, conf))
                return res

            res_mode = get_top3('FailMode', map_mode)
            res_det = get_top3('DetMethod', map_det)
            res_mech = get_top3('FailMech', map_mech)

            st.session_state.resultado_ia = {'mode': res_mode[0][0], 'det': res_det[0][0], 'mech': res_mech[0][0]}

            txt_mode_completo = f"{res_mode[0][0]} - {res_mode[0][1]}"
            txt_det_completo = f"{res_det[0][0]} - {res_det[0][1]}"
            txt_mech_completo = f"{res_mech[0][0]} - {res_mech[0][1]}"

            st.session_state.historico.append({
                "Tag": tag, "Descrição": descricao, "Impacto": impacto_selecionado,
                "Modo": txt_mode_completo, "Modo_Cod": res_mode[0][0],
                "Detecção": txt_det_completo, "Mecanismo": txt_mech_completo,
                "Confiança": float(res_mode[0][2]), "Status": "IA (Automático)"
            })

            st.subheader("Resultados da IA:")
            c1, c2, c3 = st.columns(3)
            
            def display_res(title, res_list, col):
                with col:
                    top = res_list[0]
                    st.markdown(f"###### {title}")
                    st.success(f"{top[0]} - {top[1]}")
                    st.progress(float(top[2]), text=f"Confiança: {float(top[2]):.1%}")
                    with st.expander("Outras opções"):
                        for item in res_list[1:]:
                            st.markdown(f"**{item[0]}**: {item[2]:.1%} - {item[1]}")
                            st.divider()
            
            display_res("Modo de Falha", res_mode, c1)
            display_res("Detecção", res_det, c2)
            display_res("Mecanismo", res_mech, c3)

    st.markdown("---")
    with st.expander("❌ A classificação está errada? Corrigir aqui."):
        with st.form("form_feedback"):
            l_modos = list(map_mode.keys())
            l_dets = list(map_det.keys())
            l_mechs = list(map_mech.keys())
            i_m, i_d, i_me = 0, 0, 0
            if st.session_state.resultado_ia:
                try:
                    i_m = l_modos.index(st.session_state.resultado_ia['mode'])
                    i_d = l_dets.index(st.session_state.resultado_ia['det'])
                    i_me = l_mechs.index(st.session_state.resultado_ia['mech'])
                except: pass
            
            c_f1, c_f2, c_f3 = st.columns(3)
            novo_mode = c_f1.selectbox("Modo Correto", l_modos, index=i_m, format_func=lambda x: f"{x} - {map_mode.get(x,'')}")
            novo_det = c_f2.selectbox("Detecção Correta", l_dets, index=i_d, format_func=lambda x: f"{x} - {map_det.get(x,'')}")
            novo_mech = c_f3.selectbox("Mecanismo Correto", l_mechs, index=i_me, format_func=lambda x: f"{x} - {map_mech.get(x,'')}")
            
            if st.form_submit_button("💾 Salvar Correção"):
                df_feed = pd.DataFrame({
                    'Tag': [tag], 'Description': [descricao], 'FailureImp': [codigo_impacto],
                    'FailMode': [novo_mode], 'DetMethod': [novo_det], 'FailMech': [novo_mech]
                })
                arq_feed = 'novos_dados_treino.csv'
                header = not os.path.exists(arq_feed)
                df_feed.to_csv(arq_feed, mode='a', header=header, index=False)
                
                if len(st.session_state.historico) > 0:
                    st.session_state.historico[-1]['Modo'] = f"{novo_mode} - {map_mode.get(novo_mode,'')}"
                    st.session_state.historico[-1]['Modo_Cod'] = novo_mode
                    st.session_state.historico[-1]['Detecção'] = f"{novo_det} - {map_det.get(novo_det,'')}"
                    st.session_state.historico[-1]['Mecanismo'] = f"{novo_mech} - {map_mech.get(novo_mech,'')}"
                    st.session_state.historico[-1]['Status'] = "Corrigido por Humano"
                    st.session_state.historico[-1]['Confiança'] = 1.0 
                st.success("Correção salva!")

# === ABA 2: EM MASSA (COM CORREÇÃO DE CODIFICAÇÃO) ===
with tab2:
    st.markdown("### Upload de CSV")
    st.info("Colunas: `Tag`, `Description`, `FailureImp`.")
    
    separador_manual = st.selectbox("Separador do arquivo:", [", (Vírgula)", "; (Ponto e Vírgula)"], index=0)
    sep_char = "," if separador_manual.startswith(",") else ";"
    upl = st.file_uploader("Arraste seu arquivo aqui", type=['csv', 'txt'])
    
    if upl:
        try:
            # --- CORREÇÃO DE CODIFICAÇÃO AQUI ---
            try:
                # Tenta UTF-8 primeiro (Padrão)
                df_up = pd.read_csv(upl, sep=sep_char, on_bad_lines='warn', engine='python', encoding='utf-8')
            except UnicodeDecodeError:
                # Se falhar (Erro 0xE2...), reseta o arquivo e tenta Latin-1 (Excel)
                upl.seek(0) 
                df_up = pd.read_csv(upl, sep=sep_char, on_bad_lines='warn', engine='python', encoding='latin1')
            # ------------------------------------

            st.success(f"{len(df_up)} linhas carregadas.")
            
            colunas_ok = True
            for c in ['Tag', 'Description', 'FailureImp']:
                if c not in df_up.columns:
                    st.error(f"❌ Coluna '{c}' não encontrada."); colunas_ok = False
            
            if colunas_ok:
                if st.button("Processar e Classificar"):
                    with st.spinner("Processando..."):
                        df_up['FailureImp'] = df_up['FailureImp'].fillna('X')
                        df_up['Description'] = df_up['Description'].fillna('')
                        df_up['Tag'] = df_up['Tag'].fillna('N/A')
                        df_up['TEXTO_LIMPO'] = df_up['Description'].astype(str).apply(limpar_texto)
                        
                        p_mode = encoders['FailMode'].inverse_transform(modelos['FailMode'].predict(df_up))
                        p_det = encoders['DetMethod'].inverse_transform(modelos['DetMethod'].predict(df_up))
                        p_mech = encoders['FailMech'].inverse_transform(modelos['FailMech'].predict(df_up))
                        
                        df_up['Modo'] = [f"{x} - {map_mode.get(x, x)}" for x in p_mode]
                        df_up['Deteccao'] = [f"{x} - {map_det.get(x, x)}" for x in p_det]
                        df_up['Mecanismo'] = [f"{x} - {map_mech.get(x, x)}" for x in p_mech]
                        
                        st.dataframe(df_up.head())
                        st.download_button("Baixar CSV", df_up.to_csv(index=False, sep=';').encode('utf-8'), "resultado.csv", "text/csv")

                        st.markdown("---")
                        if st.button("📊 Adicionar esses dados ao Dashboard de Análise"):
                            novos_itens = []
                            for idx, row in df_up.iterrows():
                                imp_long = map_impacto_backend.get(row['FailureImp'], "Outros (X / None)")
                                novos_itens.append({
                                    "Tag": row['Tag'], "Descrição": row['Description'], "Impacto": imp_long,
                                    "Modo": row['Modo'], "Modo_Cod": p_mode[idx],
                                    "Detecção": row['Deteccao'], "Mecanismo": row['Mecanismo'],
                                    "Confiança": 0.90, 
                                    "Status": "IA (Em Massa)"
                                })
                            st.session_state.historico.extend(novos_itens)
                            st.success(f"{len(novos_itens)} itens adicionados ao Dashboard!")

        except Exception as e: st.error(f"Erro na leitura: {e}")

# === ABA 3: DASHBOARD ULTIMATE ===
with tab3:
    st.header("📊 Dashboard Analítico")
    
    if len(st.session_state.historico) > 0:
        df = pd.DataFrame(st.session_state.historico)
        
        st.markdown("##### 🔎 Filtros Globais")
        c_f1, c_f2 = st.columns(2)
        filtro_impacto = c_f1.multiselect("Filtrar por Impacto", options=df['Impacto'].unique(), default=df['Impacto'].unique())
        filtro_status = c_f2.multiselect("Filtrar por Status", options=df['Status'].unique(), default=df['Status'].unique())
        
        df_filtered = df[df['Impacto'].isin(filtro_impacto) & df['Status'].isin(filtro_status)]
        
        if df_filtered.empty:
            st.warning("Nenhum dado encontrado com esses filtros.")
        else:
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("Falhas Analisadas", len(df_filtered))
            n_critical = len(df_filtered[df_filtered['Impacto'].str.contains('Crítica', na=False)])
            k2.metric("Falhas Críticas (D)", n_critical)
            
            n_corrigido = len(df_filtered[df_filtered['Status'].str.contains('Humano', na=False)])
            perc_correction = n_corrigido / len(df_filtered) if len(df_filtered) > 0 else 0
            k3.metric("Taxa de Correção Humana", f"{perc_correction:.1%}")
            
            conf_avg = df_filtered[df_filtered['Status'] != 'Corrigido por Humano']['Confiança'].mean()
            k4.metric("Confiança Média IA", f"{float(conf_avg):.1%}" if pd.notnull(conf_avg) else "N/A")
            
            st.divider()
            
            g1, g2 = st.columns(2)
            with g1:
                st.subheader("Hierarquia: Impacto ➝ Modo")
                cores_impacto = {'D - Falha Crítica (Dead)': '#ff4b4b', 'S - Falha Degradada (Serious)': '#ffa421', 'U - Falha Incipiente (Unwell)': '#ffe312', 'Outros (X / None)': '#808495'}
                fig_sun = px.sunburst(
                    df_filtered, path=['Impacto', 'Modo_Cod'], 
                    title='Distribuição de Falhas (Impacto > Sigla Modo)',
                    color='Impacto', color_discrete_map=cores_impacto
                )
                st.plotly_chart(fig_sun, use_container_width=True)
                
            with g2:
                st.subheader("Mapa de Calor: Mecanismos")
                df_filtered['Mech_Clean'] = df_filtered['Mecanismo'].apply(lambda x: str(x).split(' - ', 1)[1] if ' - ' in str(x) else str(x))
                counts_mech = df_filtered['Mech_Clean'].value_counts().reset_index()
                counts_mech.columns = ['Mecanismo', 'Contagem']
                
                fig_tree = px.treemap(
                    counts_mech, path=['Mecanismo'], values='Contagem',
                    title='Mecanismos Mais Frequentes', color='Contagem', color_continuous_scale='Blues'
                )
                st.plotly_chart(fig_tree, use_container_width=True)
            
            g3, g4 = st.columns(2)
            with g3:
                st.subheader("🚨 Top 5 Equipamentos Críticos")
                top_tags = df_filtered['Tag'].value_counts().head(5).reset_index()
                top_tags.columns = ['Tag', 'Falhas']
                fig_tags = px.bar(top_tags, x='Falhas', y='Tag', orientation='h', text='Falhas')
                fig_tags.update_layout(yaxis={'categoryorder':'total ascending'})
                st.plotly_chart(fig_tags, use_container_width=True)
                
            with g4:
                st.subheader("Métodos de Detecção")
                df_filtered['Det_Clean'] = df_filtered['Detecção'].apply(lambda x: str(x).split(' - ', 1)[1] if ' - ' in str(x) else str(x))
                det_counts = df_filtered['Det_Clean'].value_counts().reset_index()
                det_counts.columns = ['Metodo', 'Qtd']
                fig_det = px.bar(det_counts, x='Metodo', y='Qtd', title='Detecção (Nome Completo)')
                st.plotly_chart(fig_det, use_container_width=True)
            
            st.subheader("📋 Tabela Detalhada")
            st.dataframe(
                df_filtered[['Tag', 'Impacto', 'Modo', 'Mecanismo', 'Status', 'Confiança']], 
                use_container_width=True,
                column_config={"Confiança": st.column_config.ProgressColumn("Confiança IA", format="%.2f", min_value=0, max_value=1)}
            )
            st.download_button("📥 Exportar Dados Filtrados", df_filtered.to_csv(index=False, sep=';').encode('utf-8'), "dashboard_completo.csv", "text/csv")

    else:
        st.info("⚠️ O Dashboard está vazio. Vá para a aba 'Classificador' ou 'Avaliação em Massa' para gerar dados.")

# === ABA 4: DICIONÁRIO ===
with tab4:
    st.markdown("### Consulta de Códigos")
    with st.expander("Modos de Falha"): st.table(pd.DataFrame(list(map_mode.items()), columns=['Cod', 'Desc']))
    with st.expander("Mecanismos"): st.table(pd.DataFrame(list(map_mech.items()), columns=['Cod', 'Desc']))
    with st.expander("Detecção"): st.table(pd.DataFrame(list(map_det.items()), columns=['Cod', 'Desc']))
