// src/components/QuotaModal.tsx
import React, { useState } from 'react';
import { Mail, User, Lock, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface QuotaModalProps {
  onRegister: (email: string, name: string) => void;
  onClose: () => void;
  showContactMessage?: boolean;
}

// O URL base da API deve ser pego do ambiente (VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const QuotaModal: React.FC<QuotaModalProps> = ({ onRegister, onClose, showContactMessage = false }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !name) return;
    setIsLoading(true);
    
    try {
      // CORREÇÃO CRÍTICA: Garantir que o endpoint /register seja chamado
      const response = await fetch(`${API_URL}/register`, { 
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, name })
      });
      
      const data = await response.json();

      if (response.ok) {
        onRegister(email, name);
      } else {
        // Trata erros específicos do servidor (ex: 400 Bad Request)
        alert(`Falha no Registro: ${data.message || response.statusText}`);
      }

    } catch (error) {
      alert("Erro de conexão ao registrar. Verifique o console.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (showContactMessage) {
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full relative border-t-4 border-red-500">
                 <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                 <Lock className="w-8 h-8 text-red-500 mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-slate-800 mb-2">Limite de Uso Atingido</h3>
                 <p className="text-slate-600 mb-6">Você atingiu o limite de 10 avaliações. Para ter acesso irrestrito, por favor, entre em contato:</p>
                 <p className="font-bold text-lg text-indigo-600 mb-2">Luis Henrique Oliveira</p>
                 <p className="text-sm text-slate-500 mb-4">Email: [Seu Email Aqui]</p>
                 <p className="text-sm text-red-500 font-bold">⚠️ Não haverá cobrança, este limite é apenas para controle e governança do uso da IA.</p>
                 <button onClick={onClose} className="mt-6 w-full py-2 bg-indigo-600 text-white rounded-lg">Fechar</button>
            </div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full relative">
         <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Acesso Estendido (Passo 2 de 3)</h3>
        <p className="text-slate-600 mb-6">Você usou as 5 avaliações anônimas. Para continuar, por favor, registre seu nome e e-mail. Isso nos ajuda a controlar o uso da API.</p>

        <div className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Seu Nome Completo" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="email" placeholder="Seu E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={isLoading}
          className="mt-6 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
        >
          {isLoading ? 'Registrando...' : 'Continuar o Acesso'}
        </button>
      </div>
    </div>
  );
};

export default QuotaModal;
