import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { COLORS, FONTS } from '../theme';
import { useData } from '../context/DataContext';
import { isoMonday, fmt, fmtShort, monthLabelPt, todayISO } from '../utils/dates';

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const ACTIVITIES = ['RPM', 'BodyPump', 'Hidroginástica', 'Step', 'Elíptica', 'Bicicleta', 'Passadeira', 'Outro'];

function bucketKey(d, period) {
  if (period === 'week') return fmt(isoMonday(new Date(d)));
  if (period === 'year') return String(d.getFullYear());
  return d.getFullYear() + '-' + d.getMonth();
}

export default function TreinoScreen() {
  const { sessions, persistSessions } = useData();
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState('RPM');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('');
  const [period, setPeriod] = useState('month');
  const [iosPickerOpen, setIosPickerOpen] = useState(false);

  function openDatePicker() {
    const current = date ? new Date(date + 'T00:00:00') : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) setDate(toISO(selected));
        },
      });
    } else {
      setIosPickerOpen((v) => !v);
    }
  }

  async function addSession() {
    const entry = {
      id: Date.now(),
      date: date || todayISO(),
      type,
      duration: parseInt(duration, 10) || null,
      intensity: intensity.trim(),
    };
    await persistSessions([...sessions, entry]);
    setDuration('');
    setIntensity('');
  }
  async function removeSession(id) {
    await persistSessions(sessions.filter((s) => s.id !== id));
  }

  const { buckets, title } = useMemo(() => {
    const counts = {};
    sessions.forEach((s) => {
      const d = new Date(s.date + 'T00:00:00');
      const key = bucketKey(d, period);
      counts[key] = (counts[key] || 0) + 1;
    });
    const now = new Date();
    let list = [];
    let t = 'Atividades por mês';
    if (period === 'week') {
      t = 'Atividades por semana';
      const curMon = isoMonday(now);
      for (let i = 7; i >= 0; i--) {
        const mon = new Date(curMon); mon.setDate(mon.getDate() - i * 7);
        list.push({ key: fmt(mon), label: fmtShort(mon) });
      }
    } else if (period === 'year') {
      t = 'Atividades por ano';
      for (let i = 4; i >= 0; i--) {
        const y = now.getFullYear() - i;
        list.push({ key: String(y), label: String(y) });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        list.push({ key: d.getFullYear() + '-' + d.getMonth(), label: monthLabelPt(d.getFullYear(), d.getMonth()) });
      }
    }
    const max = Math.max(1, ...list.map((b) => counts[b.key] || 0));
    return { buckets: list.map((b) => ({ ...b, n: counts[b.key] || 0, h: Math.round(((counts[b.key] || 0) / max) * 100) })), title: t };
  }, [sessions, period]);

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 30);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Registar treino</Text>

        <Text style={styles.label}>Data</Text>
        <TouchableOpacity style={styles.dateInput} onPress={openDatePicker}>
          <Text style={styles.dateInputText}>
            {fmtShort(new Date(date + 'T00:00:00'))} <Text style={styles.dateInputSub}>· {date}</Text>
          </Text>
        </TouchableOpacity>
        {Platform.OS === 'ios' && iosPickerOpen && (
          <DateTimePicker
            value={date ? new Date(date + 'T00:00:00') : new Date()}
            mode="date"
            display="inline"
            onChange={(event, selected) => { if (selected) setDate(toISO(selected)); }}
            style={styles.iosPicker}
          />
        )}

        <Text style={styles.label}>Atividade</Text>
        <View style={styles.chipRow}>
          {ACTIVITIES.map((a) => (
            <TouchableOpacity key={a} style={[styles.chip, type === a && styles.chipActive]} onPress={() => setType(a)}>
              <Text style={[styles.chipText, type === a && styles.chipTextActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.fieldRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Duração (min)</Text>
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="45" placeholderTextColor={COLORS.inkSoft} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Intensidade / nível</Text>
            <TextInput style={styles.input} value={intensity} onChangeText={setIntensity} placeholder="nível 10, RPE 7" placeholderTextColor={COLORS.inkSoft} />
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={addSession}>
          <Text style={styles.addBtnText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.periodToggle}>
          {[['week', 'Semana'], ['month', 'Mês'], ['year', 'Ano']].map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.periodBtn, period === key && styles.periodBtnActive]} onPress={() => setPeriod(key)}>
              <Text style={[styles.periodBtnText, period === key && styles.periodBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.barChart}>
          {buckets.map((b, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barN}>{b.n || ''}</Text>
              <View style={[styles.bar, { height: `${Math.max(b.h, b.n ? 4 : 0)}%` }]} />
              <Text style={styles.barLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {sorted.length === 0 ? (
        <Text style={styles.emptyNote}>Ainda sem treinos registados. Adiciona o de hoje acima.</Text>
      ) : sorted.map((s) => {
        const d = new Date(s.date + 'T00:00:00');
        const meta = [fmtShort(d), s.duration ? s.duration + ' min' : null, s.intensity || null].filter(Boolean).join(' · ');
        return (
          <View key={s.id} style={styles.sessionItem}>
            <View>
              <Text style={styles.sessionType}>{s.type}</Text>
              <Text style={styles.sessionMeta}>{meta}</Text>
            </View>
            <TouchableOpacity onPress={() => removeSession(s.id)}>
              <Text style={styles.sessionDel}>✕</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  formCard: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 10, padding: 18, marginBottom: 16 },
  formTitle: { fontFamily: FONTS.display, fontSize: 17, color: COLORS.ink, marginBottom: 14 },
  label: { fontSize: 11.5, color: COLORS.inkSoft, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { padding: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg, color: COLORS.ink, fontFamily: FONTS.bodyRegular, fontSize: 14, marginBottom: 4 },
  dateInput: { padding: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg, marginBottom: 4 },
  dateInputText: { color: COLORS.ink, fontFamily: FONTS.bodyRegular, fontSize: 14 },
  dateInputSub: { color: COLORS.inkSoft, fontFamily: FONTS.monoRegular, fontSize: 12 },
  iosPicker: { alignSelf: 'center', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg },
  chipActive: { backgroundColor: COLORS.sporting, borderColor: COLORS.sporting },
  chipText: { color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, fontSize: 12 },
  chipTextActive: { color: '#fff' },
  fieldRow: { flexDirection: 'row', gap: 10 },
  addBtn: { marginTop: 8, padding: 15, borderRadius: 8, backgroundColor: COLORS.sporting, alignItems: 'center' },
  addBtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 15 },

  chartCard: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 10, padding: 18, marginBottom: 16 },
  chartTitle: { fontFamily: FONTS.display, fontSize: 17, color: COLORS.ink, marginBottom: 14 },
  periodToggle: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg },
  periodBtnActive: { backgroundColor: COLORS.sporting, borderColor: COLORS.sporting },
  periodBtnText: { color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, fontSize: 12.5 },
  periodBtnTextActive: { color: '#fff' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%', maxWidth: 26, backgroundColor: COLORS.sporting, borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 2 },
  barN: { fontFamily: FONTS.mono, fontSize: 10.5, color: COLORS.inkSoft, marginBottom: 3 },
  barLabel: { fontSize: 9.5, color: COLORS.inkSoft, marginTop: 6, textAlign: 'center' },

  emptyNote: { fontSize: 13, color: COLORS.inkSoft, textAlign: 'center', paddingVertical: 18 },
  sessionItem: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 8, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionType: { fontSize: 14, fontFamily: FONTS.bodyBold, color: COLORS.ink },
  sessionMeta: { fontSize: 11, color: COLORS.inkSoft, fontFamily: FONTS.monoRegular },
  sessionDel: { color: COLORS.inkSoft, fontSize: 17, padding: 4 },
});
