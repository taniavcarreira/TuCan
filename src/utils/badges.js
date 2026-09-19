// Badges e travessias — especificação v2, secções 2 e 3 (12/09/2026),
// implementados a 19/09/2026.
//
// Este ficheiro é puro (sem Supabase, sem React): recebe o histórico de
// dias do utilizador + os campos atuais, e devolve travessias e badges
// já calculados. `src/context/DataContext.js` é quem chama isto depois
// de cada gravação e sincroniza o resultado com as tabelas `cycles` e
// `badges` (ver supabase/sql/badges_cycles.sql).
//
// Duas aproximações assumidas de propósito (confirmadas com a Tania a
// 19/09/2026, para não bloquear a entrega à espera de funcionalidades
// que ainda não existem):
//
//   1. Badge #5 "Primeira fruta" (registos antes das 10h) usa a nova
//      coluna `first_logged_at` (carimbo real de quando o dia foi
//      tocado pela primeira vez) — não existe ainda histórico para
//      dias gravados antes desta versão, por isso só conta a partir de
//      agora.
//   2. Badge #7 "Salto" (spec: "modo mini (1%) usado em 5 dias
//      diferentes") não tem, ainda, um "modo mini" na app. Aproximação:
//      conta como "salto" um dia em que um campo de contagem foi
//      registado com o valor mais pequeno possível (== ao seu `step`,
//      ou seja, um toque simbólico) sem chegar à meta — o equivalente a
//      "fiz só um bocadinho, mas fiz".
//
// Regra de prioridade num dia com mais do que um badge a bater ponto
// (secção 2, "máximo um badge por dia"): #10 Orgulho nu ganha sempre a
// #3 Planeio (recomendação da própria especificação — "(b) Separar",
// prioridade ao comportamento mais difícil); para o resto, ganha o de
// número mais baixo. A parte de "guardar o outro para o dia seguinte"
// não está implementada — colisões fora do par #3/#10 são
// extremamente raras (a maioria dos critérios só pode calhar num dia
// muito específico da travessia) e o custo de manter uma fila de
// badges "em espera" não compensava para este caso limite.

import { fieldOk } from './fields';

export const BADGE_ORDER = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12'];

