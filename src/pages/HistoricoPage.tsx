import { useEffect, useState, useMemo } from 'react';
import { MentoradoNav } from '@/components/nav/MentoradoNav';
import {
  getMentoradoId, getMetaMes, getVendasMes,
  totalVenda, calcularTotalMes, contarDiasUteis,
  formatBRL, formatPct, nomeMesCurto,
  type VendaDiaria,
} from '@/lib/afeicao-api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';

interface MesData {
  mes: number;
  ano: number;
  label: string;
  meta: number;
  acumulado: number;
  pctMeta: number;
  ticketMedio: number;
  taxaConversao: number;
  receitaPorDia: number;
}

export default function HistoricoPage() {
  const [mentoradoId, setMentoradoId] = useState<string | null>(null);
  const [historico, setHistorico] = useState<MesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const mid = await getMentoradoId();
      setMentoradoId(mid);
      if (!mid) { setLoading(false); return; }

      const hoje = new Date();
      const meses: { mes: number; ano: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        meses.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
      }

      const dados: MesData[] = await Promise.all(
        meses.map(async ({ mes, ano }) => {
          const [metaData, vendas] = await Promise.all([
            getMetaMes(mid, mes, ano),
            getVendasMes(mid, mes, ano),
          ]);

          const acumulado = calcularTotalMes(vendas);
          const meta = metaData?.meta_escolhida ?? 0;
          const pctMeta = meta > 0 ? (acumulado / meta) * 100 : 0;

          const totalClientes = vendas.reduce((s, v) => s + v.clientes_unicos, 0);
          const ticketMedio = totalClientes > 0 ? acumulado / totalClientes : 0;

          const totalOrcado = vendas.reduce((s, v) => s + v.orcado_total, 0);
          const taxaConversao = totalOrcado > 0 ? (acumulado / totalOrcado) * 100 : 0;

          const inicio = new Date(ano, mes - 1, 1);
          const fim = new Date(ano, mes, 0);
          const diasUteis = Math.max(1, contarDiasUteis(inicio, fim));
          const diasTrabalhados = vendas.filter((v) => totalVenda(v) > 0).length;
          const receitaPorDia = diasTrabalhados > 0 ? acumulado / diasTrabalhados : 0;

          return {
            mes, ano,
            label: nomeMesCurto(mes, ano),
            meta, acumulado, pctMeta, ticketMedio, taxaConversao, receitaPorDia,
          };
        })
      );

      setHistorico(dados);
      setLoading(false);
    };
    load();
  }, []);

  const temDados = historico.some((d) => d.acumulado > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/40 text-sm">Carregando histórico...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MentoradoNav />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 space-y-5">

        <div>
          <p className="text-white font-semibold">Histórico — Últimos 6 Meses</p>
          <p className="text-xs text-white/30">Evolução de performance mês a mês</p>
        </div>

        {!temDados && (
          <div className="card-dark p-12 text-center">
            <p className="text-white/30 text-sm">Nenhum dado lançado ainda.</p>
            <p className="text-white/20 text-xs mt-1">Comece a lançar na aba Hoje.</p>
          </div>
        )}

        {temDados && (
          <>
            {/* Faturamento por mês */}
            <div className="card-dark p-6">
              <p className="label-meta mb-4">Faturamento por Mês</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={historico} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222,55%,13%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(v: number, name: string) => [formatBRL(v), name === 'acumulado' ? 'Realizado' : 'Meta']}
                  />
                  <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{v === 'acumulado' ? 'Realizado' : 'Meta'}</span>} />
                  <Bar dataKey="meta" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="acumulado" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Ticket médio */}
            <div className="card-dark p-6">
              <p className="label-meta mb-4">Ticket Médio — Evolução</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={historico} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222,55%,13%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(v: number) => [formatBRL(v), 'Ticket Médio']}
                  />
                  <Line type="monotone" dataKey="ticketMedio" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Taxa de conversão */}
            <div className="card-dark p-6">
              <p className="label-meta mb-4">Taxa de Conversão — Evolução</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={historico} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222,55%,13%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(v: number) => [formatPct(v), 'Conversão']}
                  />
                  <Line type="monotone" dataKey="taxaConversao" stroke="#2dd4bf" strokeWidth={2} dot={{ fill: '#2dd4bf', r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela comparativa */}
            <div className="card-dark overflow-hidden">
              <p className="label-meta px-6 pt-5 mb-3">Comparativo Mensal</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['Mês', 'Meta', 'Realizado', '%', 'Ticket Médio', 'Conversão'].map((h) => (
                        <th key={h} className="text-left text-white/40 text-xs font-medium px-4 py-3 first:pl-6 last:pr-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((d, i) => {
                      const isLast = i === historico.length - 1;
                      return (
                        <tr key={`${d.mes}-${d.ano}`} className={`border-b border-white/5 ${isLast ? 'bg-blue-500/5' : ''}`}>
                          <td className="px-6 py-3 font-medium text-white">{d.label}</td>
                          <td className="px-4 py-3 text-white/50">{d.meta > 0 ? formatBRL(d.meta) : '—'}</td>
                          <td className="px-4 py-3 text-white">{d.acumulado > 0 ? formatBRL(d.acumulado) : '—'}</td>
                          <td className="px-4 py-3">
                            {d.meta > 0 ? (
                              <span className={`font-medium ${d.pctMeta >= 100 ? 'text-green-400' : d.pctMeta >= 80 ? 'text-blue-400' : d.pctMeta >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                {formatPct(d.pctMeta)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-white/70">{d.ticketMedio > 0 ? formatBRL(d.ticketMedio) : '—'}</td>
                          <td className="px-6 py-3 text-white/70">{d.taxaConversao > 0 ? formatPct(d.taxaConversao) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
