import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { listarMentoradosComPerformance, formatBRL, formatPct, ZONA_CONFIG, type MentoradoResumo } from '@/lib/afeicao-api';
import { TrendingUp, LogOut, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mentorados, setMentorados] = useState<MentoradoResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { navigate('/hoje'); return; }
    const load = async () => {
      setLoading(true);
      const data = await listarMentoradosComPerformance();
      setMentorados(data);
      setLoading(false);
    };
    load();
  }, [isAdmin]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(222,55%,10%)] border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            <span className="font-bold text-white text-sm">
              Aferição da META — <span className="text-purple-400">Admin</span>
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 pt-20 pb-16">
        <div className="mb-6">
          <p className="text-lg font-bold text-white">Visão Geral da Turma</p>
          <p className="text-xs text-white/30">Performance do mês atual — {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : (
          <div className="card-dark overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Nome', 'Especialidade', 'Meta', 'Acumulado', '%', 'Zona CBR'].map((h) => (
                    <th key={h} className="text-left text-white/40 text-xs font-medium px-4 py-3 first:pl-6 last:pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mentorados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-white/30 text-sm">
                      Nenhum mentorado com dados.
                    </td>
                  </tr>
                )}
                {mentorados.map((m) => {
                  const zonaInfo = ZONA_CONFIG[m.zonaCBR];
                  return (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{m.nome}</p>
                        <p className="text-xs text-white/30">{m.cidade}</p>
                      </td>
                      <td className="px-4 py-4 text-white/50 text-xs">{m.especialidade}</td>
                      <td className="px-4 py-4 text-white/60">{m.metaMes > 0 ? formatBRL(m.metaMes) : '—'}</td>
                      <td className="px-4 py-4 text-white font-medium">{m.acumuladoMes > 0 ? formatBRL(m.acumuladoMes) : '—'}</td>
                      <td className="px-4 py-4">
                        {m.metaMes > 0 ? (
                          <span className={`font-semibold ${m.pctMeta >= 100 ? 'text-green-400' : m.pctMeta >= 80 ? 'text-blue-400' : m.pctMeta >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {formatPct(m.pctMeta)}
                          </span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold ${zonaInfo.color}`}>
                          {zonaInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
