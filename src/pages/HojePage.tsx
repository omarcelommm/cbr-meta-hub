import { useEffect, useState, useMemo } from 'react';
import { MentoradoNav } from '@/components/nav/MentoradoNav';
import { SemicircleGauge } from '@/components/gauge/SemicircleGauge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  getMentoradoId, getMetaMes, getVendasMes, getVendaHoje, getSnapshotsHoje,
  salvarVendaDiaria, salvarSnapshots,
  totalVenda, calcularTotalMes, calcularMetaDiaria, calcularProjecao,
  diasUteisRestantesNoMes, diasUteisAPartirDeAmanha, contarDiasUteis,
  formatBRL, formatPct, formatDataLonga,
  type VendaDiaria, type SnapshotHorario, type VendaDiariaInput,
} from '@/lib/afeicao-api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Save, TrendingUp, Target, ClipboardList, BarChart2, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';

const HORARIOS = ['12:00:00', '18:00:00', '21:00:00'];
const HORARIOS_LABEL = ['12:00', '18:00', '21:00'];

const emptyForm = (): VendaDiariaInput => ({
  consultas: 0, injetaveis: 0, procedimentos: 0, hiperbarica: 0, outros: 0,
  clientes_unicos: 0, pacientes_novos: 0, orcado_total: 0,
  slots_agenda: 0, slots_ocupados: 0, no_shows: 0,
});

const emptySnapshots = () => HORARIOS.map((h) => ({ horario: h, orcado: 0, realizado: 0 }));

