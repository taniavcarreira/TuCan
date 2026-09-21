import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
import { isoMonday, fmt } from '../utils/dates';
import { blankDay, migrateDay, anchorFields, currentScore, maxScore } from '../utils/fields';
import { getCachedKey, getOrCreateDeviceKey, encryptProfileField, decryptProfileField } from '../utils/profileCrypto';
import { evaluateBadgesAndCycles, groupEarnedByBadge, isUnique } from '../utils/badges';

const DataContext = createContext(null);

// Preferência de som dos badges (especificação v2, secção 5: "respeitar
// o modo silêncio e registar uma preferência de som no Perfil" — a
// hipersensibilidade auditiva é comum em PHDA). Local ao dispositivo,
// por omissão ligado.
const BADGE_SOUND_KEY = 'tucan_badge_sound_';

export function DataProvider({ user, children }) {
  const userId = user.id;
  const todayMonday = useRef(isoMonday(new Date())).current;
  const todayIndex = (new Date().getDay() + 6) % 7;

  const [badgeSoundEnabled, setBadgeSoundEnabledState] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BADGE_SOUND_KEY + userId);
        if (raw !== null) setBadgeSoundEnabledState(raw === '1');
      } catch (e) { /* por omissão fica ligado */ }
    })();
  }, [userId]);
  const setBadgeSoundEnabled = useCallback((value) => {
    setBadgeSoundEnabledState(value);
    AsyncStorage.setItem(BADGE_SOUND_KEY + userId, value ? '1' : '0').catch(() => {});
  }, [userId]);

  const [customFields, setCustomFieldsState] = useState([]);
  const [ready, setReady] = useState(false);

  const [currentMonday, setCurrentMonday] = useState(() => isoMonday(new Date()));
  const [weekData, setWeekData] = useState({ days: {} });
  const [todayWeek, setTodayWeek] = useState({ days: {} });

  const [sessions, setSessions] = useState([]);

  function dateForIndex(monday, index) {
    const d = new Date(monday);
    d.setDate(d.getDate() + index);
    return fmt(d);
  }

  // ---------- custom fields ----------
  // NOTA (fix de 11/09/2026, item 1 + item 6 do focus group): esta
  // função costumava inserir 5 campos-modelo na BD sempre que
  // encontrava zero campos para o utilizador — não só no primeiríssimo
  // signup, mas em QUALQUER login em que a pessoa tivesse a lista
  // vazia (incluindo depois de os apagar todos de propósito). Isso
  // fazia os campos "ressuscitarem" sozinhos. Agora nunca escreve nada
  // na BD aqui — só reflete o que lá está. A distinção entre "conta
  // nova, nunca configurada" e "utilizador deliberadamente sem campos"
  // passa a viver em `fieldsInitialized` (ver abaixo), gravado apenas
  // quando a pessoa mexe mesmo pela primeira vez na lista.
  const loadCustomFields = useCallback(async () => {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });
    if (error) { console.error('loadCustomFields', error); return; }
    setCustomFieldsState((data || []).map((r) => ({
      id: r.id, name: r.name, type: r.type, color: r.color, shape: r.shape,
      target: r.target, metric: r.metric, step: r.step,
      kind: r.kind === 'observation' ? 'observation' : 'anchor',
    })));
  }, [userId]);

  // true assim que a pessoa gravou a lista de campos pela primeira vez
  // (mesmo que a tenha deixado vazia de propósito) — usado por
  // HojeScreen para decidir entre mostrar as 5 sugestões a picotado
  // (primeira visita) ou o estado vazio normal (utilizador que apagou
  // tudo conscientemente).
  const fieldsInitialized = !!user.user_metadata?.fields_initialized;

  const persistCustomFields = useCallback(async (nextFields) => {
    const prevIds = customFields.map((f) => f.id);
    const nextIds = nextFields.map((f) => f.id);
    const removed = prevIds.filter((id) => !nextIds.includes(id));

    setCustomFieldsState(nextFields); // optimistic update

    if (!fieldsInitialized) {
      supabase.auth.updateUser({ data: { fields_initialized: true } })
        .catch((e) => console.error('fields_initialized flag', e));
    }

    if (removed.length) {
      const { error } = await supabase.from('fields').delete().in('id', removed);
      if (error) console.error('delete fields', error);
    }
    const rows = nextFields.map((f, i) => ({
      id: f.id, user_id: userId, name: f.name, type: f.type, color: f.color,
      shape: f.shape, target: f.target, metric: f.metric, step: f.step, sort_order: i,
      kind: f.kind === 'observation' ? 'observation' : 'anchor',
    }));
    const { error } = await supabase.from('fields').upsert(rows, { onConflict: 'id' });
    if (error) console.error('upsert fields', error);
  }, [customFields, userId, fieldsInitialized]);

  // ---------- badges e travessias (especificação v2, secções 2/3) ----------
  // A avaliação em si é pura (src/utils/badges.js) — aqui só se busca o
  // histórico completo, se sincroniza o resultado com `cycles`/`badges`
  // na BD, e se guarda em estado o que a aba Conquistas precisa de
  // mostrar. Declarado antes de saveToday/saveWeek abaixo, que chamam
  // `syncBadgesAndCycles` depois de cada gravação — precisa de existir
  // primeiro para essas funções o poderem incluir nas suas próprias
  // dependências do useCallback.
  const [badgesData, setBadgesData] = useState({ cycles: [], byBadge: {} });
  const [newBadgeEvent, setNewBadgeEvent] = useState(null); // { badgeId, trigger, muted }
  const earnedKeysRef = useRef(new Set()); // "badgeId|date" já vistos nesta sessão
  const seededRef = useRef(false);

  const syncBadgesAndCycles = useCallback(async (opts = {}) => {
    const { muteDate } = opts; // data (YYYY-MM-DD) cuja celebração deve tocar em silêncio (coincide com Perfect!)
    const { data: rows, error } = await supabase
      .from('days')
      .select('date, custom, mood, therapy, perfect, anchor_ids, first_logged_at')
      .eq('user_id', userId);
    if (error) { console.error('syncBadgesAndCycles: loadAllDays', error); return; }

    const { cycles, earned } = evaluateBadgesAndCycles(rows || [], customFields);

    // 1. Upsert das travessias (para obter o cycle_id real da BD — o id
    //    `cycle-YYYY-MM-DD` usado internamente por badges.js é só para
    //    agrupar durante o cálculo, nunca é gravado).
    const cycleRows = cycles.map((c, i) => ({
      user_id: userId,
      number: c.number,
      started_on: c.startedOn,
      ended_on: i < cycles.length - 1 ? c.lastDate : null,
      days_logged: c.daysLogged,
      closed_at: i < cycles.length - 1 ? new Date().toISOString() : null,
    }));
    let dbCycles = [];
    if (cycleRows.length) {
      const { data, error: cErr } = await supabase
        .from('cycles')
        .upsert(cycleRows, { onConflict: 'user_id,number' })
        .select('id, number');
      if (cErr) console.error('syncBadgesAndCycles: upsert cycles', cErr);
      dbCycles = data || [];
    }
    const cycleIdByNumber = {};
    dbCycles.forEach((c) => { cycleIdByNumber[c.number] = c.id; });

    // 2. Únicos só podem ser ganhos uma vez por travessia — filtra
    //    ocorrências repetidas do mesmo único dentro do mesmo ciclo
    //    antes de gravar (a avaliação já só emite um por dia, mas um
    //    único pode, em teoria, voltar a bater a condição mais tarde
    //    no mesmo ciclo se os dados históricos forem reprocessados).
    const seenUniquePerCycle = new Set();
    const badgeRows = [];
    earned.forEach((e) => {
      const key = `${e.badgeId}|${e.cycleNumber}`;
      if (isUnique(e.badgeId)) {
        if (seenUniquePerCycle.has(key)) return;
        seenUniquePerCycle.add(key);
      }
      badgeRows.push({
        user_id: userId,
        badge_id: e.badgeId,
        earned_at: e.date,
        cycle_id: cycleIdByNumber[e.cycleNumber] || null,
      });
    });

    if (badgeRows.length) {
      const { error: bErr } = await supabase
        .from('badges')
        .upsert(badgeRows, { onConflict: 'user_id,badge_id,earned_at', ignoreDuplicates: true });
      if (bErr) console.error('syncBadgesAndCycles: upsert badges', bErr);
    }

    // 3. Estado local para a aba Conquistas.
    setBadgesData({ cycles, byBadge: groupEarnedByBadge(earned) });

    // 4. Detetar o que é novo nesta sessão, para a celebração (secção
    //    5). Na primeira avaliação depois de abrir a app (`seededRef`),
    //    só regista o que já existe sem celebrar nada — senão o
    //    histórico inteiro "explodiria" de medalhas ao entrar na app.
    const seenBefore = seededRef.current;
    let freshest = null;
    earned.forEach((e) => {
      const k = `${e.badgeId}|${e.date}`;
      if (!earnedKeysRef.current.has(k)) {
        earnedKeysRef.current.add(k);
        if (seenBefore) freshest = e;
      }
    });
    seededRef.current = true;
    if (freshest) {
      setNewBadgeEvent({
        badgeId: freshest.badgeId,
        trigger: Date.now(),
        muted: !!muteDate && freshest.date === muteDate,
      });
    }
  }, [userId, customFields]);

  // ---------- day data ----------
  function rowToDay(row) {
    const day = row
      ? { custom: row.custom || {}, mood: row.mood || 0, therapy: !!row.therapy, perfect: !!row.perfect }
      : blankDay();
    return migrateDay(day);
  }

  const fetchWeek = useCallback(async (monday) => {
    const dates = Array.from({ length: 7 }, (_, i) => dateForIndex(monday, i));
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .eq('user_id', userId)
      .in('date', dates);
    if (error) console.error('fetchWeek', error);
    const byDate = {};
    (data || []).forEach((row) => { byDate[row.date] = row; });
    const days = {};
    for (let i = 0; i < 7; i++) {
      days[i] = rowToDay(byDate[dates[i]]);
    }
    return { days };
  }, [userId]);

  // `anchor_ids` (especificação v2, secção 1.3, ponto 4): fotografia de
  // que campos eram âncora no momento deste registo. Guardado a cada
  // gravação para que mudar o tipo de um campo mais tarde em
  // Configurações não reescreva o significado de dias já registados —
  // ainda não é lido de volta em lado nenhum (nenhum relatório o usa
  // por agora, ver secção 7 da especificação), só fica pronto na BD
  // para quando os relatórios existirem.
  //
  // Robustez de gravação — 21/09/2026: até aqui, um upsert falhado (rede
  // em baixo, sessão expirada, ou — o caso real que motivou isto — uma
  // coluna nova que a base de dados ainda não tinha) só ia para
  // `console.error`. `saveToday`/`saveWeek` já tinham atualizado o
  // estado local de forma otimista, por isso o ecrã continuava a
  // mostrar a marca certinha — e o registo desaparecia sozinho na
  // próxima vez que os dados eram recarregados do Supabase, sem
  // nenhum aviso. Isto contradiz o princípio 1 da especificação ("a
  // app recompensa o ato de registar, nunca o ato de cumprir"): um
  // registo que se perde em silêncio é exatamente o que faz alguém
  // com PHDA desistir. `failedSavesRef` guarda os dias cuja gravação
  // ainda não foi confirmada pelo Supabase; `saveErrorCount` (exposto
  // no contexto) é o que o `SaveErrorBanner` usa para mostrar o aviso
  // + "Tentar novamente", sem perder os dados (continuam no estado
  // local/AsyncStorage implícito do próprio React até serem enviados
  // com sucesso).
  const failedSavesRef = useRef(new Map()); // dateStr -> dayObj
  const [saveErrorCount, setSaveErrorCount] = useState(0);

  const saveDayRemote = useCallback(async (dateStr, dayObj) => {
    const { error } = await supabase.from('days').upsert({
      user_id: userId,
      date: dateStr,
      custom: dayObj.custom,
      mood: dayObj.mood,
      therapy: dayObj.therapy,
      perfect: dayObj.perfect,
      anchor_ids: anchorFields(customFields).map((f) => f.id),
    }, { onConflict: 'user_id,date' });
    if (error) {
      console.error('saveDayRemote', error);
      failedSavesRef.current.set(dateStr, dayObj);
      setSaveErrorCount(failedSavesRef.current.size);
      return false;
    }
    failedSavesRef.current.delete(dateStr);
    setSaveErrorCount(failedSavesRef.current.size);
    return true;
  }, [userId, customFields]);

  // Reenvia todos os dias com gravação por confirmar (pode ser mais do
  // que um — ex.: a Tania corrigiu vários dias em atraso na Semana
  // antes de reparar que nada estava a chegar ao Supabase). Só volta a
  // sincronizar badges/travessias se pelo menos um reenvio funcionou.
  const retrySaveError = useCallback(async () => {
    const pending = Array.from(failedSavesRef.current.entries());
    if (!pending.length) return;
    const results = await Promise.all(
      pending.map(([dateStr, dayObj]) => saveDayRemote(dateStr, dayObj))
    );
    if (results.some(Boolean)) syncBadgesAndCycles();
  }, [saveDayRemote, syncBadgesAndCycles]);

  const loadSemana = useCallback(async () => {
    const wd = await fetchWeek(currentMonday);
    setWeekData(wd);
  }, [currentMonday, fetchWeek]);

  const saveWeek = useCallback(async (nextWeekData) => {
    setWeekData(nextWeekData); // optimistic
    if (fmt(currentMonday) === fmt(todayMonday)) {
      setTodayWeek(nextWeekData);
    }
    await Promise.all(
      Array.from({ length: 7 }, (_, i) =>
        saveDayRemote(dateForIndex(currentMonday, i), nextWeekData.days[i])
      )
    );
    syncBadgesAndCycles();
  }, [currentMonday, todayMonday, saveDayRemote, syncBadgesAndCycles]);

  const loadToday = useCallback(async () => {
    const wd = await fetchWeek(todayMonday);
    setTodayWeek(wd);
  }, [fetchWeek, todayMonday]);

  const saveToday = useCallback(async (nextTodayWeek) => {
    // O som/confetti do Perfect! (HojeScreen#onCelebrate) toca sempre
    // que o preenchimento das âncoras acaba de chegar ao máximo — não
    // só quando se carrega no botão "Perfect!". Um badge que calhe no
    // mesmo instante fica em silêncio (secção 2: "só toca o som do
    // Perfect!, a medalha aparece em silêncio").
    const prevDay = todayWeek.days[todayIndex];
    const max = maxScore(customFields);
    const wasMax = max > 0 && currentScore(prevDay || blankDay(), customFields) === max;
    const nowMax = max > 0 && currentScore(nextTodayWeek.days[todayIndex], customFields) === max;
    const perfectSoundNow = nowMax && !wasMax;
    const dateStr = dateForIndex(todayMonday, todayIndex);

    setTodayWeek(nextTodayWeek); // optimistic
    if (fmt(currentMonday) === fmt(todayMonday)) {
      setWeekData(nextTodayWeek);
    }
    await saveDayRemote(dateStr, nextTodayWeek.days[todayIndex]);
    syncBadgesAndCycles({ muteDate: perfectSoundNow ? dateStr : null });
  }, [currentMonday, todayMonday, todayIndex, todayWeek, customFields, saveDayRemote, syncBadgesAndCycles]);

  const goToWeek = useCallback(async (monday) => {
    setCurrentMonday(monday);
    const wd = await fetchWeek(monday);
    setWeekData(wd);
  }, [fetchWeek]);

  // ---------- account profile ----------
  // Nome/Apelido/Avatar live in Supabase Auth's own user_metadata
  // (no extra table needed). App.js already listens to
  // supabase.auth.onAuthStateChange and refreshes `user` whenever
  // updateUser() below fires a USER_UPDATED event, so `profile` just
  // derives straight from the `user` prop instead of duplicating state.
  //
  // Username is end-to-end encrypted (see src/utils/profileCrypto.js) —
  // stored as `username_enc` ciphertext, decrypted here using a key
  // that only ever lives on this device (derived from the account's
  // password at login, or a random per-device key for Google
  // accounts). Older accounts may still carry the pre-username
  // `first_name_enc`/`last_name_enc` (or even older, pre-encryption
  // plain `first_name`/`last_name`) fields from before the 11/09/2026
  // focus-group change (item 3: nome+apelido → username único) — those
  // are intentionally ignored from here on (never read, never written
  // again).
  const [profileKey, setProfileKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let key = await getCachedKey(userId);
      if (!key) key = await getOrCreateDeviceKey(userId);
      if (!cancelled) setProfileKey(key);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const profile = useMemo(() => ({
    email: user.email || '',
    username: decryptProfileField(user.user_metadata?.username_enc, profileKey),
    avatarId: user.user_metadata?.avatar_id || null,
  }), [user, profileKey]);

  const updateProfile = useCallback(async (fields) => {
    const { username, ...rest } = fields;
    const payload = { ...rest };
    if (username !== undefined) {
      const key = profileKey || await getOrCreateDeviceKey(userId);
      payload.username_enc = encryptProfileField(username, key);
      payload.username = null; // limpa qualquer resto em texto simples
    }
    const { error } = await supabase.auth.updateUser({ data: payload });
    if (error) throw error;
  }, [profileKey, userId]);

  // ---------- trend data (Semana tab accordion) ----------
  // Fetches a wider date range of `days` rows than the single week
  // kept in `weekData`, for the monthly/annual trend chart. Left as a
  // raw fetch — SemanaScreen/TrendAccordion own the bucketing/scoring
  // math, same as TreinoScreen already does for its own bar chart.
  const loadTrendDays = useCallback(async (fromISO, toISO) => {
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .eq('user_id', userId)
      .gte('date', fromISO)
      .lte('date', toISO);
    if (error) { console.error('loadTrendDays', error); return []; }
    return (data || []).map((row) => ({ date: row.date, ...rowToDay(row) }));
  }, [userId]);

  // ---------- gym sessions ----------
  const loadSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) { console.error('loadSessions', error); return; }
    setSessions((data || []).map((r) => ({
      id: r.id, date: r.date, type: r.type, duration: r.duration, intensity: r.intensity,
    })));
  }, [userId]);

  const persistSessions = useCallback(async (nextList) => {
    const prevIds = sessions.map((s) => s.id);
    const nextIds = nextList.map((s) => s.id);
    const removed = prevIds.filter((id) => !nextIds.includes(id));
    const added = nextList.filter((s) => !prevIds.includes(s.id));

    setSessions(nextList); // optimistic

    if (removed.length) {
      const { error } = await supabase.from('sessions').delete().in('id', removed);
      if (error) console.error('delete sessions', error);
    }
    if (added.length) {
      const rows = added.map((s) => ({
        id: s.id, user_id: userId, date: s.date, type: s.type,
        duration: s.duration, intensity: s.intensity,
      }));
      const { error } = await supabase.from('sessions').insert(rows);
      if (error) console.error('insert sessions', error);
    }
  }, [sessions, userId]);

  // ---------- initial load ----------
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setReady(false);
      await loadCustomFields();
      await loadToday();
      await loadSemana();
      await loadSessions();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Primeira avaliação de badges/travessias assim que os campos e o
  // histórico estão prontos (sem esperar por uma gravação nova) — é o
  // que dá conteúdo à aba Conquistas logo na primeira visita.
  useEffect(() => {
    if (!ready) return;
    syncBadgesAndCycles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const value = useMemo(() => ({
    ready,
    todayMonday, todayIndex,
    customFields, persistCustomFields, loadCustomFields, fieldsInitialized,
    currentMonday, weekData, goToWeek, saveWeek, loadSemana,
    todayWeek, saveToday, loadToday,
    sessions, persistSessions, loadSessions,
    profile, updateProfile, loadTrendDays,
    badgesData, newBadgeEvent, syncBadgesAndCycles,
    badgeSoundEnabled, setBadgeSoundEnabled,
    saveErrorCount, retrySaveError,
  }), [
    ready, customFields, currentMonday, weekData, todayWeek, sessions,
    persistCustomFields, loadCustomFields, fieldsInitialized, goToWeek, saveWeek, loadSemana,
    saveToday, loadToday, persistSessions, loadSessions, todayMonday,
    profile, updateProfile, loadTrendDays,
    badgesData, newBadgeEvent, syncBadgesAndCycles,
    badgeSoundEnabled, setBadgeSoundEnabled,
    saveErrorCount, retrySaveError,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
