import pandas as pd
import joblib
import re
import nltk
import numpy as np
import os
import sys
import traceback
from nltk.corpus import stopwords
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Session, create_engine, select

# --- 1. CONFIGURAÇÃO DO BANCO DE DADOS ---
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("AVISO: DATABASE_URL não encontrada.")
    engine = None
else:
    engine = create_engine(DATABASE_URL.replace("postgres://", "postgresql+psycopg2://"), echo=False)

def create_db_and_tables():
    if engine:
        SQLModel.metadata.create_all(engine)

def get_session():
    if not engine:
        raise HTTPException(status_code=500, detail="Banco de dados não configurado.")
    with Session(engine) as session:
        yield session

# --- MODELO DE USO (ATUALIZADO COM PREMIUM) ---
class UserUsage(SQLModel, table=True):
    email: str = Field(primary_key=True)
    name: str
    individual_count: int = Field(default=0)
    batch_count: int = Field(default=0)
    total_evaluations: int = Field(default=0)
    # NOVO CAMPO: Define se o usuário tem acesso ilimitado
    is_premium: bool = Field(default=False)
    registered_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    last_use_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

# --- 2. FUNÇÕES DE TEXTO E CARREGAMENTO ---
try:
    nltk.data.find('corpora/stopwords')
    stop_words = set(stopwords.words('portuguese'))
except LookupError:
    nltk.download('stopwords')
    stop_words = set(stopwords.words('portuguese'))

def limpar_texto(texto):
    if not isinstance(texto, str): return ""
    texto = texto.lower()
    texto = re.sub(r'\d+', '', texto)
    texto = re.sub(r'[^\w\s]', '', texto)
    texto = ' '.join([palavra for palavra in texto.split() if palavra not in stop_words])
    return texto

# Carregamento
modelos = None
encoders = None
try:
    artefatos = joblib.load('modelo_classificacao_falhas.pkl')
    modelos = artefatos.get('modelos')
    encoders = artefatos.get('encoders')
except Exception as e:
    print(f"ERRO CRÍTICO AO CARREGAR MODELO: {e}", file=sys.stderr)

