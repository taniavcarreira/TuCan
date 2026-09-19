import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
// Só é usado no ramo web do handleShare (ver nota abaixo), mas importa-se
// estaticamente porque é assim que o próprio react-native-view-shot o usa
// internamente na sua build web — padrão já validado pelo Metro/Expo.
import html2canvas from 'html2canvas';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import { currentScore, maxScore, fieldValue } from '../utils/fields';
import { monthGrid, monthLongLabel, todayISO, fmt } from '../utils/dates';

// Calendário de partilha — pedido da Tania a 20/09/2026, inspirado no
// ecrã de streak do YaZio (imagem em anexo na conversa), mas adaptado
// aos princípios da secção 0 da especificação:
//   - NUNCA um X vermelho num dia sem registo — não é uma falha, é só
//     um dia sem dados (princípio 6, "reenquadramento não avaliação").
//     Dias sem registo ficam com um contorno neutro, iguais a dias
//     futuros.
//   - Sem "Peso" nem qualquer número que alimente compulsão (princípio
//     5) — o terceiro indicador é "Badges este mês" em vez disso.
//   - Três estados por dia (não dois): todas as âncoras cumpridas /
//     algum registo sem cumprir tudo / sem registo — o mesmo modelo já
//     desenhado para o Bloco 1 do relatório semanal (secção 7.1), só
//     que agora num mês inteiro em vez de uma semana.
// Nasce numa branch à parte (`feature/calendario-partilha`) para não
// mexer no que a Tania está a validar na main.