function num(v: string): number {
  const n = parseFloat(v.replace(/[^\d,.-]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

export default function HojePage() {
  const { user } = useAuth();
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  const [mentoradoId, setMentoradoId] = useState<string | null>(null);
  const [meta, setMeta] = useState<number>(0);
  const [vendas, setVendas] = useState<VendaDiaria[]>([]);
  const [vendaHoje, setVendaHoje] = useState<VendaDiaria | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotHorario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState<VendaDiariaInput>(emptyForm());
  const [snapshotForm, setSnapshotForm] = useState(emptySnapshots());

  // Derived values
  const hojeStr = hoje.toISOString().split('T')[0];
  const vendasSemHoje = vendas.filter((v) => v.data !== hojeStr);
  const acumuladoAteOntem = calcularTotalMes(vendasSemHoje);
  const totalHoje = form.consultas + form.injetaveis + form.procedimentos + form.hiperbarica + form.outros;
  const acumuladoTotal = acumuladoAteOntem + totalHoje;
  const diasRestantesHoje = diasUteisRestantesNoMes(ano, mes);
  const diasRestantesAmanha = diasUteisAPartirDeAmanha(ano, mes);
  const metaDiaria = calcularMetaDiaria(meta, acumuladoAteOntem, diasRestantesHoje);
  const pctMeta = metaDiaria > 0 ? (totalHoje / metaDiaria) * 100 : 0;

  const diasTrabalhados = useMemo(() => {
    const inicio = new Date(ano, mes - 1, 1);
    const fimOntem = new Date(hoje);
    fimOntem.setDate(fimOntem.getDate() - 1);
    if (fimOntem < inicio) return 1;
    return contarDiasUteis(inicio, fimOntem) + 1; // +1 para incluir hoje
  }, [ano, mes]);

  const projecao = calcularProjecao(acumuladoTotal, diasTrabalhados, diasRestantesAmanha);

  const pctAgenda = form.slots_agenda > 0 ? (form.slots_ocupados / form.slots_agenda) * 100 : -1;
  const ticketMedio = form.clientes_unicos > 0 ? totalHoje / form.clientes_unicos : 0;
  const conversaoOrcado = form.orcado_total > 0 ? (totalHoje / form.orcado_total) * 100 : 0;

  // Chart data
  const chartData = useMemo(() => {
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const totalDiasUteis = (() => {
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 0);
      return contarDiasUteis(inicio, fim);
    })();
    const metaPorDia = totalDiasUteis > 0 ? meta / totalDiasUteis : 0;

    let acumuladoRitmo = 0;
    let acumuladoReal = 0;

    return Array.from({ length: ultimoDia }, (_, i) => {
      const dia = i + 1;
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const venda = vendas.find((v) => v.data === dataStr);
      const d = new Date(ano, mes - 1, dia);
      const dow = d.getDay();
      const isDiaUtil = dow >= 1 && dow <= 5;

      if (isDiaUtil) acumuladoRitmo += metaPorDia;

      if (venda) acumuladoReal += totalVenda(venda);
      else if (dataStr === hojeStr) acumuladoReal += totalHoje;

      const isPassado = d <= hoje;

      return {
        dia,
        acumulado: isPassado ? Math.round(acumuladoReal) : null,
        ritmo: Math.round(acumuladoRitmo),
      };
    });
  }, [vendas, meta, ano, mes, totalHoje]);

  // Load data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const mid = await getMentoradoId();
      setMentoradoId(mid);
      if (!mid) { setLoading(false); return; }

      const [metaData, vendasData, vendaHojeData] = await Promise.all([
        getMetaMes(mid, mes, ano),
        getVendasMes(mid, mes, ano),
        getVendaHoje(mid),
      ]);

      setMeta(metaData?.meta_escolhida ?? 0);
      setVendas(vendasData);
      setVendaHoje(vendaHojeData);

      if (vendaHojeData) {
        setForm({
          consultas: vendaHojeData.consultas,
          injetaveis: vendaHojeData.injetaveis,
          procedimentos: vendaHojeData.procedimentos,
          hiperbarica: vendaHojeData.hiperbarica,
          outros: vendaHojeData.outros,
          clientes_unicos: vendaHojeData.clientes_unicos,
          pacientes_novos: vendaHojeData.pacientes_novos,
          orcado_total: vendaHojeData.orcado_total,
          slots_agenda: vendaHojeData.slots_agenda,
          slots_ocupados: vendaHojeData.slots_ocupados,
          no_shows: vendaHojeData.no_shows,
        });

        const snaps = await getSnapshotsHoje(vendaHojeData.id);
        if (snaps.length > 0) {
          setSnapshotForm(
            HORARIOS.map((h) => {
              const s = snaps.find((x) => x.horario === h);
              return { horario: h, orcado: s?.orcado ?? 0, realizado: s?.realizado ?? 0 };
            })
          );
        }
      }

      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!mentoradoId) return;
    setSaving(true);

    const id = await salvarVendaDiaria(mentoradoId, form);
    if (!id) {
      toast.error('Erro ao salvar lançamento');
      setSaving(false);
      return;
    }

    await salvarSnapshots(id, snapshotForm);

    // Refresh vendas
    const fresh = await getVendasMes(mentoradoId, mes, ano);
    setVendas(fresh);
    toast.success('Lançamento salvo!');
    setSaving(false);
  };

  const setField = (field: keyof VendaDiariaInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: num(value) }));
  };

  const setSnapshot = (idx: number, field: 'orcado' | 'realizado', value: string) => {
    setSnapshotForm((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: num(value) } : s))
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/40 text-sm">Carregando...</div>
      </div>
    );
  }

  if (!mentoradoId) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
        <MentoradoNav />
        <div className="text-white/40 text-sm">Conta não vinculada a um mentorado.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MentoradoNav />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 space-y-5">

        {/* Date */}
        <div className="flex items-center justify-between">
          <p className="text-white/50 text-sm capitalize">{formatDataLonga(hoje)}</p>
          {meta === 0 && (
            <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-lg">
              ⚠️ Configure a meta do mês
            </span>
          )}
        </div>

        {/* Alerta — Regra dos 2 Momentos */}
        {pctAgenda >= 0 && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
              pctAgenda < 70
                ? 'bg-amber-400/10 border-amber-400/20 text-amber-300'
                : 'bg-green-400/10 border-green-400/20 text-green-300'
            }`}
          >
            {pctAgenda < 70 ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            <span>
              {pctAgenda < 70
                ? `Agenda ${pctAgenda.toFixed(0)}% — Foco em CAPTAÇÃO`
                : `Agenda ${pctAgenda.toFixed(0)}% — Foco em TICKET MÉDIO`}
            </span>
          </div>
        )}

        {/* Gauge + KPIs */}
        <div className="card-dark p-6">
          <p className="label-meta text-center mb-4">Performance do Dia</p>
          <div className="flex justify-center mb-6">
            <SemicircleGauge percent={pctMeta} meta={metaDiaria} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Faturamento Real', value: formatBRL(totalHoje), icon: TrendingUp, color: 'text-blue-400' },
              { label: 'Meta do Dia', value: formatBRL(metaDiaria), icon: Target, color: 'text-white' },
              { label: 'Orçado Hoje', value: formatBRL(form.orcado_total), icon: ClipboardList, color: 'text-purple-400' },
              { label: 'Projeção Mês', value: formatBRL(projecao), icon: BarChart2, color: projecao >= meta ? 'text-green-400' : projecao >= meta * 0.8 ? 'text-amber-400' : 'text-red-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="label-meta">{label}</span>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          {form.orcado_total > 0 && (
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/10 text-sm">
              <span className="text-white/40">Conversão: <span className="text-white font-medium">{formatPct(conversaoOrcado)}</span></span>
              {ticketMedio > 0 && <span className="text-white/40">Ticket Médio: <span className="text-white font-medium">{formatBRL(ticketMedio)}</span></span>}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="card-dark p-6 space-y-6">
          <p className="label-meta flex items-center gap-2"><span>✏️</span> Lançamentos do Dia</p>

          {/* Receita */}
          <div>
            <p className="text-xs text-white/40 mb-3">Receita por Categoria (R$)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { field: 'consultas', label: 'Consultas' },
                { field: 'injetaveis', label: 'Injetáveis' },
                { field: 'procedimentos', label: 'Procedimentos' },
                { field: 'hiperbarica', label: 'Hiperbárica' },
                { field: 'outros', label: 'Outros' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs text-white/30 mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={form[field as keyof VendaDiariaInput] || ''}
                    onChange={(e) => setField(field as keyof VendaDiariaInput, e.target.value)}
                    placeholder="0"
                    className="input-dark"
                  />
                </div>
              ))}
              <div className="flex flex-col justify-end">
                <label className="block text-xs text-white/30 mb-1">Total</label>
                <div className="input-dark bg-blue-500/10 border-blue-500/20 text-blue-300 font-bold">
                  {formatBRL(totalHoje)}
                </div>
              </div>
            </div>
          </div>

          {/* Pacientes */}
          <div>
            <p className="text-xs text-white/40 mb-3">Pacientes</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { field: 'clientes_unicos', label: 'Clientes Únicos' },
                { field: 'pacientes_novos', label: 'Pacientes Novos' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs text-white/30 mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={form[field as keyof VendaDiariaInput] || ''}
                    onChange={(e) => setField(field as keyof VendaDiariaInput, e.target.value)}
                    placeholder="0"
                    className="input-dark"
                  />
                </div>
              ))}
              {ticketMedio > 0 && (
                <div className="col-span-2">
                  <label className="block text-xs text-white/30 mb-1">Ticket Médio</label>
                  <div className="input-dark text-green-300 font-bold">{formatBRL(ticketMedio)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Agenda */}
          <div>
            <p className="text-xs text-white/40 mb-3">Agenda & Orçado</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { field: 'slots_agenda', label: 'Slots na Agenda' },
                { field: 'slots_ocupados', label: 'Slots Ocupados' },
                { field: 'no_shows', label: 'No-shows' },
                { field: 'orcado_total', label: 'Total Orçado (R$)' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs text-white/30 mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={form[field as keyof VendaDiariaInput] || ''}
                    onChange={(e) => setField(field as keyof VendaDiariaInput, e.target.value)}
                    placeholder="0"
                    className="input-dark"
                  />
                </div>
              ))}
            </div>
            {pctAgenda >= 0 && (
              <p className={`text-xs mt-2 font-medium ${pctAgenda < 70 ? 'text-amber-400' : 'text-green-400'}`}>
                Ocupação: {pctAgenda.toFixed(0)}%
                {pctAgenda < 70 ? ' — Foco em captação' : ' — Foco em ticket médio'}
              </p>
            )}
          </div>

          {/* Snapshots */}
          <div>
            <p className="text-xs text-white/40 mb-3">Snapshots do Dia</p>
            <div className="grid grid-cols-3 gap-3">
              {snapshotForm.map((snap, idx) => {
                const conv = snap.orcado > 0 ? (snap.realizado / snap.orcado) * 100 : null;
                return (
                  <div key={snap.horario} className="bg-white/5 rounded-xl p-3 space-y-2">
                    <p className="text-sm font-semibold text-white/70 text-center">{HORARIOS_LABEL[idx]}</p>
                    <div>
                      <label className="text-xs text-white/30">Orçado</label>
                      <input
                        type="number"
                        min="0"
                        value={snap.orcado || ''}
                        onChange={(e) => setSnapshot(idx, 'orcado', e.target.value)}
                        placeholder="0"
                        className="input-dark text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/30">Realizado</label>
                      <input
                        type="number"
                        min="0"
                        value={snap.realizado || ''}
                        onChange={(e) => setSnapshot(idx, 'realizado', e.target.value)}
                        placeholder="0"
                        className="input-dark text-sm"
                      />
                    </div>
                    {conv !== null && (
                      <p className={`text-xs text-center font-bold ${conv < 50 ? 'text-red-400' : conv < 80 ? 'text-amber-400' : 'text-green-400'}`}>
                        {formatPct(conv)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Lançamento'}
          </button>
        </div>

        {/* Evolução Chart */}
        <div className="card-dark p-6">
          <p className="label-meta mb-4">Evolução Diária — {new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' })} {ano}</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradAcumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="dia"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                ticks={[1, 5, 10, 15, 20, 25, 30]}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: 'hsl(222,55%,13%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                formatter={(value: number, name: string) => [
                  formatBRL(value),
                  name === 'acumulado' ? 'Acumulado' : 'Ritmo Ideal',
                ]}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    {value === 'acumulado' ? 'Acumulado' : 'Ritmo Ideal'}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="ritmo"
                stroke="#f87171"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                fill="none"
                dot={false}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="acumulado"
                stroke="#60a5fa"
                strokeWidth={2}
                fill="url(#gradAcumulado)"
                dot={false}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Inteligência Clínica */}
        <div className="card-dark p-6 border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <p className="text-sm font-semibold text-white">Inteligência Clínica</p>
            </div>
            <button className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
              Gerar Análise
            </button>
          </div>
          <p className="text-sm text-white/30 italic">
            {totalHoje > 0
              ? `Hoje: ${formatBRL(totalHoje)} realizado de ${formatBRL(metaDiaria)} de meta (${formatPct(pctMeta)}). Acumulado do mês: ${formatBRL(acumuladoTotal)} de ${formatBRL(meta)}.`
              : 'Nenhum lançamento realizado hoje.'}
          </p>
        </div>

      </div>
    </div>
  );
}
