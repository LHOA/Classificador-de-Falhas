import React, { useState } from 'react';
import { MAP_IMPACTO, MAP_MECH, MAP_MODE, MAP_DET } from '../constants';
import { classifyFailure } from '../services/aiService';
import { AIResponse, FailureRecord } from '../types';
import { Zap, Save, Edit2, Check } from 'lucide-react';

interface ClassifierProps {
  onSave: (record: FailureRecord) => void;
}

const Classifier: React.FC<ClassifierProps> = ({ onSave }) => {
  // Form State
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('D');
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edited selections (if user disagrees with AI)
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedMech, setSelectedMech] = useState('');
  const [selectedDet, setSelectedDet] = useState('');

  const handleClassify = async () => {
    if (!description) return;
    setIsLoading(true);
    setIsEditing(false);
    try {
      const aiResult = await classifyFailure(tag, impact, description);
      setResult(aiResult);
      
      // Set default selections to top AI prediction
      setSelectedMode(aiResult.mode[0].code);
      setSelectedMech(aiResult.mechanism[0].code);
      setSelectedDet(aiResult.detection[0].code);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;

    // Check if user modified the specific fields to determine confidence logic
    const modeChanged = selectedMode !== result.mode[0].code;
    const mechChanged = selectedMech !== result.mechanism[0].code;
    const detChanged = selectedDet !== result.detection[0].code;
    const isHumanModified = modeChanged || mechChanged || detChanged;

    const newRecord: FailureRecord = {
      id: Date.now().toString(),
      tag: tag || 'N/A',
      description,
      
      impactCode: impact,
      impact: MAP_IMPACTO[impact],
      // Impact is manual input, so we consider it 100% confidence from the user
      
      modeCode: selectedMode,
      mode: MAP_MODE[selectedMode],
      confidenceMode: modeChanged ? 1.0 : result.mode[0].confidence,

      mechanismCode: selectedMech,
      mechanism: MAP_MECH[selectedMech],
      confidenceMech: mechChanged ? 1.0 : result.mechanism[0].confidence,

      detectionCode: selectedDet,
      detection: MAP_DET[selectedDet],
      confidenceDet: detChanged ? 1.0 : result.detection[0].confidence,

      confidence: isHumanModified ? 1.0 : result.mode[0].confidence, // Overall confidence
      status: isHumanModified ? 'Human' : 'IA',
      timestamp: new Date()
    };

    onSave(newRecord);
    
    // Reset
    setTag('');
    setDescription('');
    setResult(null);
    setIsEditing(false);
  };

  // High Contrast Input Class
  const inputClass = "w-full p-2.5 bg-slate-50 border border-slate-400 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400";

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Input Column */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-indigo-600" />
            Input Data
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Equipment Tag</label>
              <input 
                type="text" 
                className={inputClass}
                placeholder="e.g., P-102-A"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Failure Impact</label>
              <select 
                className={inputClass}
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
              >
                {Object.entries(MAP_IMPACTO).map(([key, val]) => (
                  <option key={key} value={key} className="py-1">{val}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
              <textarea 
                className={`${inputClass} h-32 resize-none`}
                placeholder="Describe the failure (e.g., 'High vibration detected on motor bearing due to misalignment')"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button 
              onClick={handleClassify}
              disabled={!description || isLoading}
              className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all
                ${!description || isLoading ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-900/30'}`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Classify Failure
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7">
        {result ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-500" />
                AI Results
              </h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                {isEditing ? 'Cancel Editing' : 'Incorrect? Edit'}
              </button>
            </div>

            <div className="space-y-6 flex-1">
              {/* Failure Mode */}
              <div className="space-y-2">
                <div className="flex justify-between">
                   <span className="text-sm font-semibold text-slate-500 uppercase">Failure Mode</span>
                   <span className="text-xs text-emerald-600 font-bold">{(result.mode[0].confidence * 100).toFixed(1)}% Conf.</span>
                </div>
                {isEditing ? (
                  <select 
                    className={inputClass}
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                  >
                    {Object.entries(MAP_MODE).map(([k, v]) => <option key={k} value={k}>{k} - {v}</option>)}
                  </select>
                ) : (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 font-medium">
                    {selectedMode} - {MAP_MODE[selectedMode]}
                  </div>
                )}
              </div>

               {/* Mechanism */}
               <div className="space-y-2">
                 <div className="flex justify-between">
                    <span className="text-sm font-semibold text-slate-500 uppercase">Failure Mechanism</span>
                    <span className="text-xs text-emerald-600 font-bold">{(result.mechanism[0].confidence * 100).toFixed(1)}% Conf.</span>
                 </div>
                {isEditing ? (
                  <select 
                    className={inputClass}
                    value={selectedMech}
                    onChange={(e) => setSelectedMech(e.target.value)}
                  >
                    {Object.entries(MAP_MECH).map(([k, v]) => <option key={k} value={k}>{k} - {v}</option>)}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                    {selectedMech} - {MAP_MECH[selectedMech]}
                  </div>
                )}
              </div>

               {/* Detection */}
               <div className="space-y-2">
                 <div className="flex justify-between">
                    <span className="text-sm font-semibold text-slate-500 uppercase">Detection Method</span>
                    <span className="text-xs text-emerald-600 font-bold">{(result.detection[0].confidence * 100).toFixed(1)}% Conf.</span>
                 </div>
                {isEditing ? (
                  <select 
                    className={inputClass}
                    value={selectedDet}
                    onChange={(e) => setSelectedDet(e.target.value)}
                  >
                    {Object.entries(MAP_DET).map(([k, v]) => <option key={k} value={k}>{k} - {v}</option>)}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                     {selectedDet} - {MAP_DET[selectedDet]}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={handleSave}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-900/20 transition-all"
              >
                <Save className="w-5 h-5" />
                Save to Database
              </button>
            </div>

          </div>
        ) : (
          <div className="h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-8">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
               <Zap className="w-8 h-8 text-slate-300" />
             </div>
             <p className="font-medium">Waiting for input...</p>
             <p className="text-sm text-center mt-2">Enter a description on the left to generate ISO 14224 classifications.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Classifier;