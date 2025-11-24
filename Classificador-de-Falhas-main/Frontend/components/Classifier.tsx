import React, { useState } from 'react';
import { MAP_IMPACTO, MAP_MECH, MAP_MODE, MAP_DET } from '../constants';
import { classificarFalha } from '../services/aiService';
import { RespostaAPI, FailureRecord } from '../types';
import { Zap, Save, Edit2, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ClassifierProps {
  onSave: (record: FailureRecord) => void;
  // NOVAS PROPS para gerenciar o fluxo de quota
  onShowRegister: () => void; // Chama o modal de registro
  onShowLimitReached: () => void; // Chama a mensagem de limite atingido
  isQuotaEnforced: boolean; // Flag que o pai passa para desabilitar o botão se o limite foi atingido
}

const Classifier: React.FC<ClassifierProps> = ({ onSave, onShowRegister, onShowLimitReached, isQuotaEnforced }) => {
  const { language, t } = useLanguage();

  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('D');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RespostaAPI | null>(null);
  
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedMech, setSelectedMech] = useState('');
  const [selectedDet, setSelectedDet] = useState('');

  const getLabel = (map: any, code: string) => {
    if (!code || !map[code]) return code;
    // @ts-ignore
    return map[code][language];
  };

  // --- LÓGICA DE CLASSIFICAÇÃO ATUALIZADA ---
  const handleClassify = async () => {
    if (!description || isLoading) return;

    setIsLoading(true);
    setResult(null); 
    
    try {
      const aiResult = await classificarFalha({
        tag: tag,
        descricao: description,
        impacto: impact
      });
      
      setResult(aiResult);
      
      setSelectedMode(aiResult.modo[0].codigo);
      setSelectedMech(aiRes.mecanismo[0].codigo);
      setSelectedDet(aiRes.deteccao[0].codigo);

    } catch (e: any) {
        // --- NOVO TRATAMENTO DE ERROS DE QUOTA ---
        if (e.message === "ANON_LIMIT_REACHED") {
            // Atingiu o limite anônimo (5), mas ainda não é erro 403
            onShowRegister(); 
        } else if (e.message === "QUOTA_EXCEEDED") {
            // Limite de 10 usos atingido (erro 403 do backend)
            onShowLimitReached(); 
        } else {
            console.error("API Error:", e);
            alert(`Erro na Classificação. Verifique sua conexão. (${e.message})`);
        }
    } finally {
      setIsLoading(false);
    }
  };
  // ... (restante do código handleSave e AIDropdown) ...
  
  const handleSave = () => {
    if (!result) return;

    const getConf = (list: any[], code: string) => {
       const item = list.find(x => x.codigo === code);
       return item ? item.confianca : 1.0; 
    };

    const modeIsTop1 = selectedMode === result.modo[0].codigo;
    const mechIsTop1 = selectedMech === result.mecanismo[0].codigo;
    const detIsTop1 = selectedDet === result.deteccao[0].codigo;
    const isHumanModified = !modeIsTop1 || !mechIsTop1 || !detIsTop1;

    const newRecord: FailureRecord = {
      id: Date.now().toString(),
      tag: tag || 'N/A',
      description,
      impactCode: impact,
      impact: getLabel(MAP_IMPACTO, impact),
      
      modeCode: selectedMode,
      mode: getLabel(MAP_MODE, selectedMode),
      confidenceMode: getConf(result.modo, selectedMode),

      mechanismCode: selectedMech,
      mechanism: getLabel(MAP_MECH, selectedMech),
      confidenceMech: getConf(result.mecanismo, selectedMech),

      detectionCode: selectedDet,
      detection: getLabel(MAP_DET, selectedDet),
      confidenceDet: getConf(result.deteccao, selectedDet),

      confidence: isHumanModified ? 1.0 : result.modo[0].confianca,
      status: isHumanModified ? 'Human' : 'IA',
      timestamp: new Date()
    };

    onSave(newRecord);
    setTag(''); setDescription(''); setResult(null);
  };
  
  const AIDropdown = ({ label, value, onChange, optionsAI, mapDictionary }: { label: string, value: string, onChange: (val: string) => void, optionsAI: any[], mapDictionary: any }) => {
    const selectedItemAI = optionsAI.find(opt => opt.codigo === value);
    const confidenceDisplay = selectedItemAI 
      ? (selectedItemAI.confianca * 100).toFixed(1) + '%' 
      : 'Manual';

    return (
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-700 uppercase">{label}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${confidenceDisplay === 'Manual' ? 'bg-slate-200 text-slate-600' : parseFloat(confidenceDisplay) > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {confidenceDisplay} Conf.
          </span>
        </div>
        
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none p-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
          >
            <optgroup label={t('results_title')}>
              {optionsAI.map((opt, idx) => (
                <option key={opt.codigo} value={opt.codigo}>
                  #{idx + 1}: {getLabel(mapDictionary, opt.codigo)} ({ (opt.confianca * 100).toFixed(0) }%)
                </option>
              ))}
            </optgroup>
            
            <optgroup label="Outras Opções">
              {Object.entries(mapDictionary)
                .filter(([k]) => !optionsAI.find(opt => opt.codigo === k))
                .map(([k, v]: any) => (
                  <option key={k} value={k}>{v[language]}</option>
              ))}
            </optgroup>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
      </div>
    );
  };

  const inputClass = "w-full p-2.5 bg-slate-50 border border-slate-400 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none";

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Coluna da Esquerda (Input) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-indigo-600" /> {t('input_title')}
          </h3>
          <div className="space-y-4">
             <input type="text" className={inputClass} value={tag} onChange={e => setTag(e.target.value)} placeholder={t('placeholder_tag')} />
             <select className={inputClass} value={impact} onChange={e => setImpact(e.target.value)}>{Object.entries(MAP_IMPACTO).map(([k, v]: any) => <option key={k} value={k}>{v[language]}</option>)}</select>
             <textarea className={`${inputClass} h-32 resize-none`} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('placeholder_desc')} />

             {/* BOTÃO DE CLASSIFICAÇÃO */}
             <button 
               onClick={handleClassify} 
               disabled={!description || isLoading || isQuotaEnforced} 
               className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 ${!description || isLoading || isQuotaEnforced ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'}`}
             >
                {isLoading ? t('btn_analyzing') : <><Zap className="w-5 h-5" />{t('btn_analyze')}</>}
             </button>
             
             {isQuotaEnforced && (
                 <p className="text-sm font-bold text-red-500 text-center">
                     Limite de uso atingido.
                 </p>
             )}
          </div>
        </div>
      </div>

      {/* Coluna da Direita (Resultados) */}
      <div className="lg:col-span-7">
        {result ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-500" /> {t('results_title')}
              </h3>
            </div>

            <div className="space-y-4 flex-1">
              <AIDropdown label={t('label_mode')} value={selectedMode} onChange={setSelectedMode} optionsAI={result.modo} mapDictionary={MAP_MODE} />
              <AIDropdown label={t('label_mech')} value={selectedMech} onChange={setSelectedMech} optionsAI={result.mecanismo} mapDictionary={MAP_MECH} />
              <AIDropdown label={t('label_det')} value={selectedDet} onChange={setSelectedDet} optionsAI={result.deteccao} mapDictionary={MAP_DET} />
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button onClick={handleSave} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg">
                <Save className="w-5 h-5" /> {t('btn_save')}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-8">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Zap className="w-8 h-8 text-slate-300" /></div>
             <p>{t('waiting_title')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Classifier;
