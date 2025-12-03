// src/components/QuotaModal.tsx
import React, { useState } from 'react';
import { Mail, User, Lock, CheckCircle, HeartHandshake, Loader2, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface QuotaModalProps {
  onRegister: (email: string, name: string) => void;
  onClose: () => void;
  showContactMessage?: boolean;
  isRegistering?: boolean;
  // NOVA PROP: Controla se o usuário pode fechar o modal
  canClose?: boolean;
}

const LINKEDIN_URL = "https://www.linkedin.com/in/luishenriqueifma/";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const QuotaModal: React.FC<QuotaModalProps> = ({ onRegister, onClose, showContactMessage = false, isRegistering = false, canClose = true }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSuccessStep, setIsSuccessStep] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !validateEmail(email)) {
        setEmailError(t('qm_error_email_invalid'));
        return;
    }
    setEmailError('');
    if (!name.trim()) {
        setEmailError(t('qm_error_name_required'));
        return;
    }
    setIsSuccessStep(true);
  };

  const handleFinalFinish = () => {
      onRegister(email, name);
  };

  // --- TELA DE LIMITE ATINGIDO ---
  if (showContactMessage) {
    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-t-4 border-amber-500">
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('qm_limit_title')}</h2>
                
                <div className="text-slate-600 mb-6 text-sm leading-relaxed space-y-4">
                    <p dangerouslySetInnerHTML={{ __html: t('qm_limit_text') }}></p>
                    <p className="text-lg font-bold text-indigo-700">{t('qm_developer_name')}</p>
                </div>

                <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 mb-3">
                    {t('qm_btn_contact_dev')} <ExternalLink className="w-4 h-4"/>
                </a>
                {/* Botão fechar só aparece aqui se explicitamente permitido (neste caso é informativo, então ok) */}
                <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm font-medium underline">Fechar e visualizar histórico</button>
            </div>
          </div>
        </div>
    );
  }

  // --- TELA DE REGISTRO ---
  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {!isSuccessStep && (
            <>
                <div className="bg-indigo-600 p-6 text-white text-center relative">
                  {/* SÓ MOSTRA O BOTÃO X SE canClose FOR TRUE */}
                  {canClose && (
                      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                        <X className="w-5 h-5"/>
                      </button>
                  )}
                  
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold">{t('qm_welcome_title')}</h2>
                  <p className="text-indigo-100 text-sm mt-2">{t('qm_welcome_text')}</p>
                </div>

                <form onSubmit={handlePreSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('qm_label_name')}</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="w-5 h-5 text-slate-400" /></div>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder={t('qm_placeholder_name')} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('qm_label_email')}</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="w-5 h-5 text-slate-400" /></div>
                        <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(''); }} className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 transition-colors ${emailError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'}`} placeholder={t('qm_placeholder_email')} />
                    </div>
                    {emailError && (<p className="text-red-500 text-xs mt-1 font-medium">{emailError}</p>)}
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 mt-6">{t('qm_btn_access_platform')}</button>
                  <p className="text-xs text-center text-slate-500 mt-4">{t('qm_welcome_disclaimer')}</p>
                </form>
            </>
        )}

        {isSuccessStep && (
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><CheckCircle className="w-8 h-8" /></div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('qm_success_title')}</h2>
                <p className="text-lg text-slate-700 font-medium mb-4">{t('qm_welcome_user_prefix')} <span className="text-indigo-600">{name}</span>!</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 mb-6 flex flex-col items-center gap-3">
                    <HeartHandshake className="w-8 h-8 text-indigo-400" />
                    <p dangerouslySetInnerHTML={{ __html: t('qm_community_msg_1') }}></p>
                    <p>{t('qm_community_msg_2')}</p>
                </div>
                <button onClick={handleFinalFinish} disabled={isRegistering} className={`w-full font-bold py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 ${isRegistering ? 'bg-slate-400 cursor-not-allowed text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                    {isRegistering ? (<><Loader2 className="w-5 h-5 animate-spin" /> {t('qm_btn_processing_register')}</>) : (t('qm_btn_start_using'))}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default QuotaModal;
