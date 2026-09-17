-- Especificação v2 (12/09/2026), secção 1 — sistema âncora/observação.
-- Substitui o item 8 antigo do focus group ("Perfect! só ativa com tudo
-- cumprido"): campos passam a ter um tipo (kind) que decide se contam
-- para o Perfect!/score ("âncora") ou se são só para olhar para trás
-- ("observação", nunca bloqueia nada).
--
-- Como aplicar: Supabase → SQL Editor → cola isto tudo → Run.
-- Seguro correr mais do que uma vez (idempotente): usa
-- "IF NOT EXISTS"/"ADD COLUMN IF NOT EXISTS", não apaga nada.

-- 1. Tipo do campo. Todos os campos já existentes ficam 'anchor' por
--    omissão (nada muda de comportamento para quem já tinha campos —
--    continuam a contar para o Perfect! como sempre contaram).
ALTER TABLE fields ADD COLUMN IF NOT EXISTS kind text
  CHECK (kind IN ('anchor', 'observation')) DEFAULT 'anchor';

-- 2. Fotografia de que campos eram âncora no momento de cada registo
--    (secção 1.3, ponto 4) — para que mudar o tipo de um campo mais
--    tarde em Configurações não reescreva o significado de dias já
--    registados. Gravado a partir de agora em cada `updateDay`; dias
--    antigos ficam com este campo vazio (nunca existiu essa distinção
--    antes desta versão, não há como reconstruir com rigor).
ALTER TABLE days ADD COLUMN IF NOT EXISTS anchor_ids jsonb DEFAULT '[]'::jsonb;
