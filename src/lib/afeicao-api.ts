import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MetaMes {
  id: string;
  mentorado_id: string;
  mes: number;
  ano: number;
  dias_trabalhados: number;
  pct_pessimista: number;
  pct_realista: number;
  pct_otimista: number;
  cenario_escolhido: string | null;
  meta_escolhida: number;
}

export interface VendaDiaria {
  id: string;
  mentorado_id: string;
  data: string; // ISO date string 'YYYY-MM-DD'
  consultas: number;
  injetaveis: number;
  procedimentos: number;
  hiperbarica: number;
  outros: number;
  clientes_unicos: number;
  pacientes_novos: number;
  orcado_total: number;
  slots_agenda: number;
  slots_ocupados: number;
  no_shows: number;
  dia_trabalhado: boolean;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface SnapshotHorario {
  id: string;
  venda_diaria_id: string;
  horario: string; // '12:00:00' | '18:00:00' | '21:00:00'
  orcado: number;
  realizado: number;
}

export interface VendaDiariaInput {
  consultas: number;
  injetaveis: number;
  procedimentos: number;
  hiperbarica: number;
  outros: number;
  clientes_unicos: number;
  pacientes_novos: number;
  orcado_total: number;
  slots_agenda: number;
  slots_ocupados: number;
  no_shows: number;
  observacao?: string;
}

export interface SnapshotInput {
  horario: string;
  orcado: number;
  realizado: number;
}

export type ZonaCBR = 'sobrevivencia' | 'pressao' | 'conforto' | 'crescimento' | 'escala';

export interface MixReceita {
  consultas: number;
  injetaveis: number;
  procedimentos: number;
  hiperbarica: number;
  outros: number;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function getMentoradoId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await db
    .from('mentorados')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return data?.id ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.user_metadata?.role === 'admin';
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export async function getMetaMes(
  mentoradoId: string,
  mes: number,
  ano: number
): Promise<MetaMes | null> {
  const { data, error } = await db
    .from('metas_mensais')
    .select('*')
    .eq('mentorado_id', mentoradoId)
    .eq('mes', mes)
    .eq('ano', ano)
    .single();

  if (error) return null;
  return data as MetaMes;
}

// ─── Vendas ───────────────────────────────────────────────────────────────────

export async function getVendasMes(
  mentoradoId: string,
  mes: number,
  ano: number
): Promise<VendaDiaria[]> {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fimDate = new Date(ano, mes, 0); // last day of month
  const fim = fimDate.toISOString().split('T')[0];

  const { data, error } = await db
    .from('vendas_diarias')
    .select('*')
    .eq('mentorado_id', mentoradoId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: true });

  if (error) return [];
  return (data ?? []) as VendaDiaria[];
}

export async function getVendaHoje(mentoradoId: string): Promise<VendaDiaria | null> {
  const hoje = new Date().toISOString().split('T')[0];
  const { data } = await db
    .from('vendas_diarias')
    .select('*')
    .eq('mentorado_id', mentoradoId)
    .eq('data', hoje)
    .single();
  return data ?? null;
}

export async function getSnapshotsHoje(vendaDiariaId: string): Promise<SnapshotHorario[]> {
  const { data } = await db
    .from('snapshots_horarios')
    .select('*')
    .eq('venda_diaria_id', vendaDiariaId)
    .order('horario', { ascending: true });
  return (data ?? []) as SnapshotHorario[];
}

export async function salvarVendaDiaria(
  mentoradoId: string,
  input: VendaDiariaInput,
  data?: string
): Promise<string | null> {
  const dataStr = data ?? new Date().toISOString().split('T')[0];

  const { data: result, error } = await db
    .from('vendas_diarias')
    .upsert(
      {
        mentorado_id: mentoradoId,
        data: dataStr,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'mentorado_id,data' }
    )
    .select('id')
    .single();

  if (error) {
    console.error('Erro ao salvar venda:', error);
    return null;
  }
  return result?.id ?? null;
}

export async function salvarSnapshots(
  vendaDiariaId: string,
  snapshots: SnapshotInput[]
): Promise<boolean> {
  const rows = snapshots.map((s) => ({
    venda_diaria_id: vendaDiariaId,
    horario: s.horario,
    orcado: s.orcado,
    realizado: s.realizado,
  }));

  const { error } = await db
    .from('snapshots_horarios')
    .upsert(rows, { onConflict: 'venda_diaria_id,horario' });

  if (error) {
    console.error('Erro ao salvar snapshots:', error);
    return false;
  }
  return true;
}

// ─── Business Logic ────────────────────────────────────────────────────────────

export function totalVenda(v: VendaDiaria): number {
  return v.consultas + v.injetaveis + v.procedimentos + v.hiperbarica + v.outros;
}

export function calcularTotalMes(vendas: VendaDiaria[]): number {
  return vendas.reduce((sum, v) => sum + totalVenda(v), 0);
}

/** Count Mon-Fri working days from startDate to endDate (inclusive) */
export function contarDiasUteis(startDate: Date, endDate: Date): number {
  let count = 0;
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  while (d <= end) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) count++; // Mon-Fri
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/** Working days remaining in the month from today (inclusive) */
export function diasUteisRestantesNoMes(ano: number, mes: number): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ultimoDia = new Date(ano, mes, 0); // last day of month
  if (hoje > ultimoDia) return 0;
  const inicio = hoje;
  return contarDiasUteis(inicio, ultimoDia);
}

