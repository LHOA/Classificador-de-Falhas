// src/components/Sidebar.tsx (Versão com Perfil no Topo)
import React from 'react';
// Importamos o hook de idioma
import { LayoutDashboard, BrainCircuit, Database, Layers, LogOut, UserCircle2, Crown, Globe, ExternalLink, Settings } from 'lucide-react';
import { TabView } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
// Importamos a função para ler o cache local
import { getUserId } from '../services/aiService'; 

interface SidebarProps {
  currentTab: TabView;
  onTabChange: (tab: TabView) => void;
  // Propriedade que vem do App.tsx
  isPremium: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, isPremium }) => {
  const { t, language, setLanguage } = useLanguage();
  // Obtém nome e e-mail do usuário logado (armazenado localmente)
  const { name } = getUserId();
  const userName = name || 'Visitante Anônimo';

  const menuItems = [
    { icon: LayoutDashboard, label: t('nav_dashboard'), tab: TabView.DASHBOARD },
    { icon: BrainCircuit, label: t('nav_classifier'), tab: TabView.CLASSIFIER },
    { icon: Layers, label: t('nav_batch'), tab: TabView.BATCH },
    { icon: Database, label: t('nav_dictionary'), tab: TabView.DICTIONARY },
  ];
  
  // Link do LinkedIn do desenvolvedor (mantido do QuotaModal)
  const DEVELOPER_LINKEDIN = "https://www.linkedin.com/in/luis-henrique-oliveira-reliability/";

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_premium');
    // Força o reset do contador anônimo para que o modal apareça novamente
    localStorage.removeItem('anon_eval_count'); 
    window.location.reload();
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-xl transition-all z-20 md:relative absolute -left-64 md:left-0">
      
      {/* 1. SEÇÃO DE TÍTULO E PERFIL DO USUÁRIO LOGADO */}
      <div className="p-6 pb-4 flex flex-col gap-3 border-b border-slate-800/50 bg-slate-900/50">
        
        {/* Título da Aplicação */}
        <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              {t('app_title')}
            </h1>
        </div>
        
        {/* Perfil (Nome do Usuário) */}
        <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-xl">
            <div className="relative">
                <UserCircle2 className="w-8 h-8 text-slate-400" />
                {/* Ícone Premium no Avatar */}
                {isPremium && (
                    <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5">
                        <Crown className="w-3 h-3 text-amber-400" fill="currentColor" />
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate text-sm">{userName}</p>
                <p className={`text-xs ${isPremium ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                    {isPremium ? 'Acesso Ilimitado' : t('profile_role')}
                </p>
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

      {/* 2. SEÇÃO DE NAVEGAÇÃO (Mantida Central) */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {menuItems.map((item) => {
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
        
        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Desenvolvido por</h4>
        
        {/* Bloco do Desenvolvedor */}
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-900 rounded-xl border border-indigo-700/50 shadow-lg">
            
            <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">Luis Henrique Oliveira</p>
                <p className="text-xs text-indigo-400 mt-0.5">Especialista em ML & Ativos</p>
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
    </aside>
  );
};

export default Sidebar;
