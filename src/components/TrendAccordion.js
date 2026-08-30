import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { currentScore, maxScore } from '../utils/fields';
import { monthLabelPt, fmt } from '../utils/dates';

function bucketsFor(period) {
  const now = new Date();
  const list = [];
  if (period === 'year') {
    for (let i = 4; i >= 0; i--) {
      const y = now.getFullYear() - i;
      list.push({ key: String(y), label: String(y) });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({ key: d.getFullYear() + '-' + d.getMonth(), label: monthLabelPt(d.getFullYear(), d.getMonth()) });
    }
  }
  return list;
}

function rangeFor(period) {
  const now = new Date();
  const from = period === 'year'
    ? new Date(now.getFullYear() - 4, 0, 1)
    : new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return { fromISO: fmt(from), toISO: fmt(now) };
}

// Collapsed by default — the monthly/annual trend accordion from the
// web version. Fetches `days` rows lazily (only once expanded, and
// again whenever the period changes) via `loadTrendDays`, since this
// needs a much wider date range than the single week SemanaScreen
// normally loads.
export default function TrendAccordion({ loadTrendDays, customFields }) {
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(null); // null = not loaded yet

  const load = useCallback(async (p) => {
    setLoading(true);
    const { fromISO, toISO } = rangeFor(p);
    const rows = await loadTrendDays(fromISO, toISO);
    setDays(rows);
    setLoading(false);
  }, [loadTrendDays]);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && days === null) load(period);
  }

  function changePeriod(p) {
    setPeriod(p);
    load(p);
  }

  const max = maxScore(customFields);
  const list = bucketsFor(period);
  const buckets = list.map((b) => ({ ...b, sum: 0, n: 0 }));
  if (days) {
    const byKey = {};
    buckets.forEach((b) => { byKey[b.key] = b; });
    days.forEach((day) => {
      const d = new Date(day.date + 'T00:00:00');
      const key = period === 'year' ? String(d.getFullYear()) : d.getFullYear() + '-' + d.getMonth();
      const b = byKey[key];
      if (!b || max <= 0) return;
      b.sum += currentScore(day, customFields) / max;
      b.n += 1;
    });
  }
  const rendered = buckets.map((b) => ({ ...b, pct: b.n ? Math.round((b.sum / b.n) * 100) : 0 }));

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={toggle}>
        <Text style={styles.title}>Tendência mensal / anual</Text>
        <Text style={styles.chevron}>{expanded ? '−' : '+'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View>
          <View style={styles.periodToggle}>
            {[['month', 'Mês'], ['year', 'Ano']].map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.periodBtn, period === key && styles.periodBtnActive]}
                onPress={() => changePeriod(key)}
              >
                <Text style={[styles.periodBtnText, period === key && styles.periodBtnTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <Text style={styles.loadingText}>A carregar…</Text>
          ) : (
            <View style={styles.barChart}>
              {rendered.map((b, i) => (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barN}>{b.n ? b.pct + '%' : ''}</Text>
                  <View style={[styles.bar, { height: `${Math.max(b.pct, b.n ? 4 : 0)}%` }]} />
                  <Text style={styles.barLabel}>{b.label}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.footNote}>
            Média do score diário (score/máximo) em cada {period === 'year' ? 'ano' : 'mês'}.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 10, padding: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: FONTS.display, fontSize: 14.5, color: COLORS.ink },
  chevron: { fontFamily: FONTS.display, fontSize: 18, color: COLORS.electro },

  periodToggle: { flexDirection: 'row', gap: 6, marginTop: 16, marginBottom: 14 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg },
  periodBtnActive: { backgroundColor: COLORS.electro, borderColor: COLORS.electro },
  periodBtnText: { color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, fontSize: 12.5 },
  periodBtnTextActive: { color: COLORS.bg },

  loadingText: { color: COLORS.inkSoft, fontSize: 12.5, textAlign: 'center', paddingVertical: 20 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 5 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%', maxWidth: 20, backgroundColor: COLORS.electro, borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 2 },
  barN: { fontFamily: FONTS.mono, fontSize: 9, color: COLORS.inkSoft, marginBottom: 3 },
  barLabel: { fontSize: 8.5, color: COLORS.inkSoft, marginTop: 6, textAlign: 'center' },

  footNote: { fontSize: 10.5, color: COLORS.inkSoft, lineHeight: 15, marginTop: 10, textAlign: 'center' },
});