# Dicionários
map_mech = {
    '1.0': 'General (Geral)', '1.1': 'Leakage (Vazamento)', '1.2': 'Vibration (Vibração)', '1.3': 'Clearance/alignment failure (Falha de folga/alinhamento)', '1.4': 'Deformation (Deformação)', '1.5': 'Looseness (Afrouxamento)', '1.6': 'Sticking (Emperramento/Travamento)', '1.7': 'Insulation damage (Dano no isolamento térmico/acústico)', '1.8': 'Degraded/insufficient support (Suporte degradado/insuficiente)', '1.9': 'Coating damage (Dano no revestimento/pintura)', '1.10': 'Damage to outer sheath (Dano na capa externa)', '1.11': 'Liquid filled annulus (Anular preenchido com líquido)', '1.12': 'Carcass collapse (Colapso da carcaça)', '1.13': 'Pullout of liner (Arrancamento do liner/camada interna)', '1.14': 'Defective flameproof joint, mechanical (Junta à prova de explosão defeituosa - mecânica)', '1.15': 'Defective enclosure/ IP (Invólucro defeituoso / Grau IP)', '2.0': 'General (Geral)', '2.1': 'Cavitation (Cavitação)', '2.2': 'Corrosion internal (Corrosão interna)', '2.3': 'Erosion (Erosão)', '2.4': 'Wear (Desgaste)', '2.5': 'Breakage (Quebra/Ruptura)', '2.6': 'Fatigue (Fadiga)', '2.7': 'Overheating (Superaquecimento)', '2.8': 'Burst (Estouro/Ruptura por pressão)', '2.9': 'Corrosion external (Corrosão externa)', '2.10': 'Crack (Trinca)', '2.11': 'Damage to flange (Dano no flange)', '2.12': 'Degraded bolting (Parafusos/Estojos degradados)', '2.13': 'Insufficient cathodic protection (Proteção catódica insuficiente)', '2.14': 'Chloride penetration (Penetração de cloretos)', '2.15': 'Damaged concrete (Concreto danificado)', '2.16': 'Defective flameproof joint, corrosion (Junta à prova de explosão defeituosa - corrosão)', '2.17': 'Natural Degradation (Degradação natural)', '2.20': 'Corrosion under insulation (Corrosão sob isolamento - CUI)', '2.21': 'Corrosion insulated bolts (Corrosão em parafusos isolados)', '3.0': 'General (Geral)', '3.1': 'Control failure (Falha de controle)', '3.2': 'No signal/indication/alarm (Sem sinal/indicação/alarme)', '3.3': 'Faulty signal/indication/alarm (Sinal/indicação/alarme defeituoso)', '3.4': 'Out of adjustment (Desajustado)', '3.5': 'Software failure (Falha de software)', '3.6': 'Common cause/mode failure (Falha de causa comum/modo comum)', '4.0': 'General (Geral)', '4.1': 'Short circuiting (Curto-circuito)', '4.2': 'Open circuit (Circuito aberto)', '4.3': 'No power/voltage (Sem energia/tensão)', '4.4': 'Faulty power/voltage (Energia/tensão defeituosa)', '4.5': 'Earth/isolation fault (Falha de terra/isolamento)', '4.6': 'Defective electrical connection (Conexão elétrica defeituosa)', '5.0': 'General (Geral)', '5.1': 'Blockage/plugged (Bloqueio/Entupimento)', '5.2': 'Contamination (Contaminação)', '5.3': 'Miscellaneous external influences (Influências externas diversas)', '5.4': 'Marine fouling (Incrustação marinha)', '5.5': 'Seabed erosion (Erosão do leito marinho)', '5.6': 'Free span (Vão livre)', '5.7': 'Detrimental contact (Contato prejudicial)', '5.8': 'Incorrect configuration (Configuração incorreta)', '5.9': 'Operation outside pressure and temp (Operação fora de pressão e temperatura)', '6.0': 'General (Geral)', '6.1': 'No cause found (Nenhuma causa encontrada)', '6.2': 'Combined causes (Causas combinadas)', '6.3': 'Other (Outro)', '6.4': 'Unknown (Desconhecido)', '6.5': 'Deviation from design (Desvio de projeto)'
}
map_det = {
    '1': 'Periodic maintenance (Manutenção Periódica)', '2': 'Functional testing (Teste Funcional)', '3': 'Inspection (Inspeção)', '4': 'Periodic condition monitoring (Monitoramento de condição periódico)', '5': 'Continuous condition monitoring (Monitoramento de condição contínuo)', '6': 'Production interference (Interferência na produção)', '7': 'Casual observation (Observação casual)', '8': 'Corrective maintenance (Manutenção corretiva)', '9': 'On demand (Sob demanda)', '10': 'Other (Outro)'
}
map_mode = {
    'OTH': 'Other (Outros)', 'ELP': 'External leakage - process medium (Vazamento externo - meio de processo)', 'BRD': 'Breakdown (Quebra/Colapso)', 'ELU': 'External leakage - utility medium (Vazamento externo - utilidades)', 'FTI': 'Failure to function as intended (Falha na função pretendida)', 'FTO': 'Failure to open on demand (Falha ao abrir sob demanda)', 'LCP': 'Leakage in close position (Vazamento na posição fechada)', 'DOP': 'Delayed operation (Operação atrasada)', 'LOO': 'Low output (Saída baixa)', 'PDE': 'Parameter deviation (Desvio de parâmetro)', 'FTF': 'Failure to function on demand (Falha ao funcionar sob demanda)', 'STD': 'Structural Deficiency (Deficiência Estrutural)', 'DEX': 'Defective EX Protection (Proteção EX defeituosa)', 'FTS': 'Failure to start on demand (Falha ao partir sob demanda)', 'FTC': 'Failure to close on demand (Falha ao fechar sob demanda)', 'LOP': 'Loss Of Power (Perda de Potência/Energia)', 'STP': 'Failure to stop on demand (Falha ao parar sob demanda)', 'SLP': 'Slippage (Deslizamento/Patinação)', 'PLU': 'Plugged / Choked (Entupido/Obstruído)', 'OHE': 'Overheating (Superaquecimento)', 'IHT': 'Insufficient heat transfer (Transferência de calor insuficiente)', 'CTD': 'Contact danger / Electric shock (Perigo de contato / Choque elétrico)', 'LOA': 'Load drop (Queda de carga)', 'EXP': 'Overpressure/Explosion (Sobrepressão/Explosão)', 'VIB': 'Vibration (Vibração)', 'INL': 'Internal leakage (Vazamento interno)', 'LOR': 'Loss of redundancy (Perda de redundância)', 'AOL': 'Abnormal output - low (Saída anormal - baixa)', 'HIO': 'High output (Saída alta)', 'FOV': 'Faulty output voltage (Tensão de saída defeituosa)', 'NAC': 'Not acceptable alarm condition (Condição de alarme não aceitável)', 'ELF': 'External leakage - fuel (Vazamento externo - combustível)', 'OSR': 'Overload/slow response/system warning (Sobrecarga/resposta lenta/aviso)', 'STC': 'Struct. deficiency containment risk (Deficiência estrutural - risco de contenção)', 'UST': 'Spurious stop (Parada espúria)', 'AIR': 'Abnormal instrument reading (Leitura anormal de instrumento)', 'SER': 'Minor in-service problems (Pequenos problemas em serviço)', 'FCO': 'Failure to connect (Falha ao conectar)', 'ERO': 'Erratic output (Saída errática)', 'NOI': 'Noise (Ruído)', 'SPO': 'Spurious operation (Operação espúria)', 'UNK': 'Unknown (Desconhecido)', 'SHH': 'Spurious high alarm level (Nível de alarme alto espúrio)', 'NOO': 'No output (Sem saída)', 'FRO': 'Failure to rotate (Falha ao rotacionar)', 'PTF': 'Power / signal transmission failure (Falha de transmissão de energia/sinal)', 'POW': 'Insufficient power (Potência insuficiente)', 'FTL': 'Failure to lock/unlock (Falha ao travar/destravar)', 'FDC': 'Failure to disconnect (Falha ao desconectar)', '021': 'COM I/O module error (Erro de módulo I/O)', 'SBU': 'Sludge build-up (Acúmulo de borra/lodo)', 'NON': 'No immediate effect (Sem efeito imediato)', 'SLL': 'Spurious low alarm level (Nível de alarme baixo espúrio)', 'SCF': 'Secondary containment failure (Falha na contenção secundária)', 'WCL': 'Well-to-control-line communication (Comunicação poço-linha de controle)', 'CSF': 'Control / signal failure (Falha de controle/sinal)', 'LRM': 'Loss of remote management (Perda de gerenciamento remoto)', 'ISB': 'Information security breach (Violação de segurança da informação)', 'ILP': 'Internal leakage - process medium (Vazamento interno - fluido de processo)', 'EFA': 'Electronic failure (Falha eletrônica)'
}