/** Working days remaining from tomorrow */
export function diasUteisAPartirDeAmanha(ano: number, mes: number): number {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);
  const ultimoDia = new Date(ano, mes, 0);
  if (amanha > ultimoDia) return 0;
  return contarDiasUteis(amanha, ultimoDia);
}

/** Total working days in the month */
export function totalDiasUteisMes(ano: number, mes: number): number {
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0);
  return contarDiasUteis(inicio, fim);
}

export function calcularMetaDiaria(
  metaTotal: number,
  acumuladoAteOntem: number,
  diasRestantes: number
): number {
  if (diasRestantes <= 0) return 0;
  return Math.max(0, metaTotal - acumuladoAteOntem) / diasRestantes;
}

export function calcularProjecao(
  acumuladoTotal: number,
  diasTrabalhados: number,
  diasRestantesAmanha: number
): number {
  if (diasTrabalhados <= 0) return acumuladoTotal;
  const mediaDiaria = acumuladoTotal / diasTrabalhados;
  return acumuladoTotal + mediaDiaria * diasRestantesAmanha;
}

export function calcularZonaCBR(projecao: number, meta: number): ZonaCBR {
  if (!meta || meta <= 0) return 'pressao';
  const pct = projecao / meta;
  if (pct < 0.4) return 'sobrevivencia';
  if (pct < 0.7) return 'pressao';
  if (pct < 0.9) return 'conforto';
  if (pct < 1.2) return 'crescimento';
  return 'escala';
}

export const ZONA_CONFIG: Record<ZonaCBR, { label: string; color: string; desc: string }> = {
  sobrevivencia: {
    label: 'Sobrevivência',
    color: 'text-red-400',
    desc: 'Receita abaixo do necessário para cobrir os custos do consultório.',
  },
  pressao: {
    label: 'Pressão',
    color: 'text-amber-400',
    desc: 'Operando, mas sem margem de segurança. Foco total na meta.',
  },
  conforto: {
    label: 'Conforto',
    color: 'text-blue-400',
    desc: 'Boa performance. Hora de otimizar ticket médio e recorrência.',
  },
  crescimento: {
    label: 'Crescimento',
    color: 'text-green-400',
    desc: 'Superando a meta. Estruture o próximo nível de oferta.',
  },
  escala: {
    label: 'Escala',
    color: 'text-purple-400',
    desc: 'Acima de 120% da meta. Modelo funcionando — hora de replicar.',
  },
};

export function calcularMixReceita(vendas: VendaDiaria[]): MixReceita {
  const total = vendas.reduce(
    (acc, v) => ({
      consultas: acc.consultas + v.consultas,
      injetaveis: acc.injetaveis + v.injetaveis,
      procedimentos: acc.procedimentos + v.procedimentos,
      hiperbarica: acc.hiperbarica + v.hiperbarica,
      outros: acc.outros + v.outros,
    }),
    { consultas: 0, injetaveis: 0, procedimentos: 0, hiperbarica: 0, outros: 0 }
  );
  return total;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

const DIAS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function formatDataLonga(date: Date): string {
  const dia = DIAS_PT[date.getDay()];
  const mes = MESES_PT[date.getMonth()];
  return `${dia}, ${date.getDate()} de ${mes} de ${date.getFullYear()}`;
}

export function nomeMes(mes: number): string {
  return MESES_PT[mes - 1] ?? '';
}

export function nomeMesCurto(mes: number, ano: number): string {
  return `${MESES_CURTOS[mes - 1]}/${String(ano).slice(2)}`;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface MentoradoResumo {
  id: string;
  nome: string;
  especialidade: string;
  cidade: string;
  metaMes: number;
  acumuladoMes: number;
  pctMeta: number;
  zonaCBR: ZonaCBR;
}

export async function listarMentoradosComPerformance(): Promise<MentoradoResumo[]> {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  const { data: mentorados } = await db
    .from('mentorados')
    .select('id, nome, especialidade, cidade')
    .order('nome');

  if (!mentorados) return [];

  const resultado: MentoradoResumo[] = [];

  for (const m of mentorados) {
    const meta = await getMetaMes(m.id, mes, ano);
    const vendas = await getVendasMes(m.id, mes, ano);
    const acumulado = calcularTotalMes(vendas);
    const metaTotal = meta?.meta_escolhida ?? 0;
    const pct = metaTotal > 0 ? (acumulado / metaTotal) * 100 : 0;
    const projecao = calcularProjecao(
      acumulado,
      vendas.filter((v) => totalVenda(v) > 0).length,
      diasUteisAPartirDeAmanha(ano, mes)
    );

    resultado.push({
      id: m.id,
      nome: m.nome,
      especialidade: m.especialidade ?? '',
      cidade: m.cidade ?? '',
      metaMes: metaTotal,
      acumuladoMes: acumulado,
      pctMeta: pct,
      zonaCBR: calcularZonaCBR(projecao, metaTotal),
    });
  }

  return resultado;
}