function ChevronIcon({ dir, color }) {
  const d = dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6';
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <Path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ShareIcon({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
      <Path d="M12 3v12M7 8l5-5 5 5M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function CalendarShareScreen({ onClose }) {
  const { customFields, loadTrendDays, badgesData } = useData();
  const { t, language } = useLanguage();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [daysByDate, setDaysByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState('');
  const shotRef = useRef(null);
  const cardRef = useRef(null);

  const today = todayISO();
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  // Só a primeira letra maiúscula ("Agosto de 2026", não "Agosto De
  // 2026") — capitalizar via CSS (textTransform) capitalizaria todas as
  // palavras, incluindo o "de" em português.
  const rawMonthLabel = monthLongLabel(cursor.year, cursor.month, language);
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fromISO = fmt(new Date(cursor.year, cursor.month, 1));
    const toISO = fmt(new Date(cursor.year, cursor.month + 1, 0));
    loadTrendDays(fromISO, toISO).then((rows) => {
      if (cancelled) return;
      const map = {};
      rows.forEach((r) => { map[r.date] = r; });
      setDaysByDate(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [cursor, loadTrendDays]);

  function dayState(dateStr) {
    if (dateStr > today) return 'future';
    const day = daysByDate[dateStr];
    if (!day) return 'none';
    const max = maxScore(customFields);
    const score = currentScore(day, customFields);
    const anyLog = day.mood > 0 || customFields.some((f) => {
      const v = fieldValue(day, f);
      return f.type === 'bool' ? !!v : v > 0;
    });
    if (max > 0 && score === max) return 'full';
    if (anyLog) return 'partial';
    return 'none';
  }

  const loggedCount = Object.values(daysByDate).filter((day) => {
    return day.mood > 0 || customFields.some((f) => {
      const v = fieldValue(day, f);
      return f.type === 'bool' ? !!v : v > 0;
    });
  }).length;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const badgesThisMonth = useMemo(() => {
    const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
    let n = 0;
    Object.values(badgesData.byBadge || {}).forEach((list) => {
      list.forEach((e) => { if (e.date.startsWith(prefix)) n++; });
    });
    return n;
  }, [badgesData, cursor]);

  const liveCycle = badgesData.cycles && badgesData.cycles.length ? badgesData.cycles[badgesData.cycles.length - 1] : null;

  function changeMonth(delta) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  async function handleShare() {
    setNote('');
    setSharing(true);
    try {
      let uri;
      if (Platform.OS === 'web') {
        // react-native-view-shot 4.x resolve a view via findNodeHandle
        // antes de chamar a implementação web — e essa resolução falha
        // nesta combinação de Expo/react-native-web ("findNodeHandle is
        // not supported on web"). Em vez de depender do capture() da
        // biblioteca, chamamos o html2canvas diretamente sobre o nó DOM
        // do cartão: no react-native-web, a ref de uma <View> já é o
        // próprio elemento DOM (View faz forwardRef para o host), por
        // isso cardRef.current serve tal e qual.
        const canvas = await html2canvas(cardRef.current, { backgroundColor: null });
        uri = canvas.toDataURL('image/png', 0.95);
      } else {
        // iOS/Android: caminho nativo normal da biblioteca.
        uri = await shotRef.current.capture();
      }

      if (Platform.OS === 'web') {
        // O Web Share API só consegue anexar ficheiros reais (não um
        // link), por isso convertemos para um File e tentamos partilhar;
        // se o browser não suportar partilha de ficheiros (a maioria dos
        // desktops), descarregamos a imagem e explicamos à pessoa como
        // a anexar à mão.
        const res = await fetch(uri);
        const blob = await res.blob();
        const file = new File([blob], 'tucan-progresso.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: t('calendar.shareTitle') });
        } else {
          const a = document.createElement('a');
          a.href = uri;
          a.download = 'tucan-progresso.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setNote(t('calendar.shareDownloaded'));
        }
      } else {
        // iOS/Android: a folha de partilha nativa já lista WhatsApp,
        // Email, Mensagens, etc. — exatamente o pedido original.
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, { dialogTitle: t('calendar.shareTitle') });
        } else {
          setNote(t('calendar.shareError'));
        }
      }
    } catch (e) {
      console.error('CalendarShareScreen share', e);
      setNote(t('calendar.shareError'));
    } finally {
      setSharing(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>{t('calendar.title')}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>{t('common.close')}</Text></TouchableOpacity>
        )}
      </View>

      <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.95, result: 'tmpfile' }}>
        <View ref={cardRef} style={styles.shareCard}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>{t('common.appName')}</Text>
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
              <ChevronIcon dir="left" color={COLORS.ink} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
              <ChevronIcon dir="right" color={COLORS.ink} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekHeaderRow}>
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
              <Text key={i} style={styles.weekHeaderText}>{d}</Text>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.electro} style={{ marginVertical: 30 }} />
          ) : (
            weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((cell, ci) => {
                  if (!cell) return <View key={ci} style={styles.dayCell} />;
                  const state = dayState(cell.date);
                  return (
                    <View key={ci} style={styles.dayCell}>
                      <View style={[
                        styles.dayCircle,
                        state === 'full' && styles.dayCircleFull,
                        state === 'partial' && styles.dayCirclePartial,
                        state === 'none' && styles.dayCircleNone,
                        state === 'future' && styles.dayCircleFuture,
                      ]}>
                        <Text style={[
                          styles.dayNumber,
                          (state === 'full' || state === 'partial') && styles.dayNumberOnColor,
                        ]}>{cell.day}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCircleFull]} /><Text style={styles.legendText}>{t('calendar.legendFull')}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCirclePartial]} /><Text style={styles.legendText}>{t('calendar.legendPartial')}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCircleNone]} /><Text style={styles.legendText}>{t('calendar.legendNone')}</Text></View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{liveCycle ? t('calendar.statCrossingDays', { n: liveCycle.daysLogged }) : '—'}</Text>
              <Text style={styles.statLabel}>{t('calendar.statCrossing')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loggedCount}/{daysInMonth}</Text>
              <Text style={styles.statLabel}>{t('calendar.statLogged')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{badgesThisMonth}</Text>
              <Text style={styles.statLabel}>{t('calendar.statBadges')}</Text>
            </View>
          </View>
        </View>
      </ViewShot>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
        {sharing ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.shareBtnText}>{t('calendar.preparingShare')}</Text>
          </>
        ) : (
          <>
            <ShareIcon color="#fff" />
            <Text style={styles.shareBtnText}>{t('calendar.shareButton')}</Text>
          </>
        )}
      </TouchableOpacity>

      {!!note && <Text style={styles.note}>{note}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  h1: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.ink },
  closeText: { color: COLORS.electro, fontFamily: FONTS.bodyBold, fontSize: 13 },

  shareCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 2, borderColor: COLORS.line, padding: 18 },
  brandRow: { alignItems: 'center', marginBottom: 4 },
  brandText: { fontFamily: FONTS.display, fontSize: 15, color: COLORS.ink, letterSpacing: 0.5 },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 8, marginBottom: 14 },
  navBtn: { padding: 6 },
  monthLabel: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.ink, minWidth: 150, textAlign: 'center' },

  weekHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  weekHeaderText: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.inkSoft, fontFamily: FONTS.bodyBold },

  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: '78%', height: '78%', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  dayCircleFull: { backgroundColor: COLORS.sporting },
  dayCirclePartial: { backgroundColor: COLORS.mostarda },
  dayCircleNone: { borderColor: COLORS.line },
  dayCircleFuture: { borderColor: 'transparent' },
  dayNumber: { fontSize: 12, color: COLORS.inkSoft, fontFamily: FONTS.bodyRegular },
  dayNumberOnColor: { color: '#fff', fontFamily: FONTS.bodyBold },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginBottom: 4, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10.5, color: COLORS.inkSoft },

  statsRow: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 14 },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: FONTS.display, fontSize: 17, color: COLORS.ink },
  statLabel: { fontSize: 9.5, color: COLORS.inkSoft, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },

  shareBtn: { marginTop: 20, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.electro, borderRadius: 10, paddingVertical: 14 },
  shareBtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 14 },
  note: { color: COLORS.inkSoft, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 17, paddingHorizontal: 10 },
});
