import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS, textColorFor, NAV_HEIGHT } from '../theme';
import { useData } from '../context/DataContext';
import { currentScore, maxScore, scoreMessage, fieldOk, fieldValue, decimalsOf } from '../utils/fields';
import RingChart from '../components/RingChart';
import Shape, { ConfettiIcon } from '../components/Shape';
import ElectricLine from '../components/ElectricLine';
import { DEFAULT_AVATAR } from '../utils/avatars';

export default function HojeScreen({ onCelebrate }) {
  const { todayWeek, todayIndex, saveToday, customFields } = useData();
  const [lineTrigger, setLineTrigger] = useState(0);
  const [perfectTrigger, setPerfectTrigger] = useState(0);
  const day = todayWeek.days[todayIndex];

  if (!day) return null;

  const score = currentScore(day, customFields);
  const max = maxScore(customFields);
  const msg = scoreMessage(score, max);
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

  const toggleFixed = (key) => updateDay((d) => { d[key] = !d[key]; });
  const toggleBool = (fieldId) => updateDay((d) => { d.custom[fieldId] = !d.custom[fieldId]; });
  const bump = (field, delta) => updateDay((d) => {
    const cur = d.custom[field.id] || 0;
    const dec = decimalsOf(field.step);
    d.custom[field.id] = Math.max(0, parseFloat((cur + delta).toFixed(dec)));
  });
  const setMood = (val) => updateDay((d) => { d.mood = val; });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: NAV_HEIGHT + 24 }}>
      <View style={styles.ringCard}>
        <Text style={styles.dateLabel}>
          {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' })}
        </Text>
        <RingChart
          day={day} customFields={customFields} score={score} max={max}
          perfect={day.perfect} avatar={DEFAULT_AVATAR} perfectTrigger={perfectTrigger}
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
          <Text style={[styles.quickBtnText, day.therapy && { color: COLORS.bg }]}>ProudOfMe</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { flex: 1, justifyContent: 'center' }, day.perfect && { backgroundColor: COLORS.c4 }]}
          onPress={() => toggleFixed('perfect')}
        >
          <Text style={[styles.quickBtnText, day.perfect && { color: COLORS.bg }]}>Perfect!</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic custom fields, 50% width each */}
      <View style={styles.grid}>
        {customFields.length === 0 && (
          <Text style={styles.emptyNote}>
            Ainda sem campos configurados. Vai a Configurações para adicionar os teus.
          </Text>
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

      {/* Energia — kept as its own fixed 1-5 scale, separate from the
          configurable field system (see README for why). */}
      <View style={styles.moodCard}>
        <View style={styles.moodLeft}>
          <Shape shape="plus" color={COLORS.electro} size={14} />
          <Text style={styles.tileText}>Energia</Text>
        </View>
        <TextInput
          style={styles.moodInput}
          keyboardType="number-pad"
          maxLength={1}
          value={day.mood ? String(day.mood) : ''}
          placeholder="–"
          placeholderTextColor={COLORS.inkSoft}
          onChangeText={(t) => {
            let v = parseInt(t, 10);
            if (isNaN(v)) v = 0;
            v = Math.max(0, Math.min(5, v));
            setMood(v);
          }}
        />
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

  moodCard: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 8, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  moodLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  moodInput: { width: 52, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: COLORS.bg, textAlign: 'center', fontFamily: FONTS.mono, fontSize: 16, color: COLORS.ink },
});
