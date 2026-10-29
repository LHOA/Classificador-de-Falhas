"""
Failure Map API — classificador de falhas ISO 14224 (open source).

Serviço FastAPI que recebe a descrição de uma falha em texto livre e devolve
os 3 códigos mais prováveis em três eixos da taxonomia:
    - Modo de falha   (FailMode)
    - Mecanismo       (FailMech)
    - Método de detecção (DetMethod)

Sem autenticação, sem cota e sem dependência de banco externo: por padrão usa
SQLite local, criado automaticamente no primeiro uso.
"""

import os
import re
import sys
import threading
import time
import traceback
from datetime import datetime
from typing import List, Literal, Optional

import joblib
import nltk
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from nltk.corpus import stopwords
from pydantic import BaseModel
from sqlmodel import Field, Session, SQLModel, create_engine, select

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "modelo_classificacao_falhas.pkl")

# --- 1. BANCO DE DADOS (opcional) -------------------------------------------
# SQLite por padrão; aceita qualquer DATABASE_URL do SQLAlchemy (ex.: Postgres).
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./failuremap.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


# --- 2. MODELO DE DADOS ------------------------------------------------------
class FailureLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tag: str = Field(default="N/A", max_length=120)
    description: str = Field(max_length=4000)
    impact: str = Field(default="S", max_length=2)
    mode_code: str = Field(max_length=16)
    mode_desc: str = Field(max_length=200)
    mech_code: str = Field(max_length=16)
    mech_desc: str = Field(max_length=200)
    det_code: str = Field(max_length=16)
    det_desc: str = Field(max_length=200)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    status: str = Field(default="IA", max_length=16)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- 3. PRÉ-PROCESSAMENTO ----------------------------------------------------
try:
    nltk.data.find("corpora/stopwords")
except LookupError:
    nltk.download("stopwords", quiet=True)

stop_words = set(stopwords.words("portuguese"))


def limpar_texto(texto):
    """Normalização usada no treino: minúsculas, sem números, sem pontuação, sem stopwords.

    Atenção: NÃO remove acentos (o vocabulário do modelo foi treinado com acentos).
    """
    if not isinstance(texto, str):
        return ""
    texto = texto.lower()
    texto = re.sub(r"\d+", "", texto)
    texto = re.sub(r"[^\w\s]", "", texto)
    texto = " ".join(p for p in texto.split() if p not in stop_words)
    return texto


# --- 4. CARREGAMENTO DO MODELO ----------------------------------------------
print("Carregando modelo...", flush=True)
try:
    artefatos = joblib.load(MODEL_PATH)
    modelos = artefatos.get("modelos")
    encoders = artefatos.get("encoders")
    print("Modelo carregado!", flush=True)
except Exception as exc:  # pragma: no cover
    print(f"ERRO CRÍTICO AO CARREGAR MODELO: {exc}", file=sys.stderr)
    modelos = None
    encoders = None

