-- =============================================
-- Aferição da META — Tracking Diário de Vendas
-- Executar no SQL Editor do Supabase (projeto cbr-journey)
-- =============================================

-- Tabela principal: lançamentos diários por categoria
CREATE TABLE IF NOT EXISTS vendas_diarias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id uuid NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
  data date NOT NULL,

  -- Categorias de receita (mesmo padrão da planilha)
  consultas numeric NOT NULL DEFAULT 0,
  injetaveis numeric NOT NULL DEFAULT 0,
  procedimentos numeric NOT NULL DEFAULT 0,
  hiperbarica numeric NOT NULL DEFAULT 0,
  outros numeric NOT NULL DEFAULT 0,

  -- Métricas de pacientes
  clientes_unicos int NOT NULL DEFAULT 0,
  pacientes_novos int NOT NULL DEFAULT 0,

  -- Agenda e capacidade
  orcado_total numeric NOT NULL DEFAULT 0,
  slots_agenda int NOT NULL DEFAULT 0,
  slots_ocupados int NOT NULL DEFAULT 0,
  no_shows int NOT NULL DEFAULT 0,

  -- Metadata
  dia_trabalhado boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(mentorado_id, data)
);

-- Snapshots intraday (12h, 18h, 21h)
CREATE TABLE IF NOT EXISTS snapshots_horarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_diaria_id uuid NOT NULL REFERENCES vendas_diarias(id) ON DELETE CASCADE,
  horario time NOT NULL,         -- '12:00:00', '18:00:00', '21:00:00'
  orcado numeric NOT NULL DEFAULT 0,
  realizado numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(venda_diaria_id, horario)
);

-- =============================================
-- RLS — vendas_diarias
-- =============================================
ALTER TABLE vendas_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_diarias_select" ON vendas_diarias
  FOR SELECT USING (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "vendas_diarias_insert" ON vendas_diarias
  FOR INSERT WITH CHECK (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "vendas_diarias_update" ON vendas_diarias
  FOR UPDATE
  USING (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "vendas_diarias_delete" ON vendas_diarias
  FOR DELETE USING (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- =============================================
-- RLS — snapshots_horarios (via vendas_diarias)
-- =============================================
ALTER TABLE snapshots_horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_select" ON snapshots_horarios
  FOR SELECT USING (
    venda_diaria_id IN (
      SELECT id FROM vendas_diarias
      WHERE mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "snapshots_insert" ON snapshots_horarios
  FOR INSERT WITH CHECK (
    venda_diaria_id IN (
      SELECT id FROM vendas_diarias
      WHERE mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "snapshots_update" ON snapshots_horarios
  FOR UPDATE
  USING (
    venda_diaria_id IN (
      SELECT id FROM vendas_diarias
      WHERE mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    venda_diaria_id IN (
      SELECT id FROM vendas_diarias
      WHERE mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "snapshots_delete" ON snapshots_horarios
  FOR DELETE USING (
    venda_diaria_id IN (
      SELECT id FROM vendas_diarias
      WHERE mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
