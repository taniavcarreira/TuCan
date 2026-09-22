import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import ViewShot from 'react-native-view-shot';
// Só é usado no ramo web (ver notas junto de cada chamada), mas importa-se
// estaticamente porque é assim que o próprio react-native-view-shot usa o
// html2canvas internamente na sua build web — padrão já validado pelo
// Metro/Expo.
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import { currentScore, maxScore, fieldValue, fieldPercent } from '../utils/fields';
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
//
// Evolução a 21/09/2026 — filtros por campo: além do calendário geral
// (o de cima, sem filtro, continua a ser o que aparece por omissão),
// cada campo — âncora ou observação, não interessa — ganha a sua
// própria variante do calendário:
//   - Campo booleano: cor do próprio campo no dia em que foi marcado,
//     contorno neutro (igual ao "sem registo" de sempre) quando não.
//   - Campo métrico: um anel que enche à proporção do valor/meta desse
//     dia, na cor do campo — dias sem registo ficam sem nenhuma cor
//     (só o contorno neutro habitual), exatamente como pedido.
// Estas variantes só aparecem quando se aplica um filtro (chips por
// cima do cartão, fora da área capturada) — nunca por omissão.
// O botão Partilhar deixa de tirar um único screenshot: percorre o
// calendário geral e todos os calendários por campo, tira um
// screenshot de cada, e junta tudo num único PDF de várias páginas
// (jsPDF no browser, expo-print no iOS/Android) — pronto a descarregar
// ou a enviar pelos mesmos canais já propostos (WhatsApp, email, etc.).
//
// Nasceu numa branch à parte (`feature/calendario-partilha`) para não
// mexer no que a Tania estava a validar na main; já foi para produção
// a 21/09/2026.

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

