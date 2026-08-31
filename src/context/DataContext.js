import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { isoMonday, fmt } from '../utils/dates';
import { blankDay, migrateDay, seedFields } from '../utils/fields';
import { getCachedKey, getOrCreateDeviceKey, encryptProfileField, decryptProfileField } from '../utils/profileCrypto';

const DataContext = createContext(null);

export function DataProvider({ user, children }) {
  const userId = user.id;
  const todayMonday = useRef(isoMonday(new Date())).current;
  const todayIndex = (new Date().getDay() + 6) % 7;

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
  const loadCustomFields = useCallback(async () => {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });
    if (error) { console.error('loadCustomFields', error); return; }
    if (data && data.length) {
      setCustomFieldsState(data.map((r) => ({
        id: r.id, name: r.name, type: r.type, color: r.color, shape: r.shape,
        target: r.target, metric: r.metric, step: r.step,
      })));
    } else {
      const seed = seedFields();
      const rows = seed.map((f, i) => ({ ...f, user_id: userId, sort_order: i }));
      const { error: insErr } = await supabase.from('fields').insert(rows);
      if (insErr) console.error('seed fields insert', insErr);
      setCustomFieldsState(seed);
    }
  }, [userId]);

  const persistCustomFields = useCallback(async (nextFields) => {
    const prevIds = customFields.map((f) => f.id);
    const nextIds = nextFields.map((f) => f.id);
    const removed = prevIds.filter((id) => !nextIds.includes(id));

    setCustomFieldsState(nextFields); // optimistic update

    if (removed.length) {
      const { error } = await supabase.from('fields').delete().in('id', removed);
      if (error) console.error('delete fields', error);
    }
    const rows = nextFields.map((f, i) => ({
      id: f.id, user_id: userId, name: f.name, type: f.type, color: f.color,
      shape: f.shape, target: f.target, metric: f.metric, step: f.step, sort_order: i,
    }));
    const { error } = await supabase.from('fields').upsert(rows, { onConflict: 'id' });
    if (error) console.error('upsert fields', error);
  }, [customFields, userId]);

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

  const saveDayRemote = useCallback(async (dateStr, dayObj) => {
    const { error } = await supabase.from('days').upsert({
      user_id: userId,
      date: dateStr,
      custom: dayObj.custom,
      mood: dayObj.mood,
      therapy: dayObj.therapy,
      perfect: dayObj.perfect,
    }, { onConflict: 'user_id,date' });
    if (error) console.error('saveDayRemote', error);
  }, [userId]);

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
  }, [currentMonday, todayMonday, saveDayRemote]);

  const loadToday = useCallback(async () => {
    const wd = await fetchWeek(todayMonday);
    setTodayWeek(wd);
  }, [fetchWeek, todayMonday]);

  const saveToday = useCallback(async (nextTodayWeek) => {
    setTodayWeek(nextTodayWeek); // optimistic
    if (fmt(currentMonday) === fmt(todayMonday)) {
      setWeekData(nextTodayWeek);
    }
    await saveDayRemote(dateForIndex(todayMonday, todayIndex), nextTodayWeek.days[todayIndex]);
  }, [currentMonday, todayMonday, todayIndex, saveDayRemote]);

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
  // Nome/apelido are end-to-end encrypted (see src/utils/profileCrypto.js)
  // — stored as `first_name_enc`/`last_name_enc` ciphertext, decrypted
  // here using a key that only ever lives on this device (derived from
  // the account's password at login, or a random per-device key for
  // Google accounts). Older accounts may still carry the pre-encryption
  // plain `first_name`/`last_name` fields — those are intentionally
  // ignored from here on (never read, never written again).
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
    firstName: decryptProfileField(user.user_metadata?.first_name_enc, profileKey),
    lastName: decryptProfileField(user.user_metadata?.last_name_enc, profileKey),
    avatarId: user.user_metadata?.avatar_id || null,
  }), [user, profileKey]);

  const updateProfile = useCallback(async (fields) => {
    const { first_name, last_name, ...rest } = fields;
    const payload = { ...rest };
    if (first_name !== undefined || last_name !== undefined) {
      const key = profileKey || await getOrCreateDeviceKey(userId);
      if (first_name !== undefined) {
        payload.first_name_enc = encryptProfileField(first_name, key);
        payload.first_name = null; // limpa qualquer resto em texto simples de contas antigas
      }
      if (last_name !== undefined) {
        payload.last_name_enc = encryptProfileField(last_name, key);
        payload.last_name = null;
      }
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

  const value = useMemo(() => ({
    ready,
    todayMonday, todayIndex,
    customFields, persistCustomFields, loadCustomFields,
    currentMonday, weekData, goToWeek, saveWeek, loadSemana,
    todayWeek, saveToday, loadToday,
    sessions, persistSessions, loadSessions,
    profile, updateProfile, loadTrendDays,
  }), [
    ready, customFields, currentMonday, weekData, todayWeek, sessions,
    persistCustomFields, loadCustomFields, goToWeek, saveWeek, loadSemana,
    saveToday, loadToday, persistSessions, loadSessions, todayMonday,
    profile, updateProfile, loadTrendDays,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
