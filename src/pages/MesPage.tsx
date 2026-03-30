import { useEffect, useState, useMemo } from 'react';
import { MentoradoNav } from '@/components/nav/MentoradoNav';
import {
  getMentoradoId, getMetaMes, getVendasMes,
  totalVenda, calcularTotalMes, calcularProjecao, calcularZonaCBR, calcularMixReceita,
  contarDiasUteis, diasUteisAPartirDeAmanha,
  formatBRL, formatPct, nomeMes,
  ZONA_CONFIG,
  type VendaDiaria,
} from '@/lib/afeicao-api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CAT_COLORS = ['#60a5fa', '#a78bfa', '#2dd4bf', '#fbbf24', '#6b7280'];
const CAT_LABELS = ['Consultas', 'Injetáveis', 'Procedimentos', 'Hiperbárica', 'Outros'];

export default function MesPage() {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [mentoradoId, setMentoradoId] = useState<string | null>(null);
  const [meta, setMeta] = useState<number>(0);
  const [vendas, setVendas] = useState<VendaDiaria[]>([]);
  const [loading, setLoading] = useState(true);

  const isMesAtual = mesAtual === hoje.getMonth() + 1 && anoAtual === hoje.getFullYear();

  const navMes = (delta: number) => {
    let m = mesAtual + delta;
    let a = anoAtual;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMesAtual(m);
    setAnoAtual(a);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const mid = await getMentoradoId();
      setMentoradoId(mid);
      if (!mid) { setLoading(false); return; }
      const [metaData, vendasData] = await Promise.all([
        getMetaMes(mid, mesAtual, anoAtual),
        getVendasMes(mid, mesAtual, anoAtual),
      ]);
      setMeta(metaData?.meta_escolhida ?? 0);
      setVendas(vendasData);
      setLoading(false);
    };
    load();
  }, [mesAtual, anoAtual]);

  const acumulado = calcularTotalMes(vendas);
  const pctMeta = meta > 0 ? (acumulado / meta) * 100 : 0;

  const diasTrabalhados = useMemo(() => {
    const inicio = new Date(anoAtual, mesAtual - 1, 1);
    const fim = isMesAtual ? new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) : new Date(anoAtual, mesAtual, 0);
    return Math.max(1, contarDiasUteis(inicio, fim));
  }, [mesAtual, anoAtual, isMesAtual]);

  const diasRestantesAmanha = isMesAtual ? diasUteisAPartirDeAmanha(anoAtual, mesAtual) : 0;

  const projecaoConservadora = calcularProjecao(acumulado, diasTrabalhados, diasRestantesAmanha);
  const projecaoRealista = calcularProjecao(acumulado, diasTrabalhados, diasRestantesAmanha * 1.1);
  const projecaoOtimista = meta > 0
    ? acumulado + (meta - acumulado) * 0.9
    : projecaoConservadora * 1.2;

  const zona = calcularZonaCBR(projecaoConservadora, meta);
  const zonaInfo = ZONA_CONFIG[zona];

  const mix = calcularMixReceita(vendas);
  const mixPie = [
    { name: 'Consultas', value: mix.consultas },
    { name: 'Injetáveis', value: mix.injetaveis },
    { name: 'Procedimentos', value: mix.procedimentos },
    { name: 'Hiperbárica', value: mix.hiperbarica },
    { name: 'Outros', value: mix.outros },
  ].filter((d) => d.value > 0);

  const totalDiasUteisMes = contarDiasUteis(new Date(anoAtual, mesAtual - 1, 1), new Date(anoAtual, mesAtual, 0));
  const metaDiaria = totalDiasUteisMes > 0 ? meta / totalDiasUteisMes : 0;
  const receitaPorDia = diasTrabalhados > 0 ? acumulado / diasTrabalhados : 0;

  const ticketMedio = useMemo(() => {
    const totalClientes = vendas.reduce((s, v) => s + v.clientes_unicos, 0);
    return totalClientes > 0 ? acumulado / totalClientes : 0;
  }, [vendas, acumulado]);

  const taxaConversao = useMemo(() => {
    const totalOrcado = vendas.reduce((s, v) => s + v.orcado_total, 0);
    return totalOrcado > 0 ? (acumulado / totalOrcado) * 100 : 0;
  }, [vendas, acumulado]);

  const pctAgendaMedia = useMemo(() => {
    const comAgenda = vendas.filter((v) => v.slots_agenda > 0);
    if (comAgenda.length === 0) return -1;
    return comAgenda.reduce((s, v) => s + v.slots_ocupados / v.slots_agenda, 0) / comAgenda.length * 100;
  }, [vendas]);

  const noShowRate = useMemo(() => {
    const totalSlots = vendas.reduce((s, v) => s + v.slots_ocupados, 0);
    const totalNoShow = vendas.reduce((s, v) => s + v.no_shows, 0);
    return totalSlots > 0 ? (totalNoShow / totalSlots) * 100 : -1;
  }, [vendas]);

  const totalNovos = vendas.reduce((s, v) => s + v.pacientes_novos, 0);
  const totalClientes = vendas.reduce((s, v) => s + v.clientes_unicos, 0);
  const pctRecorrentes = totalClientes > 0 ? ((totalClientes - totalNovos) / totalClientes) * 100 : 0;

  // Capacidade não monetizada
  const capacidadeNaoMonetizada = useMemo(() => {
    if (!isMesAtual || ticketMedio === 0) return 0;
    const slotsDisponiveisRestantes = vendas.reduce((s, v) => s + (v.slots_agenda - v.slots_ocupados), 0);
    return slotsDisponiveisRestantes * ticketMedio + diasRestantesAmanha * metaDiaria;
  }, [vendas, ticketMedio, diasRestantesAmanha, metaDiaria, isMesAtual]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/40 text-sm">Carregando...</div>
      </div>
    );
  }

  const zonaOrder: Record<string, number> = { sobrevivencia: 0, pressao: 1, conforto: 2, crescimento: 3, escala: 4 };
  const zonaIdx = zonaOrder[zona] ?? 1;

  return (
    <div className="min-h-screen bg-background">
      <MentoradoNav />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 space-y-5">

        {/* Month selector */}
        <div className="flex items-center justify-between">
          <button onClick={() => navMes(-1)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{nomeMes(mesAtual)} {anoAtual}</p>
            {isMesAtual && <p className="text-xs text-white/30">Mês atual</p>}
          </div>
          <button onClick={() => navMes(1)} disabled={isMesAtual} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Hero — Acumulado vs Meta */}
        <div className="card-dark p-6">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="label-meta mb-1">Acumulado</p>
              <p className="text-3xl font-bold text-white">{formatBRL(acumulado)}</p>
            </div>
            <div className="text-right">
              <p className="label-meta mb-1">Meta</p>
              <p className="text-lg font-semibold text-white/60">{formatBRL(meta)}</p>
            </div>
          </div>
          <div className="w-full bg-white/5 rounded-full h-3 mb-2">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(pctMeta, 100)}%`,
                backgroundColor: pctMeta >= 100 ? '#4ade80' : pctMeta >= 80 ? '#60a5fa' : pctMeta >= 50 ? '#fbbf24' : '#f87171',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40">
            <span>{formatPct(pctMeta)} da meta</span>
            {isMesAtual && <span>{diasRestantesAmanha + (new Date().getDay() >= 1 && new Date().getDay() <= 5 ? 1 : 0)} dias úteis restantes</span>}
          </div>
        </div>

        {/* Projeções */}
        {isMesAtual && (
          <div>
            <p className="label-meta mb-3">Projeção de Fechamento</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Conservadora', value: projecaoConservadora, desc: 'Ritmo atual' },
                { label: 'Realista', value: projecaoRealista, desc: '+10% de intensidade' },
                { label: 'Otimista', value: projecaoOtimista, desc: 'Meta em vista' },
              ].map(({ label, value, desc }) => {
                const gap = value - meta;
                return (
                  <div key={label} className="card-dark p-4 text-center">
                    <p className="label-meta mb-2">{label}</p>
                    <p className={`text-lg font-bold ${value >= meta ? 'text-green-400' : value >= meta * 0.8 ? 'text-amber-400' : 'text-red-400'}`}>
                      {formatBRL(value)}
                    </p>
                    <p className={`text-xs mt-1 ${gap >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                      {gap >= 0 ? '+' : ''}{formatBRL(gap)}
                    </p>
                    <p className="text-xs text-white/30 mt-1">{desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              label: 'Receita / Dia Trabalhado',
              value: formatBRL(receitaPorDia),
              sub: 'Hero metric boutique',
              color: 'text-blue-400',
            },
            {
              label: 'Ticket Médio',
              value: ticketMedio > 0 ? formatBRL(ticketMedio) : '—',
              sub: `${totalClientes} clientes únicos`,
              color: 'text-white',
            },
            {
              label: 'Taxa de Conversão',
              value: taxaConversao > 0 ? formatPct(taxaConversao) : '—',
              sub: 'Orçado → Realizado',
              color: taxaConversao >= 80 ? 'text-green-400' : taxaConversao >= 50 ? 'text-amber-400' : taxaConversao > 0 ? 'text-red-400' : 'text-white/30',
            },
            {
              label: 'Ocupação da Agenda',
              value: pctAgendaMedia >= 0 ? formatPct(pctAgendaMedia) : '—',
              sub: pctAgendaMedia >= 0 ? (pctAgendaMedia >= 70 ? '→ Foco em ticket' : '→ Foco em captação') : 'Sem dados',
              color: pctAgendaMedia >= 70 ? 'text-green-400' : pctAgendaMedia >= 0 ? 'text-amber-400' : 'text-white/30',
            },
            {
              label: 'Taxa de No-show',
              value: noShowRate >= 0 ? formatPct(noShowRate) : '—',
              sub: noShowRate >= 0 ? (noShowRate < 10 ? '✓ Abaixo de 10%' : '⚠ Acima do ideal') : 'Sem dados',
              color: noShowRate >= 0 ? (noShowRate < 10 ? 'text-green-400' : 'text-amber-400') : 'text-white/30',
            },
            {
              label: 'Pacientes Recorrentes',
              value: totalClientes > 0 ? formatPct(pctRecorrentes) : '—',
              sub: `${totalNovos} novos | ${totalClientes - totalNovos} recorrentes`,
              color: pctRecorrentes >= 60 ? 'text-green-400' : 'text-white',
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="card-dark p-4">
              <p className="label-meta mb-2">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-white/30 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Zona CBR */}
        <div className="card-dark p-6 border border-white/10">
          <p className="label-meta mb-3">Zona CBR</p>
          <div className="flex items-start gap-4">
            <div>
              <p className={`text-2xl font-bold ${zonaInfo.color}`}>{zonaInfo.label}</p>
              <p className="text-sm text-white/40 mt-1 max-w-sm">{zonaInfo.desc}</p>
            </div>
          </div>
          <div className="mt-4 relative">
            <div className="flex w-full h-2 rounded-full overflow-hidden">
              {['sobrevivencia', 'pressao', 'conforto', 'crescimento', 'escala'].map((z, i) => (
                <div
                  key={z}
                  className="flex-1 h-full"
                  style={{ backgroundColor: ['#f87171', '#fbbf24', '#60a5fa', '#4ade80', '#a78bfa'][i], opacity: i === zonaIdx ? 1 : 0.25 }}
                />
              ))}
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-background shadow transition-all duration-700"
              style={{ left: `calc(${(zonaIdx * 20) + 10}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            {['Sobrev.', 'Pressão', 'Conforto', 'Crescim.', 'Escala'].map((l, i) => (
              <span key={l} className={`text-xs ${i === zonaIdx ? 'text-white' : 'text-white/20'}`}>{l}</span>
            ))}
          </div>
        </div>

        {/* Capacidade Não Monetizada */}
        {isMesAtual && capacidadeNaoMonetizada > 0 && (
          <div className="card-dark p-5 border border-amber-400/20 bg-amber-400/5">
            <p className="label-meta text-amber-400/70 mb-1">Capacidade Não Monetizada</p>
            <p className="text-2xl font-bold text-amber-400">{formatBRL(capacidadeNaoMonetizada)}</p>
            <p className="text-xs text-white/30 mt-1">ainda disponíveis na sua agenda este mês</p>
          </div>
        )}

        {/* Mix de Receita */}
        {mixPie.length > 0 && (
          <div className="card-dark p-6">
            <p className="label-meta mb-4">Mix de Receita</p>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={mixPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {mixPie.map((_, index) => (
                      <Cell key={index} fill={CAT_COLORS[['Consultas', 'Injetáveis', 'Procedimentos', 'Hiperbárica', 'Outros'].indexOf(mixPie[index].name)]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(222,55%,13%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(v: number) => [formatBRL(v)]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {mixPie.map((item, i) => {
                  const color = CAT_COLORS[CAT_LABELS.indexOf(item.name)];
                  const pct = acumulado > 0 ? (item.value / acumulado) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm text-white/60 flex-1">{item.name}</span>
                      <span className="text-sm font-medium text-white">{formatBRL(item.value)}</span>
                      <span className="text-xs text-white/30 w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