// Ordem de desempate: #10 primeiro (prioridade explícita sobre #3),
// depois ordem numérica normal.
const PRIORITY = ['b10', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b11', 'b12'];

export const PHASES = {
  entrada: { key: 'entrada', color: 'mostarda' },
  honestidade: { key: 'honestidade', color: 'coral' },
  consolidacao: { key: 'consolidacao', color: 'agua' },
  longo: { key: 'longo', color: 'azul' },
};

// `shape` é lido por src/components/BadgeIcon.js — ver secção 6 da
// especificação (vocabulário Bauhaus: círculo, quadrado, triângulo,
// meio-círculo, arco).
export const BADGE_DEFS = {
  b1: { order: 1, kind: 'unique', phase: 'entrada', shape: 'dot', i18n: 'b1' },
  b2: { order: 2, kind: 'unique', phase: 'entrada', shape: 'tri1', i18n: 'b2' },
  b3: { order: 3, kind: 'repeatable', phase: 'entrada', shape: 'square', i18n: 'b3' },
  b4: { order: 4, kind: 'repeatable', phase: 'honestidade', shape: 'arc', i18n: 'b4' },
  b5: { order: 5, kind: 'repeatable', phase: 'honestidade', shape: 'half', i18n: 'b5' },
  b6: { order: 6, kind: 'unique', phase: 'honestidade', shape: 'circleSquare', i18n: 'b6' },
  b7: { order: 7, kind: 'repeatable', phase: 'consolidacao', shape: 'hop', i18n: 'b7' },
  b8: { order: 8, kind: 'unique', phase: 'consolidacao', shape: 'tri2', i18n: 'b8' },
  b9: { order: 9, kind: 'repeatable', phase: 'consolidacao', shape: 'halfRot', i18n: 'b9' },
  b10: { order: 10, kind: 'repeatable', phase: 'consolidacao', shape: 'bareHead', i18n: 'b10' },
  b11: { order: 11, kind: 'unique', phase: 'longo', shape: 'tri3', i18n: 'b11' },
  b12: { order: 12, kind: 'unique', phase: 'longo', shape: 'triCircle', i18n: 'b12' },
};

export function isUnique(badgeId) {
  return BADGE_DEFS[badgeId]?.kind === 'unique';
}

function diffDays(a, b) {
  // a, b: 'YYYY-MM-DD'. Devolve a - b em dias inteiros.
  const da = new Date(a + 'T00:00:00Z');
  const db = new Date(b + 'T00:00:00Z');
  return Math.round((da - db) / 86400000);
}

// Um dia "com registo" — qualquer campo preenchido (âncora ou
// observação) ou energia marcada. Não depende dos campos atuais
// existirem, só do que ficou gravado nesse dia (fields.js#hasAnyLog
// exige a lista de campos; aqui não a temos sempre disponível para
// dias históricos com campos entretanto apagados).
function hasAnyLogHistoric(day) {
  if (day.mood) return true;
  return Object.values(day.custom || {}).some((v) => v === true || (typeof v === 'number' && v > 0));
}

// Verifica se, num dia, NENHUMA das âncoras que existiam nesse
// registo (fotografia `anchor_ids`, secção 1.3 ponto 4) foi cumprida.
// Exige pelo menos uma âncora conhecida nesse dia — um dia sem âncoras
// definidas não é "planeio", é só um dia sem esse conceito ainda.
function zeroAnchorsFulfilled(day, fieldsById) {
  const ids = day.anchor_ids || [];
  const knownAnchors = ids.map((id) => fieldsById[id]).filter(Boolean);
  if (knownAnchors.length === 0) return false;
  return knownAnchors.every((f) => !fieldOk(day, f));
}

function isEarlyLog(day) {
  if (!day.first_logged_at) return false;
  const hour = new Date(day.first_logged_at).getHours();
  return hour < 10;
}

// Aproximação do "modo mini" — ver nota no topo do ficheiro.
function isHopDay(day, fieldsById) {
  const ids = day.anchor_ids || Object.keys(day.custom || {});
  return Object.keys(day.custom || {}).some((id) => {
    const f = fieldsById[id];
    if (!f || f.type !== 'count') return false;
    const v = day.custom[id];
    const step = f.step || 1;
    if (!(v > 0)) return false;
    if (f.target && v >= f.target) return false; // chegou à meta, não é "só um bocadinho"
    return v <= step;
  });
}

/**
 * @param {Array} daysRows - todas as linhas de `days` do utilizador,
 *   cada uma com { date, custom, mood, therapy, perfect, anchor_ids,
 *   first_logged_at }, em qualquer ordem.
 * @param {Array} customFields - campos atuais (para saber tipo/target
 *   das âncoras guardadas em anchor_ids, e dos campos de contagem para
 *   o badge #7).
 * @returns {{ cycles: Array, earned: Array }}
 *   cycles: [{ number, id, startedOn, daysLogged }]  (o último pode
 *     ainda estar "aberto", sem ended_on — fecho fica a cargo de quem
 *     sincroniza com a BD, comparando com a data de hoje)
 *   earned: [{ badgeId, date, cycleId, cycleNumber }]  — uma entrada
 *     por dia com um badge atribuído.
 */
export function evaluateBadgesAndCycles(daysRows, customFields) {
  const fieldsById = {};
  customFields.forEach((f) => { fieldsById[f.id] = f; });

  const loggedDays = (daysRows || [])
    .filter(hasAnyLogHistoric)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const cycles = [];
  let currentCycle = null;
  let prevDate = null;
  let earlyLogCount = 0;
  let hopCount = 0;
  let energyCount = 0;
  const earned = [];

  for (const day of loggedDays) {
    const gap = prevDate ? diffDays(day.date, prevDate) : null;
    if (!currentCycle || gap > 30) {
      currentCycle = {
        number: cycles.length + 1,
        id: `cycle-${day.date}`,
        startedOn: day.date,
        lastDate: day.date,
        daysLogged: 0,
      };
      cycles.push(currentCycle);
    }
    currentCycle.daysLogged += 1;
    currentCycle.lastDate = day.date;
    const n = currentCycle.daysLogged;

    const candidates = [];
    if (n === 1) candidates.push('b1');
    if (n === 3) candidates.push('b2');
    if (n === 7) candidates.push('b6');
    if (n === 12) candidates.push('b8');
    if (n === 20) candidates.push('b11');
    if (n === 31) candidates.push('b12');

    // "De volta ao oco" — regressou depois de ≥3 dias sem registar
    // (gap em dias de calendário ≥ 4: prev + 3 dias de silêncio + hoje).
    if (gap !== null && gap >= 4) candidates.push('b4');

    if (day.mood) {
      energyCount += 1;
      if (energyCount % 10 === 0) candidates.push('b9');
    }
    if (isEarlyLog(day)) {
      earlyLogCount += 1;
      if (earlyLogCount % 5 === 0) candidates.push('b5');
    }
    if (isHopDay(day, fieldsById)) {
      hopCount += 1;
      if (hopCount % 5 === 0) candidates.push('b7');
    }

    const zeroAnchors = zeroAnchorsFulfilled(day, fieldsById);
    const proud = !!day.therapy;
    if (zeroAnchors && proud) candidates.push('b10');
    else if (zeroAnchors) candidates.push('b3');

    if (candidates.length) {
      candidates.sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b));
      const winner = candidates[0];
      earned.push({
        badgeId: winner,
        date: day.date,
        cycleId: currentCycle.id,
        cycleNumber: currentCycle.number,
      });
    }

    prevDate = day.date;
  }

  return { cycles, earned };
}

// Agrupa `earned` num formato pronto para a aba Conquistas: por badge,
// contagem + datas (mais recente primeiro).
export function groupEarnedByBadge(earned) {
  const byBadge = {};
  earned.forEach((e) => {
    if (!byBadge[e.badgeId]) byBadge[e.badgeId] = [];
    byBadge[e.badgeId].push(e);
  });
  Object.values(byBadge).forEach((list) => list.sort((a, b) => (a.date < b.date ? 1 : -1)));
  return byBadge;
}

// Travessias-fantasma (secção 3, regra 3): menos de 3 dias registados
// não geram relatório e fundem-se na seguinte. Aplicado só na
// apresentação (aba Conquistas / futuros relatórios) — as linhas já
// gravadas em `cycles`/`badges` não são reescritas.
export function mergeGhostCycles(cycles) {
  const out = [];
  for (let i = 0; i < cycles.length; i++) {
    const c = cycles[i];
    const isLast = i === cycles.length - 1;
    if (c.daysLogged < 3 && !isLast) {
      cycles[i + 1] = {
        ...cycles[i + 1],
        startedOn: c.startedOn,
        daysLogged: cycles[i + 1].daysLogged + c.daysLogged,
        _mergedFrom: [...(cycles[i + 1]._mergedFrom || []), c.id],
      };
      continue;
    }
    if (c.daysLogged < 3 && isLast) {
      // ainda não é uma travessia "a sério" — fica de fora da lista
      // apresentada, mas os badges desse período continuam válidos.
      continue;
    }
    out.push(c);
  }
  return out;
}
