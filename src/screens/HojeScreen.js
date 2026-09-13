import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS, textColorFor, NAV_HEIGHT } from '../theme';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import { currentScore, maxScore, scoreMessage, fieldOk, fieldValue, decimalsOf, suggestedFields, energiaOptions } from '../utils/fields';
import { localeFor } from '../utils/dates';
import RingChart from '../components/RingChart';
import Shape, { ConfettiIcon } from '../components/Shape';
import ElectricLine from '../components/ElectricLine';

export default function HojeScreen({ onCelebrate, onOpenConfig }) {
  const { todayWeek, todayIndex, saveToday, customFields, fieldsInitialized } = useData();
  const { t, language } = useLanguage();
  const [lineTrigger, setLineTrigger] = useState(0);
  const [perfectTrigger, setPerfectTrigger] = useState(0);
  const day = todayWeek.days[todayIndex];

  if (!day) return null;

  const score = currentScore(day, customFields);
  const max = maxScore(customFields);
  const msg = scoreMessage(score, max, t);
  // Item 8 (focus group, 11/09/2026): Perfect! só fica disponível
  // quando TODOS os outros campos estão no objetivo definido — os
  // booleanos marcados, os de contagem no target — E o ProudOfMe
  // também está marcado. `isWin` já capta exactamente isso, porque
  // currentScore/maxScore contam o ProudOfMe como +1 no total.
  const isWin = max > 0 && score === max;

  async function updateDay(mutator) {
    const next = { ...todayWeek, days: { ...todayWeek.days } };
    const d = { ...next.days[todayIndex], custom: { ...next.days[todayIndex].custom } };
    const wasPerfect = !!next.days[todayIndex].perfect;
    mutator(d);
    next.days[todayIndex] = d;
    await saveToday(next);
    setLineTrigger(Date.now());
    if (d.perfect && !wasPerfect) setPerfectTrigger(Date.now());
    const newScore = currentScore(d, customFields);
    if (max > 0 && newScore === max) onCelebrate?.();
  }

  const toggleFixed = (key) => {
    // Só bloqueia a ATIVAÇÃO do Perfect! sem os requisitos cumpridos —
    // desmarcar continua sempre livre.
    if (key === 'perfect' && !day.perfect && !isWin) return;
    updateDay((d) => { d[key] = !d[key]; });
  };
  const toggleBool = (fieldId) => updateDay((d) => { d.custom[fieldId] = !d.custom[fieldId]; });
  const bump = (field, delta) => updateDay((d) => {
    const cur = d.custom[field.id] || 0;
    const dec = decimalsOf(field.step);
    d.custom[field.id] = Math.max(0, parseFloat((cur + delta).toFixed(dec)));
  });
  const setMood = (val) => updateDay((d) => { d.mood = val; });

  const perfectDisabled = !day.perfect && !isWin;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: NAV_HEIGHT + 24 }}>
      <View style={styles.ringCard}>
        <Text style={styles.dateLabel}>
          {new Date().toLocaleDateString(localeFor(language), { weekday: 'long', day: '2-digit', month: 'long' })}
        </Text>
        <RingChart
          day={day} customFields={customFields} score={score} max={max}
          perfect={day.perfect} perfectTrigger={perfectTrigger}
        />
        <View style={styles.scoreWrap}>
          <ElectricLine width={200} trigger={lineTrigger} />
          <Text style={[styles.scoreMsg, isWin && styles.scoreMsgWin]}>
            {isWin ? msg.toUpperCase() : msg}
          </Text>
          <ElectricLine width={200} trigger={lineTrigger} />
        </View>
      </View>

      {/* Fixed row: ProudOfMe (75%) + Perfect! (25%) */}
      <View style={styles.proudRow}>
        <TouchableOpacity
          style={[styles.quickBtn, { flex: 3 }, day.therapy && { backgroundColor: COLORS.c7 }]}
          onPress={() => toggleFixed('therapy')}
        >
          <ConfettiIcon size={18} />
          <Text style={[styles.quickBtnText, day.therapy && { color: COLORS.bg }]}>{t('common.proudOfMe')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickBtn, { flex: 1, justifyContent: 'center' },
            day.perfect && { backgroundColor: COLORS.c4 },
            perfectDisabled && styles.quickBtnDisabled,
          ]}
          onPress={() => toggleFixed('perfect')}
          disabled={perfectDisabled}
        >
          <Text style={[styles.quickBtnText, day.perfect && { color: COLORS.bg }, perfectDisabled && styles.quickBtnTextDisabled]}>{t('common.perfect')}</Text>
        </TouchableOpacity>
      </View>

      {/* Item 1 (focus group, 11/09/2026): na primeira visita de sempre
          (fieldsInitialized ainda false), mostra 5 sugestões a picotado
          em vez da grelha vazia — tocar em qualquer uma leva a
          Configurações. Assim que a pessoa mexe na lista de campos
          (mesmo para a deixar vazia de propósito), fieldsInitialized
          passa a true para sempre e este ecrã mostra o estado real. */}
      {!fieldsInitialized ? (
        <View style={styles.suggestedWrap}>
          <Text style={styles.suggestedTitle}>{t('hoje.suggestedTitle')}</Text>
          <Text style={styles.suggestedHint}>{t('hoje.suggestedHint')}</Text>
          <View style={styles.grid}>
            {suggestedFields(t).map((f) => (
              <TouchableOpacity key={f.key} style={styles.suggestedTile} onPress={() => onOpenConfig && onOpenConfig()}>
                <Shape shape={f.shape} color={f.color} size={18} />
                <Text style={[styles.tileText, { color: COLORS.inkSoft }]}>{f.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.grid}>
          {customFields.length === 0 && (
            <Text style={styles.emptyNote}>{t('hoje.emptyNote')}</Text>
          )}
          {customFields.map((f) => {
            if (f.type === 'bool') {
              const on = !!fieldValue(day, f);
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.tile, on && { backgroundColor: f.color, borderColor: 'transparent' }]}
                  onPress={() => toggleBool(f.id)}
                >
                  <Shape shape={f.shape} color={on ? textColorFor(f.color) : f.color} size={18} />
                  <Text style={[styles.tileText, on && { color: textColorFor(f.color) }]}>{f.name}</Text>
                </TouchableOpacity>
              );
            }
            const val = fieldValue(day, f);
            return (
              <View key={f.id} style={styles.countTile}>
                <View style={styles.countLabelRow}>
                  <Shape shape={f.shape} color={f.color} size={16} />
                  <Text style={styles.tileText}>{f.name}</Text>
                </View>
                <View style={styles.countControls}>
                  <TouchableOpacity style={[styles.wbtn, { backgroundColor: f.color }]} onPress={() => bump(f, -f.step)}>
                    <Text style={styles.wbtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.countNum}>{val}/{f.target}{f.metric ? ' ' + f.metric : ''}</Text>
                  <TouchableOpacity style={[styles.wbtn, { backgroundColor: f.color }]} onPress={() => bump(f, f.step)}>
                    <Text style={styles.wbtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Energia — item 9 do focus group: escala de 5 emojis (sad →
          happy) em vez do número livre de 1 a 5. */}
      <View style={styles.moodCard}>
        <View style={styles.moodLeft}>
          <Shape shape="plus" color={COLORS.electro} size={14} />
          <Text style={styles.tileText}>{t('common.energia')}</Text>
        </View>
        <View style={styles.moodOptions}>
          {energiaOptions(t).map((opt) => {
            const active = day.mood === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.moodOpt, active && styles.moodOptActive]}
                onPress={() => setMood(active ? 0 : opt.value)}
                accessibilityLabel={opt.label}
              >
                <Text style={styles.moodEmoji}>{opt.emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  ringCard: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 10, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center', marginBottom: 16 },
  dateLabel: { fontSize: 12.5, color: COLORS.inkSoft, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreWrap: { width: 200, marginTop: 8, alignItems: 'center', gap: 6 },
  scoreMsg: { fontFamily: FONTS.body, fontSize: 16, color: COLORS.electro, paddingVertical: 8 },
  scoreMsgWin: { fontFamily: FONTS.display, fontSize: 17, letterSpacing: 1 },

  proudRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, paddingHorizontal: 14, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line },
  quickBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.ink },
  quickBtnDisabled: { opacity: 0.4 },
  quickBtnTextDisabled: { color: COLORS.inkSoft },

  suggestedWrap: { marginBottom: 14 },
  suggestedTitle: { fontFamily: FONTS.bodyBold, fontSize: 12.5, color: COLORS.ink, marginBottom: 3 },
  suggestedHint: { fontSize: 11.5, color: COLORS.inkSoft, marginBottom: 10, lineHeight: 16 },
  suggestedTile: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, paddingHorizontal: 14, borderRadius: 8, backgroundColor: 'transparent', borderWidth: 2, borderColor: COLORS.line, borderStyle: 'dashed' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  emptyNote: { color: COLORS.inkSoft, fontSize: 13, textAlign: 'center', width: '100%', paddingVertical: 18 },
  tile: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, paddingHorizontal: 14, borderRadius: 8, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line },
  tileText: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: COLORS.ink },

  countTile: { width: '48%', backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 8, padding: 12, gap: 9 },
  countLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  countControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wbtn: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  wbtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 17 },
  countNum: { fontFamily: FONTS.mono, fontSize: 12.5, color: COLORS.ink },

  moodCard: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 8, padding: 15, gap: 12, marginBottom: 14 },
  moodLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  moodOptions: { flexDirection: 'row', justifyContent: 'space-between' },
  moodOpt: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: COLORS.bg },
  moodOptActive: { borderColor: COLORS.electro, borderWidth: 2, backgroundColor: '#22262b' },
  moodEmoji: { fontSize: 19 },
});
