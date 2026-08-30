import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS, textColorFor } from '../theme';
import { useData } from '../context/DataContext';
import { fieldOk, fieldValue, decimalsOf } from '../utils/fields';
import { DAYS, isoMonday, fmtShort } from '../utils/dates';
import Shape, { ConfettiIcon } from '../components/Shape';
import WeeklyWaveChart from '../components/WeeklyWaveChart';
import TrendAccordion from '../components/TrendAccordion';

export default function SemanaScreen() {
  const { currentMonday, weekData, goToWeek, saveWeek, customFields, loadTrendDays } = useData();

  const end = new Date(currentMonday);
  end.setDate(end.getDate() + 6);
  const rangeLabel = `${fmtShort(currentMonday)} – ${fmtShort(end)}`;

  async function mutateDay(i, mutator) {
    const next = { ...weekData, days: { ...weekData.days } };
    const d = { ...next.days[i], custom: { ...next.days[i].custom } };
    mutator(d);
    next.days[i] = d;
    await saveWeek(next);
  }

  const toggleBool = (i, fieldId) => mutateDay(i, (d) => { d.custom[fieldId] = !d.custom[fieldId]; });
  const cycleCount = (i, field) => mutateDay(i, (d) => {
    const dec = decimalsOf(field.step);
    const cur = d.custom[field.id] || 0;
    d.custom[field.id] = cur >= field.target ? 0 : parseFloat((cur + field.step).toFixed(dec));
  });
  const toggleTherapy = (i) => mutateDay(i, (d) => { d.therapy = !d.therapy; });
  const setMood = (i, val) => mutateDay(i, (d) => { d.mood = val; });

  // weekly summary
  let proud = 0, moodSum = 0, moodCount = 0;
  const fieldCounts = customFields.map(() => 0);
  for (let i = 0; i < 7; i++) {
    const d = weekData.days[i];
    if (!d) continue;
    if (d.therapy) proud++;
    customFields.forEach((f, fi) => { if (fieldOk(d, f)) fieldCounts[fi]++; });
    if (d.mood) { moodCount++; moodSum += d.mood; }
  }
  const moodAvg = moodCount ? (moodSum / moodCount).toFixed(1) : '—';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => {
          const prev = new Date(currentMonday); prev.setDate(prev.getDate() - 7);
          goToWeek(isoMonday(prev));
        }}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.rangeText}>{rangeLabel}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => {
          const next = new Date(currentMonday); next.setDate(next.getDate() + 7);
          goToWeek(isoMonday(next));
        }}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {/* header row */}
        <View style={styles.gridRow}>
          <View style={styles.rowLabelSlot} />
          {DAYS.map((label, i) => {
            const d = new Date(currentMonday); d.setDate(d.getDate() + i);
            return (
              <View key={i} style={styles.dayCell}>
                <Text style={styles.dayLabel}>{label}</Text>
                <Text style={styles.dayNum}>{d.getDate()}</Text>
              </View>
            );
          })}
        </View>

        {/* custom field rows */}
        {customFields.map((f) => (
          <View key={f.id} style={[styles.gridRow, styles.gridRowBorder]}>
            <View style={styles.rowLabelSlot}>
              <Shape shape={f.shape} color={f.color} size={12} />
              <Text style={styles.rowLabelText} numberOfLines={1}>{f.name}</Text>
            </View>
            {Array.from({ length: 7 }).map((_, i) => {
              const day = weekData.days[i];
              if (!day) return <View key={i} style={styles.dayCell} />;
              const val = fieldValue(day, f);
              if (f.type === 'bool') {
                const on = !!val;
                return (
                  <View key={i} style={styles.dayCell}>
                    <TouchableOpacity
                      style={[styles.toggle, on && { backgroundColor: f.color, borderColor: 'transparent' }]}
                      onPress={() => toggleBool(i, f.id)}
                    >
                      {on && <Text style={{ color: textColorFor(f.color), fontFamily: FONTS.display, fontSize: 12 }}>✓</Text>}
                    </TouchableOpacity>
                  </View>
                );
              }
              return (
                <View key={i} style={styles.dayCell}>
                  <TouchableOpacity onPress={() => cycleCount(i, f)} style={styles.countCellSmall}>
                    <Text style={styles.countCellText}>{val}</Text>
                    <Text style={styles.countCellSub}>/{f.target}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}

        {/* ProudOfMe row */}
        <View style={[styles.gridRow, styles.gridRowBorder]}>
          <View style={styles.rowLabelSlot}>
            <ConfettiIcon size={12} />
            <Text style={styles.rowLabelText} numberOfLines={1}>ProudOfMe</Text>
          </View>
          {Array.from({ length: 7 }).map((_, i) => {
            const day = weekData.days[i];
            if (!day) return <View key={i} style={styles.dayCell} />;
            const on = !!day.therapy;
            return (
              <View key={i} style={styles.dayCell}>
                <TouchableOpacity
                  style={[styles.toggle, on && { backgroundColor: COLORS.c7, borderColor: 'transparent' }]}
                  onPress={() => toggleTherapy(i)}
                >
                  {on && <Text style={{ color: COLORS.bg, fontFamily: FONTS.display, fontSize: 12 }}>✓</Text>}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Energia row */}
        <View style={styles.gridRow}>
          <View style={styles.rowLabelSlot}>
            <Text style={styles.rowLabelText}>Energia</Text>
          </View>
          {Array.from({ length: 7 }).map((_, i) => {
            const day = weekData.days[i];
            if (!day) return <View key={i} style={styles.dayCell} />;
            return (
              <View key={i} style={styles.dayCell}>
                <TextInput
                  style={[styles.moodMini, day.mood && { borderColor: COLORS.electro, color: COLORS.electro }]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={day.mood ? String(day.mood) : ''}
                  placeholder="–"
                  placeholderTextColor={COLORS.inkSoft}
                  onChangeText={(t) => {
                    let v = parseInt(t, 10);
                    if (isNaN(v)) v = 0;
                    v = Math.max(0, Math.min(5, v));
                    setMood(i, v);
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.legend}>Energia: número livre de 1 a 5, sem certo ou errado</Text>

      <View style={styles.waveCard}>
        <Text style={styles.waveTitle}>Tendência da semana</Text>
        <WeeklyWaveChart weekData={weekData} customFields={customFields} />
      </View>

      <View style={styles.summary}>
        <View style={styles.stat}><Text style={styles.statN}>{proud}/7</Text><Text style={styles.statL}>ProudOfMe</Text></View>
        <View style={styles.stat}><Text style={styles.statN}>{moodAvg}</Text><Text style={styles.statL}>Energia média (1–5)</Text></View>
        {customFields.slice(0, 4).map((f, fi) => (
          <View key={f.id} style={styles.stat}>
            <Text style={styles.statN}>{fieldCounts[fi]}/7</Text>
            <Text style={styles.statL}>{f.name}</Text>
          </View>
        ))}
      </View>

      <TrendAccordion loadTrendDays={loadTrendDays} customFields={customFields} />

      <Text style={styles.footerNote}>
        Uma semana mais fraca não apaga as outras. O padrão ao longo de meses é o que conta.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.card, width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { color: COLORS.ink, fontSize: 17, fontFamily: FONTS.bodyBold },
  rangeText: { fontFamily: FONTS.mono, fontSize: 13.5, color: COLORS.ink },

  grid: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 2, borderColor: COLORS.line, overflow: 'hidden', marginBottom: 16 },
  gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  gridRowBorder: { borderTopWidth: 2, borderTopColor: COLORS.line },
  rowLabelSlot: { width: 96, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 4 },
  rowLabelText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.ink, flexShrink: 1 },
  dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.inkSoft },
  dayNum: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.ink },

  toggle: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  countCellSmall: { alignItems: 'center' },
  countCellText: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.ink },
  countCellSub: { fontFamily: FONTS.mono, fontSize: 8, color: COLORS.inkSoft },

  moodMini: { width: 28, height: 26, borderRadius: 6, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg, textAlign: 'center', fontFamily: FONTS.mono, fontSize: 11, color: COLORS.ink },

  legend: { fontSize: 11.5, color: COLORS.inkSoft, textAlign: 'center', marginBottom: 16 },

  waveCard: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 10, padding: 16, marginBottom: 16 },
  waveTitle: { fontFamily: FONTS.display, fontSize: 14.5, color: COLORS.ink, marginBottom: 10 },

  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: { width: '48%', backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 8, padding: 14 },
  statN: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.ink },
  statL: { fontSize: 11, color: COLORS.inkSoft, fontWeight: '700', marginTop: 4 },

  footerNote: { fontSize: 11.5, color: COLORS.inkSoft, lineHeight: 17, textAlign: 'center', marginBottom: 10 },
});
