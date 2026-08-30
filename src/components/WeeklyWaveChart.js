import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { COLORS } from '../theme';
import { currentScore, maxScore } from '../utils/fields';

const W = 320;
const H = 90;
const PAD = 10;

// Builds a smooth curve through a set of points using each pair's
// midpoint as the anchor for a quadratic bezier segment, then a final
// smooth "T" command for the last point. Lighter than a full
// Catmull-Rom spline but reads as a smooth wave for 7 data points,
// which is all the Semana tab ever needs.
function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x} ${p0.y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` T ${last.x} ${last.y}`;
  return d;
}

// Recreates the web version's weekly wave chart: one point per day of
// the currently-viewed week, height = score/max for that day. Reuses
// `weekData` that SemanaScreen already has loaded — no extra Supabase
// call needed.
export default function WeeklyWaveChart({ weekData, customFields }) {
  const max = maxScore(customFields);
  const ratios = Array.from({ length: 7 }, (_, i) => {
    const day = weekData.days[i];
    if (!day || max <= 0) return 0;
    return currentScore(day, customFields) / max;
  });

  const usableW = W - PAD * 2;
  const points = ratios.map((r, i) => ({
    x: PAD + (usableW * i) / 6,
    y: PAD + (1 - r) * (H - PAD * 2),
  }));

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.electro} stopOpacity="0.35" />
            <Stop offset="1" stopColor={COLORS.electro} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#waveFill)" stroke="none" />
        <Path d={linePath} fill="none" stroke={COLORS.electro} strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r="3.2" fill={COLORS.electro} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
});
