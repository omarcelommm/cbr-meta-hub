import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? '/admin' : '/hoje', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error('Email ou senha incorretos');
      return;
    }

    const role = data.user?.user_metadata?.role;
    navigate(role === 'admin' ? '/admin' : '/hoje', { replace: true });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Informe seu email'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error('Erro ao enviar email de recuperação');
    } else {
      toast.success('Email enviado! Verifique sua caixa de entrada.');
      setForgotMode(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <TrendingUp className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-bold text-white">
              Aferição da <span className="text-blue-400">META</span>
            </span>
          </div>
          <p className="text-xs text-white/30 tracking-widest uppercase">
            Clínica Boutique Regenerativa
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={forgotMode ? handleForgot : handleLogin}
          className="bg-card rounded-xl p-8 border border-white/10 shadow-2xl space-y-4"
        >
          <h2 className="text-lg font-semibold text-white mb-2">
            {forgotMode ? 'Recuperar Senha' : 'Entrar'}
          </h2>

          <div>
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="input-dark"
            />
          </div>

          {!forgotMode && (
            <div>
              <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-dark"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {forgotMode ? 'Enviar Email' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => setForgotMode(!forgotMode)}
            className="w-full text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            {forgotMode ? '← Voltar ao login' : 'Esqueci minha senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
