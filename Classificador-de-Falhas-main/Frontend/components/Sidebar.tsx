import React from 'react';
import { LayoutDashboard, Microscope, FileSpreadsheet, BookOpen, ExternalLink, UserCircle, Globe } from 'lucide-react';
import { TabView } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  currentTab: TabView;
  onTabChange: (tab: TabView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  // Hook para pegar os textos traduzidos e função de trocar idioma
  const { language, setLanguage, t } = useLanguage();

  const menuItems = [
    { id: TabView.DASHBOARD, label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: TabView.CLASSIFIER, label: t('nav_classifier'), icon: Microscope },
    { id: TabView.BATCH, label: t('nav_batch'), icon: FileSpreadsheet },
    { id: TabView.DICTIONARY, label: t('nav_dictionary'), icon: BookOpen },
  ];

  return (
    <aside className="w-20 lg:w-72 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 h-screen sticky top-0 shadow-xl z-30">
      {/* Logo Section */}
      <div className="h-24 flex items-center justify-center border-b border-slate-800 bg-slate-950 p-4 relative">
        <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2 overflow-hidden border-2 border-indigo-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-red-700">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 10a3.5 3.5 0 017 0" />
                </svg>
            </div>
            <span className="font-bold text-lg tracking-wider text-center leading-none hidden lg:block">
              FAILURE MAP
            </span>
        </div>
      </div>

      {/* --- BOTÃO DE IDIOMA NOVO --- */}
      <div className="px-4 py-3 border-b border-slate-800 flex justify-center lg:justify-start">
        <button 
          onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
          className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors border border-slate-700 group"
        >
          <Globe className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
          <span className="hidden lg:inline text-slate-300 group-hover:text-white">
            {language === 'pt' ? 'Mudar para English 🇺🇸' : 'Switch to Português 🇧🇷'}
          </span>
          <span className="lg:hidden text-slate-300">
            {language.toUpperCase()}
          </span>
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-center lg:justify-start gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 translate-x-1' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                }`}
            >
              <Icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              <span className="hidden lg:block font-medium text-sm">{item.label}</span>
              
              {/* Tooltip for mobile */}
              <div className="lg:hidden absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {item.label}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Developer Profile Section */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex flex-col gap-3">
            <div className="hidden lg:flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 border border-slate-600">
                    <UserCircle className="w-6 h-6 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">Luis Henrique Oliveira</p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                       {t('profile_role')}
                    </p>
                </div>
            </div>

            <a 
                href="https://www.linkedin.com/in/luishenriqueifma/" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center lg:justify-between px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors group"
            >
                <span className="hidden lg:inline">LinkedIn Profile</span>
                <ExternalLink className="w-4 h-4" />
            </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
