import pandas as pd
import joblib
import re
import nltk
from nltk.corpus import stopwords
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os

# --- CONFIGURAÇÃO INICIAL ---
app = FastAPI(title="API Classificador de Falhas")

# --- CARREGAR MODELO ---
# Carrega o modelo apenas uma vez na inicialização para ser rápido
try:
    artefatos = joblib.load('modelo_classificacao_falhas.pkl')
    modelos = artefatos['modelos']
    encoders = artefatos['encoders']
except Exception as e:
    raise RuntimeError(f"Erro ao carregar modelo. Verifique se 'modelo_classificacao_falhas.pkl' está na pasta. Erro: {e}")

# --- CONFIGURAÇÃO NLTK ---
try:
    nltk.data.find('corpora/stopwords')
    stop_words = set(stopwords.words('portuguese'))
except LookupError:
    nltk.download('stopwords')
    stop_words = set(stopwords.words('portuguese'))

# --- FUNÇÕES ÚTEIS ---
def limpar_texto(texto):
    if not isinstance(texto, str):
        return ""
    texto = texto.lower()
    texto = re.sub(r'\d+', '', texto)
    texto = re.sub(r'[^\w\s]', '', texto)
    texto = ' '.join([palavra for palavra in texto.split() if palavra not in stop_words])
    return texto

# --- DICIONÁRIOS DE MAPEAMENTO (Copiados do seu app.py) ---
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

# --- MODELOS DE DADOS PARA A API ---
class DadosEntrada(BaseModel):
    tag: str = "N/A"
    descricao: str
    impacto: str # Espera receber "D", "S", "U" ou "X"

class ResultadoClassificacao(BaseModel):
    codigo: str
    descricao: str
    confianca: float

class RespostaAPI(BaseModel):
    modo: ResultadoClassificacao
    deteccao: ResultadoClassificacao
    mecanismo: ResultadoClassificacao
    texto_processado: str

# --- ROTA DE CLASSIFICAÇÃO ---
@app.post("/classificar", response_model=RespostaAPI)
def classificar_falha(dados: DadosEntrada):
    # 1. Preparar DataFrame como o modelo espera
    df_input = pd.DataFrame({
        'Tag': [dados.tag],
        'FailureImp': [dados.impacto],
        'Description': [dados.descricao]
    })
    
    # 2. Limpeza de texto
    df_input['TEXTO_LIMPO'] = df_input['Description'].apply(limpar_texto)
    
    try:
        # 3. Predição (Pega a de maior probabilidade)
        def prever_top1(coluna, dicionario_map):
            probs = modelos[coluna].predict_proba(df_input)[0]
            idx_max = probs.argmax()
            codigo = encoders[coluna].inverse_transform([idx_max])[0]
            confianca = float(probs[idx_max])
            texto_desc = dicionario_map.get(codigo, codigo)
            return {"codigo": codigo, "descricao": texto_desc, "confianca": confianca}

        res_mode = prever_top1('FailMode', map_mode)
        res_det = prever_top1('DetMethod', map_det)
        res_mech = prever_top1('FailMech', map_mech)

        return {
            "modo": res_mode,
            "deteccao": res_det,
            "mecanismo": res_mech,
            "texto_processado": df_input['TEXTO_LIMPO'].iloc[0]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno na predição: {str(e)}")

# --- ROTA DE SAÚDE (Para testar se está on) ---
@app.get("/")
def health_check():
    return {"status": "ok", "mensagem": "API Classificador ISO 14224 está rodando"}
