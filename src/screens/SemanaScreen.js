import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS, textColorFor, NAV_HEIGHT } from '../theme';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import { fieldOk, fieldValue, decimalsOf, energiaOptions, hasAnyLog } from '../utils/fields';
import { DAYS_FOR, isoMonday, fmtShort } from '../utils/dates';
import Shape, { ProudOfMeIcon } from '../components/Shape';
import WeeklyWaveChart from '../components/WeeklyWaveChart';
import TrendAccordion from '../components/TrendAccordion';

export default function SemanaScreen() {
  const { currentMonday, weekData, goToWeek, saveWeek, customFields, loadTrendDays } = useData();
  const { t, language } = useLanguage();
  const days = DAYS_FOR(language);
  const energiaOpts = energiaOptions(t);

  const end = new Date(currentMonday);
  end.setDate(end.getDate() + 6);
  const rangeLabel = `${fmtShort(currentMonday, language)} – ${fmtShort(end, language)}`;

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
  // ProudOfMe (especificação v2, secção 1.2): mesma regra da Hoje — só
  // desbloqueia depois de haver algum registo nesse dia.
  const toggleTherapy = (i, day) => {
    if (!day.therapy && !hasAnyLog(day, customFields)) return;
    mutateDay(i, (d) => { d.therapy = !d.therapy; });
  };
  // Item 9 (focus group, 11/09/2026): a célula compacta de "Energia" na
  // grelha semanal não tem espaço para 5 botões de emoji lado a lado,
  // por isso mantém-se a interação de tocar-para-avançar já usada nos
  // campos de contagem desta mesma grelha (cycleCount acima) — cada
  // toque avança um nível (0=por preencher → 1..5), e do 5 volta ao 0.
  const cycleMood = (i) => mutateDay(i, (d) => { d.mood = (d.mood || 0) >= 5 ? 0 : (d.mood || 0) + 1; });

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
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: NAV_HEIGHT + 24 }}>
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
          {days.map((label, i) => {
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
            <ProudOfMeIcon size={12} />
            <Text style={styles.rowLabelText} numberOfLines={1}>{t('common.proudOfMe')}</Text>
          </View>
          {Array.from({ length: 7 }).map((_, i) => {
            const day = weekData.days[i];
            if (!day) return <View key={i} style={styles.dayCell} />;
            const on = !!day.therapy;
            const disabled = !on && !hasAnyLog(day, customFields);
            return (
              <View key={i} style={styles.dayCell}>
                <TouchableOpacity
                  style={[styles.toggle, on && { backgroundColor: COLORS.c7, borderColor: 'transparent' }, disabled && styles.toggleDisabled]}
                  onPress={() => toggleTherapy(i, day)}
                  disabled={disabled}
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
            <Text style={styles.rowLabelText}>{t('common.energia')}</Text>
          </View>
          {Array.from({ length: 7 }).map((_, i) => {
            const day = weekData.days[i];
            if (!day) return <View key={i} style={styles.dayCell} />;
            const opt = day.mood ? energiaOpts.find((o) => o.value === day.mood) : null;
            return (
              <View key={i} style={styles.dayCell}>
                <TouchableOpacity
                  style={[styles.moodMini, day.mood && styles.moodMiniActive]}
                  onPress={() => cycleMood(i)}
                  accessibilityLabel={opt ? opt.label : undefined}
                >
                  <Text style={styles.moodMiniText}>{opt ? opt.emoji : '–'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.legend}>{t('semana.legend')}</Text>

      <View style={styles.waveCard}>
        <Text style={styles.waveTitle}>{t('semana.trendTitle')}</Text>
        <WeeklyWaveChart weekData={weekData} customFields={customFields} />
      </View>

      <View style={styles.summary}>
        <View style={styles.stat}><Text style={styles.statN}>{proud}/7</Text><Text style={styles.statL}>{t('common.proudOfMe')}</Text></View>
        <View style={styles.stat}><Text style={styles.statN}>{moodAvg}</Text><Text style={styles.statL}>{t('semana.energiaMedia')}</Text></View>
        {customFields.slice(0, 4).map((f, fi) => (
          <View key={f.id} style={styles.stat}>
            <Text style={styles.statN}>{fieldCounts[fi]}/7</Text>
            <Text style={styles.statL}>{f.name}</Text>
          </View>
        ))}
      </View>

      <TrendAccordion loadTrendDays={loadTrendDays} customFields={customFields} />

      <Text style={styles.footerNote}>
        {t('semana.footerNote')}
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
  toggleDisabled: { opacity: 0.35 },
  countCellSmall: { alignItems: 'center' },
  countCellText: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.ink },
  countCellSub: { fontFamily: FONTS.mono, fontSize: 8, color: COLORS.inkSoft },

  moodMini: { width: 28, height: 26, borderRadius: 6, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  moodMiniActive: { borderColor: COLORS.electro },
  moodMiniText: { fontSize: 13, textAlign: 'center' },

  legend: { fontSize: 11.5, color: COLORS.inkSoft, textAlign: 'center', marginBottom: 16 },

  waveCard: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 10, padding: 16, marginBottom: 16 },
  waveTitle: { fontFamily: FONTS.display, fontSize: 14.5, color: COLORS.ink, marginBottom: 10 },

  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: { width: '48%', backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 8, padding: 14 },
  statN: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.ink },
  statL: { fontSize: 11, color: COLORS.inkSoft, fontWeight: '700', marginTop: 4 },

  footerNote: { fontSize: 11.5, color: COLORS.inkSoft, lineHeight: 17, textAlign: 'center', marginBottom: 10 },
});
