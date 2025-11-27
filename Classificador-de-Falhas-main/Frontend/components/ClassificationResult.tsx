// src/components/ClassificationResult.tsx (NOVO ARQUIVO)
import React from 'react';
import { CheckCircle, Save, X, Activity, Settings, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { RespostaAPI } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET } from '../constants';

interface ClassificationResultProps {
  result: RespostaAPI;
  onSave: () => void;
  onCancel: () => void;
}

const ClassificationResult: React.FC<ClassificationResultProps> = ({ result, onSave, onCancel }) => {
  const { t, language } = useLanguage();

  const getLabel = (map: any, code: string) => {
    if (!map || !code) return code;
    if (map[code] && map[code][language]) {
        return map[code][language];
    }
    return code;
  };

  const ResultCard = ({ title, icon: Icon, data, map, colorClass }: any) => {
    const topResult = data[0];
    const confidence = (topResult.confianca * 100).toFixed(1);
    const label = getLabel(map, topResult.codigo);

    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-2 ${colorClass} bg-opacity-10 rounded-bl-xl`}>
            <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
        <h4 className="text-sm font-bold text-slate-500 uppercase mb-3 tracking-wider">{title}</h4>
        <div className="mb-4">
            <p className="text-2xl font-bold text-slate-800 leading-tight">{label}</p>
            <p className="text-sm text-slate-500 font-mono mt-1">Code: {topResult.codigo}</p>
        </div>
        
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-600">{t('conf')}</span>
                <span className={`font-bold ${Number(confidence) > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{confidence}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full ${Number(confidence) > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${confidence}%` }}></div>
            </div>
        </div>

        {data.length > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Outras Possibilidades:</p>
                <ul className="space-y-1">
                    {data.slice(1, 3).map((item: any, idx: number) => (
                        <li key={idx} className="text-sm text-slate-600 flex justify-between">
                            <span className="truncate mr-2">{getLabel(map, item.codigo)}</span>
                            <span className="font-mono text-slate-400">{(item.confianca * 100).toFixed(0)}%</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 h-full shadow-inner relative">
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white p-3 rounded-full shadow-lg">
        <CheckCircle className="w-8 h-8" />
      </div>

      <h3 className="text-2xl font-bold text-slate-800 text-center mb-2 mt-4">{t('results_title')}</h3>
      <p className="text-slate-600 text-center mb-8 text-sm">Classificação baseada no texto processado.</p>

      <div className="space-y-6 mb-8">
        <ResultCard 
            title={t('label_mode')} 
            icon={Activity} 
            data={result.modo} 
            map={MAP_MODE} 
            colorClass="text-indigo-600" 
        />
        <ResultCard 
            title={t('label_mech')} 
            icon={Settings} 
            data={result.mecanismo} 
            map={MAP_MECH} 
            colorClass="text-emerald-600" 
        />
        <ResultCard 
            title={t('label_det')} 
            icon={Search} 
            data={result.deteccao} 
            map={MAP_DET} 
            colorClass="text-sky-600" 
        />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onSave}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Save className="w-5 h-5" /> {t('btn_save')}
        </button>
        
        <button
          onClick={onCancel}
          className="w-full bg-white border-2 border-slate-300 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 hover:text-slate-800 hover:border-slate-400 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" /> {t('btn_cancel_edit')}
        </button>
      </div>
    </div>
  );
};

export default ClassificationResult;
