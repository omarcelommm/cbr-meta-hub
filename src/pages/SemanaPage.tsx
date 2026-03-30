import { useEffect, useState, useMemo } from 'react';
import { MentoradoNav } from '@/components/nav/MentoradoNav';
import { SemicircleGauge } from '@/components/gauge/SemicircleGauge';
import {
  getMentoradoId, getMetaMes, getVendasMes, totalVenda,
  contarDiasUteis, formatBRL, formatPct,
  type VendaDiaria,
} from '@/lib/afeicao-api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow; // Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function SemanaPage() {
  const hoje = new Date();
  const [weekStart, setWeekStart] = useState(startOfWeek(hoje));
  const [mentoradoId, setMentoradoId] = useState<string | null>(null);
  const [meta, setMeta] = useState<number>(0);
  const [vendas, setVendas] = useState<VendaDiaria[]>([]);
  const [loading, setLoading] = useState(true);

  const weekEnd = addDays(weekStart, 6); // Sunday
  const weekEndSat = addDays(weekStart, 5); // Saturday

  const weekLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${weekStart.toLocaleDateString('pt-BR', opts)} a ${weekEndSat.toLocaleDateString('pt-BR', opts)} de ${weekStart.getFullYear()}`;
  }, [weekStart]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const mid = await getMentoradoId();
      setMentoradoId(mid);
      if (!mid) { setLoading(false); return; }

      // Fetch for the month of weekStart (might span 2 months — simplify: use weekStart's month)
      const mes = weekStart.getMonth() + 1;
      const ano = weekStart.getFullYear();

      const [metaData, vendasData] = await Promise.all([
        getMetaMes(mid, mes, ano),
        getVendasMes(mid, mes, ano),
      ]);

      // Also fetch next month if week spans months
      const mesEnd = weekEnd.getMonth() + 1;
      let vendasAll = vendasData;
      if (mesEnd !== mes) {
        const vendasNext = await getVendasMes(mid, mesEnd, weekEnd.getFullYear());
        vendasAll = [...vendasData, ...vendasNext];
      }

      setMeta(metaData?.meta_escolhida ?? 0);
      setVendas(vendasAll);
      setLoading(false);
    };
    load();
  }, [weekStart]);

  // Days of week (Mon-Sun)
  const diasSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const iso = d.toISOString().split('T')[0];
      const venda = vendas.find((v) => v.data === iso);
      const realizado = venda ? totalVenda(venda) : 0;
      const orcado = venda?.orcado_total ?? 0;
      const conv = orcado > 0 ? (realizado / orcado) * 100 : null;
      return { dia: i, date: d, iso, venda, realizado, orcado, conv };
    });
  }, [weekStart, vendas]);

  const totalSemana = diasSemana.reduce((s, d) => s + d.realizado, 0);
  const orcadoSemana = diasSemana.reduce((s, d) => s + d.orcado, 0);
  const convSemana = orcadoSemana > 0 ? (totalSemana / orcadoSemana) * 100 : 0;

  // Weekly meta = proportional to working days in week
  const diasUteisSemana = contarDiasUteis(weekStart, weekEndSat);
  const totalDiasUteisMes = (() => {
    const mes = weekStart.getMonth() + 1;
    const ano = weekStart.getFullYear();
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0);
    return contarDiasUteis(inicio, fim);
  })();
  const metaSemanal = totalDiasUteisMes > 0 ? (meta / totalDiasUteisMes) * diasUteisSemana : 0;
  const pctSemana = metaSemanal > 0 ? (totalSemana / metaSemanal) * 100 : 0;

  const barData = diasSemana.slice(0, 6).map((d, i) => ({
    dia: DIAS_CURTOS[i],
    realizado: d.realizado,
  }));

  // Mix da semana
  const mix = useMemo(() => {
    const acc = { consultas: 0, injetaveis: 0, procedimentos: 0, hiperbarica: 0, outros: 0 };
    diasSemana.forEach((d) => {
      if (d.venda) {
        acc.consultas += d.venda.consultas;
        acc.injetaveis += d.venda.injetaveis;
        acc.procedimentos += d.venda.procedimentos;
        acc.hiperbarica += d.venda.hiperbarica;
        acc.outros += d.venda.outros;
      }
    });
    return acc;
  }, [diasSemana]);

  const cats = [
    { key: 'consultas', label: 'Consultas', color: '#60a5fa' },
    { key: 'injetaveis', label: 'Injetáveis', color: '#a78bfa' },
    { key: 'procedimentos', label: 'Procedimentos', color: '#2dd4bf' },
    { key: 'hiperbarica', label: 'Hiperbárica', color: '#fbbf24' },
    { key: 'outros', label: 'Outros', color: '#6b7280' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/40 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MentoradoNav />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 space-y-5">

        {/* Week selector */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Semana</p>
            <p className="text-xs text-white/40">{weekLabel}</p>
          </div>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            disabled={weekStart >= startOfWeek(hoje)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Gauge + Stats */}
        <div className="card-dark p-6">
          <p className="label-meta text-center mb-4">Resultado da Semana</p>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <SemicircleGauge percent={pctSemana} meta={metaSemanal} />
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4 w-full">
              {[
                { label: 'Venda Total', value: formatBRL(totalSemana), color: 'text-blue-400' },
                { label: 'Orçado Total', value: formatBRL(orcadoSemana), color: 'text-white' },
                { label: 'Taxa de Conversão', value: orcadoSemana > 0 ? formatPct(convSemana) : '—', color: convSemana >= 80 ? 'text-green-400' : convSemana >= 50 ? 'text-amber-400' : 'text-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="label-meta mb-1">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="card-dark overflow-hidden">
          <p className="label-meta px-6 pt-5 mb-3">Registro da Semana</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">Dia</th>
                  <th className="text-right text-white/40 text-xs font-medium px-4 py-3">Orçado</th>
                  <th className="text-right text-white/40 text-xs font-medium px-4 py-3">Realizado</th>
                  <th className="text-right text-white/40 text-xs font-medium px-6 py-3">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {diasSemana.slice(0, 6).map(({ dia, date, realizado, orcado, conv }) => {
                  const isPast = date <= hoje;
                  const isHoje = date.toDateString() === hoje.toDateString();
                  return (
                    <tr key={dia} className={`border-b border-white/5 ${isHoje ? 'bg-blue-500/5' : ''}`}>
                      <td className="px-6 py-3 text-white font-medium">
                        {DIAS[dia]}
                        <span className="text-white/30 ml-2 text-xs">{date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                        {isHoje && <span className="ml-2 text-xs text-blue-400">hoje</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-white/50">{orcado > 0 ? formatBRL(orcado) : '—'}</td>
                      <td className={`px-4 py-3 text-right font-medium ${realizado > 0 ? 'text-white' : isPast ? 'text-white/20' : 'text-white/20'}`}>
                        {realizado > 0 ? formatBRL(realizado) : isPast ? 'R$ 0' : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {conv !== null ? (
                          <span className={`font-medium ${conv >= 80 ? 'text-green-400' : conv >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {formatPct(conv)}
                          </span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-white/5 font-semibold">
                  <td className="px-6 py-3 text-white">Total da Semana</td>
                  <td className="px-4 py-3 text-right text-white/70">{formatBRL(orcadoSemana)}</td>
                  <td className="px-4 py-3 text-right text-blue-400">{formatBRL(totalSemana)}</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`${convSemana >= 80 ? 'text-green-400' : convSemana >= 50 ? 'text-amber-400' : orcadoSemana > 0 ? 'text-red-400' : 'text-white/20'}`}>
                      {orcadoSemana > 0 ? formatPct(convSemana) : '—'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="card-dark p-6">
          <p className="label-meta mb-4">Realizado por Dia</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="dia" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(222,55%,13%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                formatter={(v: number) => [formatBRL(v), 'Realizado']}
              />
              <Bar dataKey="realizado" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mix */}
        {totalSemana > 0 && (
          <div className="card-dark p-6">
            <p className="label-meta mb-4">Mix da Semana</p>
            <div className="space-y-2">
              {cats.map(({ key, label, color }) => {
                const val = mix[key as keyof typeof mix];
                const pct = totalSemana > 0 ? (val / totalSemana) * 100 : 0;
                if (val === 0) return null;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-white/40 w-28">{label}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-xs text-white/60 w-10 text-right">{pct.toFixed(0)}%</span>
                    <span className="text-xs text-white/40 w-20 text-right">{formatBRL(val)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
