-- Especificação v2 (12/09/2026), secções 2/3/8 — badges e travessias.
-- Implementado a 19/09/2026.
--
-- Como aplicar: Supabase → SQL Editor → cola isto tudo → Run.
-- Seguro correr mais do que uma vez (idempotente): usa
-- "IF NOT EXISTS", não apaga nada.

-- 1. `cycles` — uma travessia é o período entre o primeiro registo de um
--    ciclo e uma interrupção longa (30 dias sem registo, secção 3).
--    `number` é interno/relatório — nunca mostrado sozinho na interface.
--    `days_logged` conta dias distintos com registo dentro do ciclo;
--    ciclos com menos de 3 fundem-se no seguinte (travessia-fantasma,
--    secção 3, regra 3) — decidido ao nível da app, não da BD.
CREATE TABLE IF NOT EXISTS cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number int NOT NULL,
  started_on date NOT NULL,
  ended_on date,
  days_logged int NOT NULL DEFAULT 0,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, number)
);
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cycles_select_own" ON cycles;
DROP POLICY IF EXISTS "cycles_insert_own" ON cycles;
DROP POLICY IF EXISTS "cycles_update_own" ON cycles;
DROP POLICY IF EXISTS "cycles_delete_own" ON cycles;
CREATE POLICY "cycles_select_own" ON cycles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cycles_insert_own" ON cycles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cycles_update_own" ON cycles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cycles_delete_own" ON cycles FOR DELETE USING (auth.uid() = user_id);

-- 2. `badges` — cada linha é uma conquista ganha numa data. Badges
--    "únicos" têm uma linha por travessia (secção 2, "renascem a cada
--    travessia nova"); "repetíveis" têm uma linha por ocorrência e
--    atravessam travessias sem restrição.
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  earned_at date NOT NULL,
  cycle_id uuid REFERENCES cycles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id, earned_at)
);
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_select_own" ON badges;
DROP POLICY IF EXISTS "badges_insert_own" ON badges;
DROP POLICY IF EXISTS "badges_delete_own" ON badges;
CREATE POLICY "badges_select_own" ON badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "badges_insert_own" ON badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "badges_delete_own" ON badges FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS badges_user_badge_idx ON badges (user_id, badge_id);
CREATE INDEX IF NOT EXISTS badges_user_date_idx ON badges (user_id, earned_at);

-- 3. `first_logged_at` em `days` — carimbo de quando um dia foi tocado
--    pela primeira vez (não é a data do registo, é o instante real).
--    Necessário para o badge #5 "Primeira fruta" (registos antes das
--    10h) — nunca é reescrito depois do primeiro insert, porque não
--    entra no payload dos upserts seguintes (ver saveDayRemote em
--    DataContext.js): o Postgres só aplica o DEFAULT no INSERT e
--    ignora a coluna no UPDATE do upsert.
ALTER TABLE days ADD COLUMN IF NOT EXISTS first_logged_at timestamptz DEFAULT now();