# --- 5. DICIONÁRIOS ISO 14224 ------------------------------------------------
map_mech = {
    '1.0': 'General (Geral)',
    '1.1': 'Leakage (Vazamento)',
    '1.2': 'Vibration (Vibração)',
    '1.3': 'Clearance/alignment failure (Falha de folga/alinhamento)',
    '1.4': 'Deformation (Deformação)',
    '1.5': 'Looseness (Afrouxamento)',
    '1.6': 'Sticking (Emperramento/Travamento)',
    '1.7': 'Insulation damage (Dano no isolamento térmico/acústico)',
    '1.8': 'Degraded/insufficient support (Suporte degradado/insuficiente)',
    '1.9': 'Coating damage (Dano no revestimento/pintura)',
    '1.10': 'Damage to outer sheath (Dano na capa externa)',
    '1.11': 'Liquid filled annulus (Anular preenchido com líquido)',
    '1.12': 'Carcass collapse (Colapso da carcaça)',
    '1.13': 'Pullout of liner (Arrancamento do liner/camada interna)',
    '1.14': 'Defective flameproof joint, mechanical (Junta à prova de explosão defeituosa - mecânica)',
    '1.15': 'Defective enclosure/ IP (Invólucro defeituoso / Grau IP)',
    '2.0': 'General (Geral)',
    '2.1': 'Cavitation (Cavitação)',
    '2.2': 'Corrosion internal (Corrosão interna)',
    '2.3': 'Erosion (Erosão)',
    '2.4': 'Wear (Desgaste)',
    '2.5': 'Breakage (Quebra/Ruptura)',
    '2.6': 'Fatigue (Fadiga)',
    '2.7': 'Overheating (Superaquecimento)',
    '2.8': 'Burst (Estouro/Ruptura por pressão)',
    '2.9': 'Corrosion external (Corrosão externa)',
    '2.10': 'Crack (Trinca)',
    '2.11': 'Damage to flange (Dano no flange)',
    '2.12': 'Degraded bolting (Parafusos/Estojos degradados)',
    '2.13': 'Insufficient cathodic protection (Proteção catódica insuficiente)',
    '2.14': 'Chloride penetration (Penetração de cloretos)',
    '2.15': 'Damaged concrete (Concreto danificado)',
    '2.16': 'Defective flameproof joint, corrosion (Junta à prova de explosão defeituosa - corrosão)',
    '2.17': 'Natural Degradation (Degradação natural)',
    '2.20': 'Corrosion under insulation (Corrosão sob isolamento - CUI)',
    '2.21': 'Corrosion insulated bolts (Corrosão em parafusos isolados)',
    '3.0': 'General (Geral)',
    '3.1': 'Control failure (Falha de controle)',
    '3.2': 'No signal/indication/alarm (Sem sinal/indicação/alarme)',
    '3.3': 'Faulty signal/indication/alarm (Sinal/indicação/alarme defeituoso)',
    '3.4': 'Out of adjustment (Desajustado)',
    '3.5': 'Software failure (Falha de software)',
    '3.6': 'Common cause/mode failure (Falha de causa comum/modo comum)',
    '4.0': 'General (Geral)',
    '4.1': 'Short circuiting (Curto-circuito)',
    '4.2': 'Open circuit (Circuito aberto)',
    '4.3': 'No power/voltage (Sem energia/tensão)',
    '4.4': 'Faulty power/voltage (Energia/tensão defeituosa)',
    '4.5': 'Earth/isolation fault (Falha de terra/isolamento)',
    '4.6': 'Defective electrical connection (Conexão elétrica defeituosa)',
    '5.0': 'General (Geral)',
    '5.1': 'Blockage/plugged (Bloqueio/Entupimento)',
    '5.2': 'Contamination (Contaminação)',
    '5.3': 'Miscellaneous external influences (Influências externas diversas)',
    '5.4': 'Marine fouling (Incrustação marinha)',
    '5.5': 'Seabed erosion (Erosão do leito marinho)',
    '5.6': 'Free span (Vão livre)',
    '5.7': 'Detrimental contact (Contato prejudicial)',
    '5.8': 'Incorrect configuration (Configuração incorreta)',
    '5.9': 'Operation outside pressure and temp (Operação fora de pressão e temperatura)',
    '6.0': 'General (Geral)',
    '6.1': 'No cause found (Nenhuma causa encontrada)',
    '6.2': 'Combined causes (Causas combinadas)',
    '6.3': 'Other (Outro)',
    '6.4': 'Unknown (Desconhecido)',
    '6.5': 'Deviation from design (Desvio de projeto)',
    '11.0': 'Damage to outer sheath (Dano na capa externa) — rótulo 11.0 do dataset, provável 1.10',
}

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
    'POW': 'Insufficient power (Potência insuficiente)',
    'FTL': 'Failure to lock/unlock (Falha ao travar/destravar)',
    'FDC': 'Failure to disconnect (Falha ao desconectar)',
    '021': 'COM I/O module error (Erro de módulo I/O)',
    'SBU': 'Sludge build-up (Acúmulo de borra/lodo)',
    'NON': 'No immediate effect (Sem efeito imediato)',
    'SLL': 'Spurious low alarm level (Nível de alarme baixo espúrio)',
    'SCF': 'Secondary containment failure (Falha na contenção secundária)',
    'WCL': 'Well-to-control-line communication (Comunicação poço-linha de controle)',
    'CSF': 'Control / signal failure (Falha de controle/sinal)',
    'LRM': 'Loss of remote management (Perda de gerenciamento remoto)',
    'ISB': 'Information security breach (Violação de segurança da informação)',
    'ILP': 'Internal leakage - process medium (Vazamento interno - fluido de processo)',
    'EFA': 'Electronic failure (Falha eletrônica)',
    'UNS': 'Unspecified (Não especificado)',
}

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
    '10': 'Other (Outro)',
}

