import { COLORS } from '../theme';

export const COLOR_OPTIONS = [
  COLORS.c1, COLORS.c2, COLORS.c3, COLORS.c4, COLORS.c5,
  COLORS.c6, COLORS.c7, COLORS.c8, COLORS.c9, COLORS.c10,
];

export const SHAPE_OPTIONS = [
  'circle', 'square', 'triangle', 'diamond', 'plus',
  'star', 'hexagon', 'pentagon', 'arrow', 'ring',
];

// Sugestões mostradas (a picotado, não funcionais) na primeira visita
// à aba Hoje, antes de o utilizador configurar os seus próprios campos
// — ver hoje.suggestedTitle/suggestedHint e fields.suggested.* em
// translations.js. Tocar numa delas navega para Configurações; não são
// guardadas na BD, servem só de inspiração visual.
export function suggestedFields(t) {
  return [
    { key: 'reading', name: t('fields.suggested.reading'), color: COLORS.c1, shape: 'circle' },
    { key: 'meditation', name: t('fields.suggested.meditation'), color: COLORS.c2, shape: 'triangle' },
    { key: 'exercise', name: t('fields.suggested.exercise'), color: COLORS.c3, shape: 'square' },
    { key: 'water', name: t('fields.suggested.water'), color: COLORS.c5, shape: 'ring' },
    { key: 'sleep', name: t('fields.suggested.sleep'), color: COLORS.c4, shape: 'diamond' },
  ];
}

export function seedFields() {
  return [
    { id: 'seed_meal', name: 'Alimentação', type: 'bool', color: COLORS.c3, shape: 'square' },
    { id: 'seed_gym', name: 'Ginásio', type: 'bool', color: COLORS.c1, shape: 'circle' },
    { id: 'seed_water', name: 'Água', type: 'count', color: COLORS.c5, shape: 'ring', target: 8, metric: 'copos', step: 1 },
    { id: 'seed_bed', name: 'Sono', type: 'count', color: COLORS.c2, shape: 'triangle', target: 8, metric: 'horas', step: 1 },
    { id: 'seed_food', name: 'Registo Yazio', type: 'bool', color: COLORS.c4, shape: 'diamond' },
  ];
}

export function genId() {
  return 'f' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

export function usedColors(fields, editId) {
  return fields.filter((f) => f.id !== editId).map((f) => f.color);
}
export function usedShapes(fields, editId) {
  return fields.filter((f) => f.id !== editId).map((f) => f.shape);
}
export function firstAvailable(list, used) {
  return list.find((v) => !used.includes(v)) || list[0];
}
export function decimalsOf(step) {
  const s = String(step);
  const p = s.indexOf('.');
  return p === -1 ? 0 : s.length - p - 1;
}

export function blankDay() {
  return { custom: {}, mood: 0, therapy: false, perfect: false };
}

// Upgrades a day object saved under the old hardcoded-field schema
// (gym/bed/water/food/meal booleans/numbers directly on the day) into
// the new dynamic `custom` map, keyed by the matching seed field id.
export function migrateDay(day) {
  if (!day.custom) {
    day.custom = {
      seed_meal: !!day.meal,
      seed_gym: !!day.gym,
      seed_water: day.water || 0,
      seed_bed: day.bed || 0,
      seed_food: !!day.food,
    };
  }
  if (day.mood === undefined) day.mood = 0;
  if (day.therapy === undefined) day.therapy = false;
  if (day.perfect === undefined) day.perfect = false;
  return day;
}

export function fieldValue(day, f) {
  const v = day.custom[f.id];
  if (v !== undefined) return v;
  return f.type === 'bool' ? false : 0;
}

export function fieldOk(day, f) {
  const v = fieldValue(day, f);
  return f.type === 'bool' ? !!v : v >= f.target;
}

// Percentagem de cumprimento de UM campo num dia (0 a 1) — usado no
// calendário de partilha filtrado por campo (21/09/2026): um campo
// booleano vale 1 (marcado) ou 0 (não marcado); um campo métrico vale
// valor/meta, limitado a [0,1]. Sem meta definida (campo só com passo,
// sem alvo), conta como cumprido assim que houver qualquer valor
// registado, para não ficar sempre a 0%.
export function fieldPercent(day, f) {
  const v = fieldValue(day, f);
  if (f.type === 'bool') return v ? 1 : 0;
  const target = f.target;
  if (!target || target <= 0) return v > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, v / target));
}

// Sistema âncora/observação (especificação v2, 12/09/2026, secção 1):
// campos-âncora são o que a pessoa quer mesmo cumprir e contam para o
// Perfect!/score; campos de observação só servem para olhar para trás,
// sem pressão de cumprir. Campos antigos (de antes desta distinção
// existir) não têm `kind` gravado — tratados como âncora por omissão,
// tal como o valor por omissão da coluna `kind` na BD (ver migração
// supabase/sql/anchor_observation_fields.sql).
export function fieldKind(f) {
  return f.kind === 'observation' ? 'observation' : 'anchor';
}
export function anchorFields(customFields) {
  return customFields.filter((f) => fieldKind(f) !== 'observation');
}
export function observationFields(customFields) {
  return customFields.filter((f) => fieldKind(f) === 'observation');
}
// Acima deste número de âncoras, Configurações mostra um aviso suave
// (nunca bloqueia) — décimo passo confirmado com a Tania a 13/09/2026.
export const ANCHOR_WARNING_THRESHOLD = 4;

// Score/anel: passa a medir só os campos-âncora (secção 1.3, ponto 3 —
// decisão fechada a 13/09/2026). O ProudOfMe deixou de valer pontos —
// é só uma marca emocional, desbloqueada por `hasAnyLog` abaixo — para
// não esvaziar o número agora que desbloqueia sempre que há qualquer
// registo no dia.
export function maxScore(customFields) {
  return anchorFields(customFields).length;
}

export function currentScore(day, customFields) {
  let score = 0;
  anchorFields(customFields).forEach((f) => {
    if (fieldOk(day, f)) score++;
  });
  return score;
}

// ProudOfMe (secção 1.2): desbloqueia assim que há QUALQUER registo no
// dia — qualquer campo (âncora ou observação) preenchido, ou a Energia
// marcada. Não conta o próprio ProudOfMe, para não se desbloquear a
// si mesmo.
export function hasAnyLog(day, customFields) {
  if (day.mood) return true;
  return customFields.some((f) => {
    const v = fieldValue(day, f);
    return f.type === 'bool' ? !!v : v > 0;
  });
}

// Escala de energia — 5 emojis (sad → happy), substituindo o antigo
// campo numérico livre de 1 a 5. `value` continua a ser guardado como
// 0 (por preencher) a 5; os emojis mapeiam 1→emoji0 ... 5→emoji4.
export function energiaOptions(t) {
  return [1, 2, 3, 4, 5].map((value, i) => ({
    value,
    emoji: t(`energia.emoji${i}`),
    label: t(`energia.label${value}`),
  }));
}

export function scoreMessage(score, max, t) {
  if (max <= 0) return t('score.empty');
  if (score === 0) return t('score.zero');
  if (score === max) return t('score.complete');
  const tiers = 5;
  const idx = Math.min(
    tiers - 1,
    Math.floor(((score - 1) / Math.max(1, max - 1)) * tiers)
  );
  return t(`score.tier${idx}`);
}