# --- 3. CONFIGURAÇÃO APP ---
app = FastAPI(title="API Classificador de Falhas")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. MODELOS E ENDPOINTS ---
class DadosEntrada(BaseModel):
    tag: str = "N/A"
    descricao: str
    impacto: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None

class ItemClassificacao(BaseModel):
    codigo: str
    descricao: str
    confianca: float

class RespostaAPI(BaseModel):
    modo: List[ItemClassificacao]
    deteccao: List[ItemClassificacao]
    mecanismo: List[ItemClassificacao]
    texto_processado: str

class UserRegistration(BaseModel):
    email: str
    name: str

class BatchProcessRequest(BaseModel):
    user_email: Optional[str] = None
    batch_size: int = 10

# Endpoint: Registro
@app.post("/register", tags=["Quota"])
def register_user(user: UserRegistration, session: Session = Depends(get_session)):
    user_db = session.get(UserUsage, user.email)
    if user_db:
        return {"status": "success", "message": "User registered.", "total_uses": user_db.total_evaluations}
    
    new_user = UserUsage(email=user.email, name=user.name)
    session.add(new_user)
    session.commit()
    return {"status": "success", "message": "Registered.", "total_uses": 0}

# Endpoint: Classificar
@app.post("/classificar", response_model=RespostaAPI)
def classificar_falha(dados: DadosEntrada, session: Session = Depends(get_session)):
    
    user_db = None
    if dados.user_email:
        user_db = session.get(UserUsage, dados.user_email)
        # --- CHECK PREMIUM E QUOTA ---
        # MUDANÇA AQUI: Aumentado para 30
        if user_db and (not user_db.is_premium) and user_db.total_evaluations >= 30:
            raise HTTPException(status_code=403, detail="QUOTA_EXCEEDED")

    if modelos is None or encoders is None:
        raise HTTPException(status_code=503, detail="ML Service Unavailable")

    df_input = pd.DataFrame({
        'Tag': [dados.tag], 'FailureImp': [dados.impacto], 'Description': [dados.descricao]
    })
    df_input['TEXTO_LIMPO'] = limpar_texto(dados.descricao)

    try:
        # --- FUNÇÃO PREVER_TOP3 CORRIGIDA ---
        def prever_top3(coluna, dicionario_map):
            probs = modelos[coluna].predict_proba(df_input)[0]
            top3_idxs = np.argsort(probs)[-3:][::-1]
            res = []
            for idx in top3_idxs:
                # Obtém o código numérico do encoder
                cod_numerico = encoders[coluna].inverse_transform([idx])[0]
                
                # --- CORREÇÃO AQUI: Converte int64 para string ---
                cod_str = str(cod_numerico)
                
                conf = float(probs[idx])
                # Usa a string para buscar no dicionário
                txt = dicionario_map.get(cod_str, cod_str)
                res.append({"codigo": cod_str, "descricao": txt, "confianca": conf})
            return res
        # ------------------------------------

        res_mode = prever_top3('FailMode', map_mode)
        res_det = prever_top3('DetMethod', map_det)
        res_mech = prever_top3('FailMech', map_mech)

        if user_db:
            user_db.individual_count += 1
            user_db.total_evaluations += 1
            user_db.last_use_at = datetime.utcnow()
            session.add(user_db)
            session.commit()

        return {
            "modo": res_mode, "deteccao": res_det, "mecanismo": res_mech,
            "texto_processado": df_input['TEXTO_LIMPO'].iloc[0]
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# Endpoint: Batch Check
@app.post("/batch-process")
def process_batch_check(request: BatchProcessRequest, session: Session = Depends(get_session)):
    if not request.user_email:
        raise HTTPException(status_code=401, detail="Login required")
    
    user_db = session.get(UserUsage, request.user_email)
    if not user_db:
        raise HTTPException(status_code=401, detail="User not found")
        
    # --- CHECK PREMIUM E QUOTA (BATCH) ---
    # MUDANÇA AQUI: Aumentado para 30 e adicionado 'pass' com indentação
    if (not user_db.is_premium) and (user_db.total_evaluations + request.batch_size > 30):
        # raise HTTPException(status_code=403, detail="QUOTA_EXCEEDED")
        pass # <-- Indentação corrigida (4 espaços)

    user_db.batch_count += 1
    user_db.total_evaluations += request.batch_size
    user_db.last_use_at = datetime.utcnow()
    session.add(user_db)
    session.commit()
    return {"status": "ok"}

@app.get("/")
def health(): return {"status": "ok"}