# --- 6. APP ------------------------------------------------------------------
app = FastAPI(
    title="Failure Map API",
    description="Classificação de falhas industriais (modo, mecanismo e detecção) a partir de texto livre, com taxonomia baseada na ISO 14224.",
    version="1.0.0",
    license_info={"name": "MIT"},
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


origens = os.environ.get("ALLOWED_ORIGINS", "*")
allow_origins = ["*"] if origens.strip() == "*" else [o.strip() for o in origens.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=None if allow_origins == ["*"] else r".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 6b. LIMITE DE REQUISIÇÕES ------------------------------------------------
# Proteção básica para uma API pública e sem autenticação: N requisições por
# minuto por IP nas rotas que consomem CPU (inferência) ou gravam no banco.
# 0 desativa o limite. Configure com RATE_LIMIT_PER_MIN.
RATE_LIMIT_PER_MIN = int(os.environ.get("RATE_LIMIT_PER_MIN", "60"))
_RATE_PATHS = {"/classificar", "/save-record", "/save-batch-records"}
_hits: dict[str, list[float]] = {}
_hits_lock = threading.Lock()


def _client_ip(request) -> str:
    # Atrás do Nginx o IP real vem em X-Forwarded-For; só confiamos nisso quando
    # a conexão vem do próprio host (proxy local).
    client = request.client.host if request.client else "?"
    if client in ("127.0.0.1", "::1"):
        encaminhado = request.headers.get("x-forwarded-for", "")
        if encaminhado:
            return encaminhado.split(",")[0].strip()
    return client


@app.middleware("http")
async def rate_limit(request, call_next):
    if request.url.path in _RATE_PATHS and RATE_LIMIT_PER_MIN > 0:
        ip = _client_ip(request)
        agora = time.time()
        with _hits_lock:
            janela = _hits.setdefault(ip, [])
            janela[:] = [t for t in janela if agora - t < 60]
            if len(janela) >= RATE_LIMIT_PER_MIN:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit excedido. Tente novamente em 1 minuto."},
                )
            janela.append(agora)
            if len(_hits) > 10000:  # poda simples para não crescer sem limite
                for chave in [k for k, v in _hits.items() if not v]:
                    _hits.pop(chave, None)
    return await call_next(request)


# --- 7. SCHEMAS --------------------------------------------------------------
class DadosEntrada(BaseModel):
    tag: str = Field(default="N/A", max_length=120)
    descricao: str = Field(min_length=1, max_length=4000)
    impacto: Literal["D", "S", "U", "X"] = "S"


class ItemClassificacao(BaseModel):
    codigo: str
    descricao: str
    confianca: float


class RespostaAPI(BaseModel):
    modo: List[ItemClassificacao]
    deteccao: List[ItemClassificacao]
    mecanismo: List[ItemClassificacao]
    texto_processado: str


# --- 8. ENDPOINTS ------------------------------------------------------------
@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "app": "Failure Map API"}


@app.get("/health", tags=["Health"])
def healthz():
    return {"status": "ok", "model_loaded": modelos is not None}


@app.get("/model-info", tags=["Modelo"])
def model_info():
    if modelos is None:
        raise HTTPException(status_code=503, detail="Modelo não carregado")
    pre = modelos["FailMode"].named_steps["preprocessor"]
    clf = modelos["FailMode"].named_steps["classifier"]
    tfidf = pre.transformers_[0][1]
    onehot = pre.transformers_[1][1]
    return {
        "modelo": "XGBoost (um classificador por eixo)",
        "classes": {k: len(v.classes_) for k, v in encoders.items()},
        "features": int(clf.n_features_in_),
        "tfidf_max_features": int(tfidf.max_features),
        "categ_columns": list(onehot.feature_names_in_) if hasattr(onehot, "feature_names_in_") else [],
        "n_estimators": int(clf.n_estimators),
        "random_state": int(clf.random_state or 42),
    }


def _top3(coluna, dicionario_map, df_input):
    probs = modelos[coluna].predict_proba(df_input)[0]
    top3 = np.argsort(probs)[-3:][::-1]
    itens = []
    for idx in top3:
        cod = str(encoders[coluna].inverse_transform([idx])[0])
        itens.append(
            ItemClassificacao(
                codigo=cod,
                descricao=dicionario_map.get(cod, cod),
                confianca=float(probs[idx]),
            )
        )
    return itens


@app.post("/classificar", response_model=RespostaAPI, tags=["Classificação"])
def classificar_falha(dados: DadosEntrada):
    if modelos is None or encoders is None:
        raise HTTPException(status_code=503, detail="ML Service Unavailable")

    df_input = pd.DataFrame(
        {"Tag": [dados.tag], "FailureImp": [dados.impacto], "Description": [dados.descricao]}
    )
    df_input["TEXTO_LIMPO"] = limpar_texto(dados.descricao)

    try:
        return {
            "modo": _top3("FailMode", map_mode, df_input),
            "deteccao": _top3("DetMethod", map_det, df_input),
            "mecanismo": _top3("FailMech", map_mech, df_input),
            "texto_processado": df_input["TEXTO_LIMPO"].iloc[0],
        }
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {exc}")


@app.post("/save-record", tags=["Histórico"])
def save_failure_record(record: FailureLog):
    with Session(engine) as session:
        session.add(record)
        session.commit()
        session.refresh(record)
        return {"status": "success", "id": record.id}


@app.post("/save-batch-records", tags=["Histórico"])
def save_batch_records(records: List[FailureLog]):
    with Session(engine) as session:
        session.add_all(records)
        session.commit()
        return {"status": "success", "count": len(records)}


@app.get("/history", tags=["Histórico"])
def get_history(limit: int = 50):
    lim = max(1, min(limit, 500))
    with Session(engine) as session:
        stmt = select(FailureLog).order_by(FailureLog.created_at.desc()).limit(lim)
        return session.exec(stmt).all()
