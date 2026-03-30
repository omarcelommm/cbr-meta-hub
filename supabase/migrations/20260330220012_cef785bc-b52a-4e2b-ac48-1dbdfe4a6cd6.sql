
-- 1. Mentorados table
CREATE TABLE IF NOT EXISTS mentorados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  nome text,
  especialidade text,
  cidade text
);

ALTER TABLE mentorados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mentorados_select" ON mentorados
  FOR SELECT USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "mentorados_insert" ON mentorados
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "mentorados_update" ON mentorados
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  ) WITH CHECK (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 2. Vendas diárias
CREATE TABLE IF NOT EXISTS vendas_diarias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id uuid NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
  data date NOT NULL,
  consultas numeric NOT NULL DEFAULT 0,
  injetaveis numeric NOT NULL DEFAULT 0,
  procedimentos numeric NOT NULL DEFAULT 0,
  hiperbarica numeric NOT NULL DEFAULT 0,
  outros numeric NOT NULL DEFAULT 0,
  clientes_unicos int NOT NULL DEFAULT 0,
  pacientes_novos int NOT NULL DEFAULT 0,
  orcado_total numeric NOT NULL DEFAULT 0,
  slots_agenda int NOT NULL DEFAULT 0,
  slots_ocupados int NOT NULL DEFAULT 0,
  no_shows int NOT NULL DEFAULT 0,
  dia_trabalhado boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mentorado_id, data)
);

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
  FOR UPDATE USING (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  ) WITH CHECK (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "vendas_diarias_delete" ON vendas_diarias
  FOR DELETE USING (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 3. Snapshots horários
CREATE TABLE IF NOT EXISTS snapshots_horarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_diaria_id uuid NOT NULL REFERENCES vendas_diarias(id) ON DELETE CASCADE,
  horario time NOT NULL,
  orcado numeric NOT NULL DEFAULT 0,
  realizado numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(venda_diaria_id, horario)
);

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
  FOR UPDATE USING (
    venda_diaria_id IN (
      SELECT id FROM vendas_diarias
      WHERE mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  ) WITH CHECK (
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

-- 4. Metas mensais (referenced in afeicao-api.ts)
CREATE TABLE IF NOT EXISTS metas_mensais (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id uuid NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
  mes int NOT NULL,
  ano int NOT NULL,
  dias_trabalhados int NOT NULL DEFAULT 22,
  pct_pessimista numeric NOT NULL DEFAULT 0,
  pct_realista numeric NOT NULL DEFAULT 0,
  pct_otimista numeric NOT NULL DEFAULT 0,
  cenario_escolhido text,
  meta_escolhida numeric NOT NULL DEFAULT 0,
  UNIQUE(mentorado_id, mes, ano)
);

ALTER TABLE metas_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas_mensais_select" ON metas_mensais
  FOR SELECT USING (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "metas_mensais_insert" ON metas_mensais
  FOR INSERT WITH CHECK (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "metas_mensais_update" ON metas_mensais
  FOR UPDATE USING (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  ) WITH CHECK (
    mentorado_id IN (SELECT id FROM mentorados WHERE user_id = auth.uid())
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
