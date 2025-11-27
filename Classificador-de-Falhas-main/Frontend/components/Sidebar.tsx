// src/components/Sidebar.tsx (Com Ícone Premium)
import React from 'react';
// Adicionado o ícone 'Crown'
import { LayoutDashboard, BrainCircuit, Database, Layers, LogOut, UserCircle2, Crown } from 'lucide-react';
import { TabView } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserId } from '../services/aiService';

interface SidebarProps {
  currentTab: TabView;
  onTabChange: (tab: TabView) => void;
  // Nova prop
  isPremium: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, isPremium }) => {
  const { t, language, setLanguage } = useLanguage();
  const { name } = getUserId();
  const userName = name || 'Visitante';

  const menuItems = [
    { icon: LayoutDashboard, label: t('nav_dashboard'), tab: TabView.DASHBOARD },
    { icon: BrainCircuit, label: t('nav_classifier'), tab: TabView.CLASSIFIER },
    { icon: Layers, label: t('nav_batch'), tab: TabView.BATCH },
    { icon: Database, label: t('nav_dictionary'), tab: TabView.DICTIONARY },
  ];

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_premium');
    window.location.reload();
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-xl transition-all z-20 md:relative absolute -left-64 md:left-0">
      
      {/* Header */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="relative">
            <BrainCircuit className="w-8 h-8 text-indigo-400" />
            {/* Ícone Premium no Logo (opcional, mas fica legal) */}
            {isPremium && (
                <Crown className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" fill="currentColor" />
            )}
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          {t('app_title')}
        </h1>
      </div>

      {/* Navigation */}
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

      {/* Footer (User Profile & Premium Status) */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/30">
        
        {/* Seção do Usuário */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-800/50 rounded-xl">
            <div className="relative">
                <UserCircle2 className="w-10 h-10 text-slate-400" />
                {/* Ícone Premium no Avatar */}
                {isPremium && (
                    <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5">
                        <Crown className="w-4 h-4 text-amber-400" fill="currentColor" />
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate text-sm">{userName}</p>
                
                {/* Mostra cargo ou status Premium */}
                {isPremium ? (
                    <p className="text-xs text-amber-400 font-bold flex items-center gap-1">
                        <Crown className="w-3 h-3" fill="currentColor" /> Membro Premium
                    </p>
                ) : (
                    <p className="text-xs text-slate-500 truncate">{t('profile_role')}</p>
                )}
            </div>
        </div>

        {/* Botões de Idioma e Logout */}
        <div className="flex gap-2">
            <button onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-xs font-bold text-slate-300">
                {language === 'pt' ? '🇺🇸 EN' : '🇧🇷 PT'}
            </button>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-900/30 hover:bg-red-900/20 text-red-400 transition-colors text-xs" title="Sair">
                <LogOut className="w-4 h-4" />
            </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
