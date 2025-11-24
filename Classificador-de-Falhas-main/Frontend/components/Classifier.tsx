import React, { useState } from 'react';
import { MAP_IMPACTO, MAP_MECH, MAP_MODE, MAP_DET } from '../constants';
import { classificarFalha } from '../services/aiService';
import { RespostaAPI, FailureRecord } from '../types';
import { Zap, Save, Edit2, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ClassifierProps {
  onSave: (record: FailureRecord) => void;
}

const Classifier: React.FC<ClassifierProps> = ({ onSave }) => {
  const { language, t } = useLanguage();

  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('D');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RespostaAPI | null>(null);
  
  // Agora armazenamos a SELEÇÃO DO USUÁRIO (pode ser a 1ª, 2ª ou 3ª da IA)
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedMech, setSelectedMech] = useState('');
  const [selectedDet, setSelectedDet] = useState('');

  const getLabel = (map: any, code: string) => {
    if (!code || !map[code]) return code;
    return map[code][language];
  };

  const handleClassify = async () => {
    if (!description) return;
    setIsLoading(true);
    try {
      const aiResult = await classificarFalha({
        tag: tag,
        descricao: description,
        impacto: impact
      });
      
      setResult(aiResult);
      
      // Por padrão, seleciona a Top 1 (índice 0)
      setSelectedMode(aiResult.modo[0].codigo);
      setSelectedMech(aiResult.mecanismo[0].codigo);
      setSelectedDet(aiResult.deteccao[0].codigo);

    } catch (e) {
      console.error(e);
      alert("Erro ao conectar com a IA.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;

    // Verifica se a escolha atual bate com a Top 1 da IA
    const modeIsTop1 = selectedMode === result.modo[0].codigo;
    const mechIsTop1 = selectedMech === result.mecanismo[0].codigo;
    const detIsTop1 = selectedDet === result.deteccao[0].codigo;
    const isHumanModified = !modeIsTop1 || !mechIsTop1 || !detIsTop1;

    // Encontra a confiança da opção que o usuário escolheu (seja a 1ª, 2ª ou 3ª)
    const getConf = (list: any[], code: string) => {
       const item = list.find(x => x.codigo === code);
       return item ? item.confianca : 1.0; // Se não achar (edição manual total), assume 100%
    };

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

  // Componente Reutilizável de Dropdown Inteligente
  const AIDropdown = ({ 
    label, 
    value, 
    onChange, 
    optionsAI, 
    mapDictionary 
  }: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    optionsAI: any[], 
    mapDictionary: any 
  }) => {
    
    // Pega o item selecionado para mostrar a confiança dele
    const selectedItemAI = optionsAI.find(opt => opt.codigo === value);
    const confidenceDisplay = selectedItemAI 
      ? (selectedItemAI.confianca * 100).toFixed(1) + '%' 
      : 'Manual';

    return (
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-700 uppercase">{label}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            confidenceDisplay === 'Manual' ? 'bg-slate-200 text-slate-600' : 
            parseFloat(confidenceDisplay) > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {confidenceDisplay} Conf.
          </span>
        </div>
        
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none p-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
          >
            {/* Opções da IA (Top 3) */}
            <optgroup label="Sugestões da IA (Ranking)">
              {optionsAI.map((opt, idx) => (
                <option key={opt.codigo} value={opt.codigo}>
                  #{idx + 1}: {getLabel(mapDictionary, opt.codigo)} ({ (opt.confianca * 100).toFixed(0) }%)
                </option>
              ))}
            </optgroup>
            
            {/* Todas as outras opções (Caso o usuário queira mudar totalmente) */}
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
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">{t('label_tag')}</label>
               <input type="text" className={inputClass} value={tag} onChange={e => setTag(e.target.value)} placeholder={t('placeholder_tag')} />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">{t('label_impact')}</label>
               <select className={inputClass} value={impact} onChange={e => setImpact(e.target.value)}>
                 {Object.entries(MAP_IMPACTO).map(([k, v]: any) => <option key={k} value={k}>{v[language]}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">{t('label_desc')}</label>
               <textarea className={`${inputClass} h-32 resize-none`} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('placeholder_desc')} />
             </div>
             <button onClick={handleClassify} disabled={!description || isLoading} className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 ${!description || isLoading ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'}`}>
                {isLoading ? t('btn_analyzing') : <><Zap className="w-5 h-5" />{t('btn_analyze')}</>}
             </button>
          </div>
        </div>
      </div>

      {/* Coluna da Direita (Resultados com Dropdown) */}
      <div className="lg:col-span-7">
        {result ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-500" /> {t('results_title')}
              </h3>
            </div>

            <div className="space-y-4 flex-1">
              <AIDropdown 
                label={t('label_mode')} 
                value={selectedMode} 
                onChange={setSelectedMode} 
                optionsAI={result.modo} 
                mapDictionary={MAP_MODE} 
              />
              <AIDropdown 
                label={t('label_mech')} 
                value={selectedMech} 
                onChange={setSelectedMech} 
                optionsAI={result.mecanismo} 
                mapDictionary={MAP_MECH} 
              />
              <AIDropdown 
                label={t('label_det')} 
                value={selectedDet} 
                onChange={setSelectedDet} 
                optionsAI={result.deteccao} 
                mapDictionary={MAP_DET} 
              />
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button onClick={handleSave} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg">
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