// Anel de percentagem para um campo métrico, desenhado por cima do
// círculo do dia (mesma técnica do RingChart da Hoje: um Circle de
// fundo + um Circle com strokeDasharray proporcional, rodado -90º para
// começar às 12h). viewBox fixo 0-100 + width/height "100%" para
// acompanhar o tamanho do círculo do dia em qualquer ecrã, sem precisar
// de saber o tamanho em píxeis.
const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;
function PercentRing({ percent, color }) {
  const filled = RING_C * Math.max(0, Math.min(1, percent));
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" style={styles.ringSvg}>
      <Circle cx={50} cy={50} r={RING_R} fill="none" stroke={COLORS.line} strokeWidth={9} />
      {percent > 0 && (
        <Circle
          cx={50} cy={50} r={RING_R} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={`${filled} ${RING_C - filled}`}
          strokeLinecap="round"
        />
      )}
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
  const [shareProgress, setShareProgress] = useState(null); // { current, total } | null
  const [note, setNote] = useState('');
  const [filterFieldId, setFilterFieldId] = useState(null); // null = calendário geral (por omissão)
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

  const filterField = filterFieldId ? customFields.find((f) => f.id === filterFieldId) : null;

  // Estado de um dia — devolve sempre { kind, percent? }. `kind` é
  // 'full' | 'partial' | 'none' | 'future' no calendário geral, ou
  // 'on' | 'ring' | 'empty' | 'future' quando há um filtro de campo
  // aplicado (ver comentário no topo do ficheiro).
  function dayState(dateStr) {
    if (dateStr > today) return { kind: 'future' };
    const day = daysByDate[dateStr];
    if (filterField) {
      if (!day) return { kind: 'empty' };
      const percent = fieldPercent(day, filterField);
      if (percent <= 0) return { kind: 'empty' };
      return filterField.type === 'bool' ? { kind: 'on' } : { kind: 'ring', percent };
    }
    if (!day) return { kind: 'none' };
    const max = maxScore(customFields);
    const score = currentScore(day, customFields);
    const anyLog = day.mood > 0 || customFields.some((f) => {
      const v = fieldValue(day, f);
      return f.type === 'bool' ? !!v : v > 0;
    });
    if (max > 0 && score === max) return { kind: 'full' };
    if (anyLog) return { kind: 'partial' };
    return { kind: 'none' };
  }

  const loggedCount = Object.values(daysByDate).filter((day) => {
    return day.mood > 0 || customFields.some((f) => {
      const v = fieldValue(day, f);
      return f.type === 'bool' ? !!v : v > 0;
    });
  }).length;
  const fieldLoggedCount = useMemo(() => {
    if (!filterField) return 0;
    return Object.values(daysByDate).filter((day) => fieldPercent(day, filterField) > 0).length;
  }, [daysByDate, filterField]);
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

  // Espera que o browser/motor nativo já tenha pintado o novo filtro
  // antes de tirar o screenshot — trocar `filterFieldId` só faz efeito
  // no ecrã depois do próximo render, e o React não dá nenhuma garantia
  // síncrona disso.
  function waitForPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  // Tira o screenshot do cartão tal como está neste preciso momento e
  // devolve sempre um data URI (já pronto a usar num <img> ou num
  // pdf.addImage) — no web via html2canvas (ver nota no handleShare da
  // versão anterior sobre a incompatibilidade do capture() nativo da
  // biblioteca com o React Native Web), no iOS/Android via
  // react-native-view-shot em base64.
  async function captureCurrentPage() {
    if (Platform.OS === 'web') {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null });
      return { dataUri: canvas.toDataURL('image/png', 0.95), width: canvas.width, height: canvas.height };
    }
    const base64 = await shotRef.current.capture();
    return { dataUri: `data:image/png;base64,${base64}`, width: null, height: null };
  }

  async function handleShare() {
    setNote('');
    setSharing(true);
    const previousFilter = filterFieldId;
    try {
      // Uma página por calendário: o geral primeiro, depois um por
      // cada campo — âncora ou observação, todos entram (pedido
      // explícito da Tania a 21/09/2026).
      const pages = [
        { fieldId: null, label: t('calendar.title') },
        ...customFields.map((f) => ({ fieldId: f.id, label: f.name })),
      ];
      const captured = [];
      for (let i = 0; i < pages.length; i++) {
        setShareProgress({ current: i + 1, total: pages.length });
        setFilterFieldId(pages[i].fieldId);
        await waitForPaint();
        captured.push(await captureCurrentPage());
      }
      setFilterFieldId(previousFilter);
      setShareProgress(null);
      await waitForPaint();

      if (Platform.OS === 'web') {
        const first = captured[0];
        const pdf = new jsPDF({ unit: 'px', format: [first.width, first.height] });
        captured.forEach((page, i) => {
          if (i > 0) pdf.addPage([page.width, page.height]);
          pdf.addImage(page.dataUri, 'PNG', 0, 0, page.width, page.height);
        });
        const blob = pdf.output('blob');
        // O Web Share API só consegue anexar ficheiros reais (não um
        // link), por isso tentamos partilhar o PDF diretamente; se o
        // browser não suportar partilha de ficheiros (a maioria dos
        // desktops), descarregamos o PDF e explicamos à pessoa como o
        // anexar à mão.
        const file = new File([blob], 'tucan-progresso.pdf', { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: t('calendar.shareTitle') });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'tucan-progresso.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setNote(t('calendar.shareDownloaded'));
        }
      } else {
        // iOS/Android: expo-print compõe as imagens num PDF real de
        // várias páginas (uma <img> por página, quebra de página a
        // seguir a cada uma); a folha de partilha nativa que já
        // tínhamos para a imagem única serve na mesma para o PDF.
        const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;padding:0;">${captured
          .map((page) => `<div style="page-break-after:always;"><img src="${page.dataUri}" style="width:100%;display:block;" /></div>`)
          .join('')}</body></html>`;
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, { dialogTitle: t('calendar.shareTitle'), mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
        } else {
          setNote(t('calendar.shareError'));
        }
      }
    } catch (e) {
      console.error('CalendarShareScreen share', e);
      setFilterFieldId(previousFilter);
      setNote(t('calendar.shareError'));
    } finally {
      setSharing(false);
      setShareProgress(null);
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

      {customFields.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, !filterFieldId && styles.filterChipActiveDefault]}
            onPress={() => setFilterFieldId(null)}
          >
            <Text style={[styles.filterChipText, !filterFieldId && styles.filterChipTextActive]}>{t('calendar.filterAll')}</Text>
          </TouchableOpacity>
          {customFields.map((f) => {
            const active = filterFieldId === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, active && { backgroundColor: f.color, borderColor: f.color }]}
                onPress={() => setFilterFieldId(f.id)}
              >
                <View style={[styles.filterChipDot, { backgroundColor: f.color }]} />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.95, result: 'base64' }}>
        <View ref={cardRef} style={styles.shareCard}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>{t('common.appName')}</Text>
            {filterField && <Text style={styles.brandFieldText}>{filterField.name}</Text>}
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
                  const s = dayState(cell.date);
                  return (
                    <View key={ci} style={styles.dayCell}>
                      <View style={[
                        styles.dayCircle,
                        s.kind === 'full' && styles.dayCircleFull,
                        s.kind === 'partial' && styles.dayCirclePartial,
                        (s.kind === 'none' || s.kind === 'empty') && styles.dayCircleNone,
                        s.kind === 'future' && styles.dayCircleFuture,
                        s.kind === 'ring' && styles.dayCircleNone,
                        s.kind === 'on' && filterField && { backgroundColor: filterField.color, borderColor: filterField.color },
                      ]}>
                        {s.kind === 'ring' && <PercentRing percent={s.percent} color={filterField.color} />}
                        <Text style={[
                          styles.dayNumber,
                          (s.kind === 'full' || s.kind === 'partial' || s.kind === 'on') && styles.dayNumberOnColor,
                        ]}>{cell.day}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}

          {filterField ? (
            filterField.type === 'bool' ? (
              <View style={styles.legendRow}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: filterField.color }]} /><Text style={styles.legendText}>{t('calendar.legendPartial')}</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCircleNone]} /><Text style={styles.legendText}>{t('calendar.legendNone')}</Text></View>
              </View>
            ) : (
              <View style={styles.legendRow}>
                <Text style={styles.legendText}>{t('calendar.legendRingHint')}</Text>
              </View>
            )
          ) : (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCircleFull]} /><Text style={styles.legendText}>{t('calendar.legendFull')}</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCirclePartial]} /><Text style={styles.legendText}>{t('calendar.legendPartial')}</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCircleNone]} /><Text style={styles.legendText}>{t('calendar.legendNone')}</Text></View>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{liveCycle ? t('calendar.statCrossingDays', { n: liveCycle.daysLogged }) : '—'}</Text>
              <Text style={styles.statLabel}>{t('calendar.statCrossing')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{filterField ? `${fieldLoggedCount}/${daysInMonth}` : `${loggedCount}/${daysInMonth}`}</Text>
              <Text style={styles.statLabel}>{filterField ? t('calendar.statFieldLogged', { name: filterField.name }) : t('calendar.statLogged')}</Text>
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
            <Text style={styles.shareBtnText}>
              {shareProgress ? t('calendar.preparingShareProgress', { current: shareProgress.current, total: shareProgress.total }) : t('calendar.preparingShare')}
            </Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  h1: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.ink },
  closeText: { color: COLORS.electro, fontFamily: FONTS.bodyBold, fontSize: 13 },

  filterRow: { marginBottom: 14, flexGrow: 0 },
  filterRowContent: { gap: 8, paddingRight: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 12,
  },
  filterChipActiveDefault: { backgroundColor: COLORS.electro, borderColor: COLORS.electro },
  filterChipDot: { width: 8, height: 8, borderRadius: 4 },
  filterChipText: { fontSize: 12.5, color: COLORS.inkSoft, fontFamily: FONTS.bodyBold },
  filterChipTextActive: { color: '#fff' },

  shareCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 2, borderColor: COLORS.line, padding: 18 },
  brandRow: { alignItems: 'center', marginBottom: 4 },
  brandText: { fontFamily: FONTS.display, fontSize: 15, color: COLORS.ink, letterSpacing: 0.5 },
  brandFieldText: { fontSize: 11.5, color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },

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
  ringSvg: { position: 'absolute', top: 0, left: 0 },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginBottom: 4, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10.5, color: COLORS.inkSoft, textAlign: 'center' },

  statsRow: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 14 },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: FONTS.display, fontSize: 17, color: COLORS.ink },
  statLabel: { fontSize: 9.5, color: COLORS.inkSoft, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },

  shareBtn: { marginTop: 20, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.electro, borderRadius: 10, paddingVertical: 14 },
  shareBtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 14 },
  note: { color: COLORS.inkSoft, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 17, paddingHorizontal: 10 },
});
