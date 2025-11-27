import React from 'react';
import { LayoutDashboard, BrainCircuit, Database, Layers, LogOut, UserCircle2, Crown, Globe, ExternalLink } from 'lucide-react';
import { TabView } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserId } from '../services/aiService';

interface SidebarProps {
  currentTab: TabView;
  onTabChange: (tab: TabView) => void;
  isPremium: boolean;
}

const navItems = (t: (key: string) => string) => [
  { icon: LayoutDashboard, label: t('nav_dashboard'), tab: TabView.DASHBOARD },
  { icon: BrainCircuit, label: t('nav_classifier'), tab: TabView.CLASSIFIER },
  { icon: Layers, label: t('nav_batch'), tab: TabView.BATCH },
  { icon: Database, label: t('nav_dictionary'), tab: TabView.DICTIONARY },
];

const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, isPremium }) => {
  const { t, language, setLanguage } = useLanguage();
  const { name } = getUserId();
  const userName = name || 'Visitante Anônimo';
  
  // Link do LinkedIn do desenvolvedor
  // O link deve ser a URL completa para ser lido corretamente pelo browser
  const DEVELOPER_LINKEDIN = "https://www.linkedin.com/in/luis-henrique-oliveira-reliability/";

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_premium');
    localStorage.removeItem('anon_eval_count');
    window.location.reload();
  };

  return (
    <div className="fixed inset-y-0 left-0 z-30 w-full max-w-[280px] md:max-w-none md:w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out transform -translate-x-full md:translate-x-0">
      
      {/* 1. SEÇÃO DE TÍTULO E PERFIL DO USUÁRIO LOGADO */}
      <div className="p-6 pb-4 flex flex-col gap-3 border-b border-slate-800/50 bg-slate-900/50">
        
        {/* Título da Aplicação */}
        <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              {t('app_title')}
            </h1>
        </div>
        
        {/* Perfil (Nome do Usuário) */}
        <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-xl">
            <div className="relative">
                <UserCircle2 className="w-8 h-8 text-slate-400" />
                {isPremium && (
                    <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5">
                        <Crown className="w-3 h-3 text-amber-400" fill="currentColor" />
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate text-sm">{userName}</p>
                
                {isPremium ? (
                    <p className="text-xs text-amber-400 font-bold flex items-center gap-1">
                        <Crown className="w-3 h-3" fill="currentColor" /> Acesso Ilimitado
                    </p>
                ) : (
                    <p className="text-xs text-slate-500 truncate">{t('profile_role')}</p>
                )}
            </div>
        </div>

        {/* Controles de Logout e Idioma */}
        <div className="flex gap-2 text-xs">
            <button onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-slate-300 font-bold">
                <Globe className="w-4 h-4" /> {language === 'pt' ? 'EN' : 'PT'}
            </button>
            <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/30 hover:bg-red-900/20 text-red-400 transition-colors font-bold" title="Sair / Limpar Sessão">
                <LogOut className="w-4 h-4" /> Sair
            </button>
        </div>
      </div>

      {/* 2. SEÇÃO DE NAVEGAÇÃO */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
        {navItems(t).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onTabChange(item.tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-200' : ''}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* 3. RODAPÉ (PERFIL DO DESENVOLVEDOR - DESTAQUE) */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-800/70">
        
        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">{t('sidebar_developed_by')}</h4>
        
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-900 rounded-xl border border-indigo-700/50 shadow-lg">
            
            <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{t('qm_developer_name')}</p>
                <p className="text-xs text-indigo-400 mt-0.5">{t('qm_developer_role_specific')}</p>
            </div>
            
            <a 
                href={DEVELOPER_LINKEDIN} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-full text-white transition-colors flex-shrink-0"
                title="Ver Perfil"
            >
                <ExternalLink className="w-4 h-4" />
            </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; // <-- Linha de exportação final
