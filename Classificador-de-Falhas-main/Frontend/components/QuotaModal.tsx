import React, { useState } from 'react';
import { X, Mail, User, Lock, CheckCircle, HeartHandshake } from 'lucide-react';

interface QuotaModalProps {
  onRegister: (email: string, name: string) => void;
  onClose: () => void;
  showContactMessage?: boolean; // Mantivemos a prop, mas não a usaremos no fluxo inicial
}

const QuotaModal: React.FC<QuotaModalProps> = ({ onRegister, onClose }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  
  // Novos estados para controle do fluxo
  const [emailError, setEmailError] = useState('');
  const [isSuccessStep, setIsSuccessStep] = useState(false);

  // Regex simples para validação de formato de e-mail
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Função chamada ao tentar enviar o formulário
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validação
    if (!email || !validateEmail(email)) {
        setEmailError('Por favor, insira um endereço de e-mail válido.');
        return;
    }
    // Limpa erro se passou
    setEmailError('');

    if (!name.trim()) {
        setEmailError('Por favor, informe seu nome.');
        return;
    }

    // 2. Se validou, avança para a tela de sucesso
    setIsSuccessStep(true);
  };

  // Função chamada ao clicar no botão final "Começar a Usar"
  const handleFinalFinish = () => {
      // Chama a função principal do App.tsx para liberar o acesso
      onRegister(email, name);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* --- ETAPA 1: FORMULÁRIO DE REGISTRO --- */}
        {!isSuccessStep && (
            <>
                <div className="bg-indigo-600 p-6 text-white text-center relative">
                  {/* Removemos o botão de fechar no registro inicial obrigatório */}
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold">Bem-vindo ao Failure Map</h2>
                  <p className="text-indigo-100 text-sm mt-2">
                    Para acessar a plataforma gratuitamente, por favor, identifique-se. Isso nos ajuda a manter o serviço seguro para a comunidade.
                  </p>
                </div>

                <form onSubmit={handlePreSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Como gostaria de ser chamado?"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Seu E-mail Profissional</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        // Limpa o erro ao começar a digitar novamente
                        onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 transition-colors ${emailError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                        placeholder="exemplo@empresa.com"
                      />
                    </div>
                    {/* Mensagem de Erro de Validação */}
                    {emailError && (
                        <p className="text-red-500 text-xs mt-1 font-medium">{emailError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 mt-6"
                  >
                    Acessar Plataforma
                  </button>
                  <p className="text-xs text-center text-slate-500 mt-4">
                    Seus dados são usados apenas para controle de acesso anônimo e estatísticas de uso.
                  </p>
                </form>
            </>
        )}

        {/* --- ETAPA 2: MENSAGEM DE BOAS-VINDAS (SUCESSO) --- */}
        {isSuccessStep && (
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Cadastro Realizado!</h2>
                
                {/* Mensagem personalizada com o nome */}
                <p className="text-lg text-slate-700 font-medium mb-4">
                    Seja muito bem-vindo(a), <span className="text-indigo-600">{name}</span>!
                </p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 mb-6 flex flex-col items-center gap-3">
                    <HeartHandshake className="w-8 h-8 text-indigo-400" />
                    <p>
                        Esta plataforma é um <strong>projeto totalmente gratuito</strong> para a comunidade de engenharia e manutenção.
                    </p>
                    <p>
                        Bom proveito! Qualquer feedback ou contribuição com bases de dados de falhas reais é super bem-vindo para aprimorarmos a ferramenta para todos.
                    </p>
                </div>

                <button
                    onClick={handleFinalFinish}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                >
                    Começar a Usar Agora
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default QuotaModal;
