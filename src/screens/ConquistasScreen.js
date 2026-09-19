import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { COLORS, FONTS, NAV_HEIGHT } from '../theme';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import { BADGE_ORDER, isUnique } from '../utils/badges';
import { fmtLongDate } from '../utils/dates';
import BadgeIcon from '../components/BadgeIcon';

// Aba Conquistas — especificação v2, secção 4 (12/09/2026). Três
// sub-vistas (coleção / linha do tempo / por dia) + o detalhe por
// badge ao tocar numa medalha ganha. Regra que governa tudo aqui,
// repetida da secção 0: só aparece o que já foi ganho — nunca uma
// silhueta cinzenta, nunca "3 de 12". A coleção cresce, não se
// preenche.

function useAllEarned(byBadge) {
  return useMemo(() => {
    const all = [];
    Object.entries(byBadge).forEach(([badgeId, list]) => {
      list.forEach((e) => all.push({ ...e, badgeId }));
    });
    all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return all;
  }, [byBadge]);
}

export default function ConquistasScreen() {
  const { badgesData } = useData();
  const { t, language } = useLanguage();
  const [subTab, setSubTab] = useState('collection');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const byBadge = badgesData.byBadge || {};
  const allEarned = useAllEarned(byBadge);
  const hasAny = allEarned.length > 0;

  // Nota: a fusão de travessias-fantasma (mergeGhostCycles, secção 3
  // regra 3) aplica-se aos futuros relatórios (secção 7, ainda por
  // implementar) — aqui mostra-se sempre a travessia viva tal como
  // está, mesmo que ainda tenha menos de 3 dias.
  const liveCycle = badgesData.cycles && badgesData.cycles.length ? badgesData.cycles[badgesData.cycles.length - 1] : null;

  const collection = useMemo(() => {
    return BADGE_ORDER
      .filter((id) => byBadge[id] && byBadge[id].length)
      .map((id) => ({ id, count: byBadge[id].length, latest: byBadge[id][0].date }))
      .sort((a, b) => (a.latest < b.latest ? 1 : -1));
  }, [byBadge]);

  const byDate = useMemo(() => {
    const map = {};
    allEarned.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [allEarned]);
  const dateKeys = Object.keys(byDate).sort((a, b) => (a < b ? 1 : -1));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: NAV_HEIGHT + 24 }}>
      <Text style={styles.h1}>{t('conquistas.title')}</Text>

      {liveCycle && (
        <View style={styles.crossingBanner}>
          <Text style={styles.crossingLabel}>{t('conquistas.currentCrossing')}</Text>
          <Text style={styles.crossingDate}>{t('conquistas.crossingOf', { date: fmtLongDate(liveCycle.startedOn, language) })}</Text>
          <Text style={styles.crossingDays}>{t('conquistas.daysInCrossing', { n: liveCycle.daysLogged })}</Text>
        </View>
      )}

      <View style={styles.tabsRow}>
        {[
          ['collection', t('conquistas.tabCollection')],
          ['timeline', t('conquistas.tabTimeline')],
          ['daily', t('conquistas.tabDaily')],
        ].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.subTabBtn, subTab === key && styles.subTabBtnActive]} onPress={() => setSubTab(key)}>
            <Text style={[styles.subTabText, subTab === key && styles.subTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!hasAny && <Text style={styles.empty}>{t('conquistas.empty')}</Text>}

      {hasAny && subTab === 'collection' && (
        <View style={styles.grid}>
          {collection.map((b) => (
            <TouchableOpacity key={b.id} style={styles.gridItem} onPress={() => setSelectedBadge(b.id)}>
              <BadgeIcon badgeId={b.id} size={76} count={b.count} />
              <Text style={styles.gridItemName}>{t(`badge.${b.id}.name`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {hasAny && subTab === 'timeline' && (
        <View style={styles.timeline}>
          {allEarned.map((e, i) => (
            <View key={`${e.badgeId}-${e.date}-${i}`} style={styles.timelineRow}>
              <View style={styles.timelineDotCol}>
                <View style={styles.timelineDot} />
                {i < allEarned.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <TouchableOpacity style={styles.timelineContent} onPress={() => setSelectedBadge(e.badgeId)}>
                <BadgeIcon badgeId={e.badgeId} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineName}>{t(`badge.${e.badgeId}.name`)}</Text>
                  <Text style={styles.timelineDate}>{fmtLongDate(e.date, language)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {hasAny && subTab === 'daily' && (
        <View style={styles.accordion}>
          {dateKeys.map((date) => (
            <TouchableOpacity key={date} style={styles.dayRow} onPress={() => setSelectedDay(date)}>
              <Text style={styles.dayDate}>{fmtLongDate(date, language)}</Text>
              <View style={styles.dayBadges}>
                {byDate[date].map((e, i) => (
                  <BadgeIcon key={i} badgeId={e.badgeId} size={32} />
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Histórico por badge — secção 4, ponto 4: tocar numa medalha
          ganha mostra todas as datas em que foi obtida. */}
      <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={() => setSelectedBadge(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            {selectedBadge && (
              <>
                <BadgeIcon badgeId={selectedBadge} size={72} />
                <Text style={styles.modalName}>{t(`badge.${selectedBadge}.name`)}</Text>
                <Text style={styles.modalDesc}>{t(`badge.${selectedBadge}.desc`)}</Text>
                {isUnique(selectedBadge) ? null : (
                  <Text style={styles.modalSectionTitle}>{t('conquistas.badgeHistoryTitle')}</Text>
                )}
                <ScrollView style={{ maxHeight: 180, width: '100%' }}>
                  {(byBadge[selectedBadge] || []).map((e, i) => (
                    <Text key={i} style={styles.modalDate}>{fmtLongDate(e.date, language)}</Text>
                  ))}
                </ScrollView>
              </>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedBadge(null)}>
              <Text style={styles.modalCloseText}>{t('conquistas.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedDay} transparent animationType="fade" onRequestClose={() => setSelectedDay(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            {selectedDay && (
              <>
                <Text style={styles.modalName}>{fmtLongDate(selectedDay, language)}</Text>
                {(byDate[selectedDay] || []).length === 0 ? (
                  <Text style={styles.modalDesc}>{t('conquistas.noBadgesThatDay')}</Text>
                ) : (
                  <View style={{ gap: 10, alignItems: 'center', marginTop: 8 }}>
                    {(byDate[selectedDay] || []).map((e, i) => (
                      <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                        <BadgeIcon badgeId={e.badgeId} size={56} />
                        <Text style={styles.modalDesc}>{t(`badge.${e.badgeId}.name`)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedDay(null)}>
              <Text style={styles.modalCloseText}>{t('conquistas.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  h1: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.ink, marginBottom: 14 },

  crossingBanner: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 10, padding: 14, marginBottom: 16 },
  crossingLabel: { fontSize: 10.5, color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  crossingDate: { fontFamily: FONTS.display, fontSize: 16, color: COLORS.ink },
  crossingDays: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 3 },

  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  subTabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg },
  subTabBtnActive: { backgroundColor: COLORS.electro, borderColor: COLORS.electro },
  subTabText: { color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, fontSize: 11.5 },
  subTabTextActive: { color: COLORS.bg },

  empty: { color: COLORS.inkSoft, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 36, paddingHorizontal: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '30%', alignItems: 'center', gap: 6, marginBottom: 8 },
  gridItemName: { fontSize: 10.5, color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, textAlign: 'center' },

  timeline: {},
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineDotCol: { alignItems: 'center', width: 14 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.electro, marginTop: 18 },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.line, marginVertical: 2 },
  timelineContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  timelineName: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: COLORS.ink },
  timelineDate: { fontSize: 11.5, color: COLORS.inkSoft, marginTop: 2 },

  accordion: {},
  dayRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line, gap: 8 },
  dayDate: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: COLORS.ink },
  dayBadges: { flexDirection: 'row', gap: 8 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 340, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 14, padding: 22, alignItems: 'center', gap: 6 },
  modalName: { fontFamily: FONTS.display, fontSize: 17, color: COLORS.ink, textAlign: 'center', marginTop: 8 },
  modalDesc: { fontSize: 12.5, color: COLORS.inkSoft, textAlign: 'center', lineHeight: 18 },
  modalSectionTitle: { fontSize: 10.5, color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, alignSelf: 'flex-start' },
  modalDate: { fontSize: 13, color: COLORS.ink, paddingVertical: 5, textAlign: 'center' },
  modalCloseBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line },
  modalCloseText: { color: COLORS.ink, fontFamily: FONTS.bodyBold, fontSize: 13 },
});
