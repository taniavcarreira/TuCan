import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { COLORS, FONTS, NAV_HEIGHT } from '../theme';

function HojeIcon({ color }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M8 12l3 3 5-6" />
    </Svg>
  );
}
function SemanaIcon({ color }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <Rect x="3" y="5" width="18" height="16" rx="2" />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}
function TreinoIcon({ color }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <Path d="M6.5 6.5l11 11M4 9l3-3M20 15l-3 3M2 20l4-4M18 6l4-2M17 7l3-3M4 20l2-4" />
    </Svg>
  );
}

const TABS = [
  { key: 'hoje', label: 'Hoje', Icon: HojeIcon },
  { key: 'semana', label: 'Semana', Icon: SemanaIcon },
  { key: 'treino', label: 'Treino', Icon: TreinoIcon },
];

export default function BottomNav({ active, onChange }) {
  return (
    <View style={styles.nav}>
      {TABS.map(({ key, label, Icon }) => {
        const isActive = active === key;
        const color = isActive ? COLORS.electro : COLORS.inkSoft;
        return (
          <TouchableOpacity key={key} style={styles.btn} onPress={() => onChange(key)}>
            <Icon color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
            <View style={[styles.dot, { opacity: isActive ? 1 : 0 }]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: NAV_HEIGHT,
    backgroundColor: COLORS.card, borderTopWidth: 2, borderTopColor: COLORS.line,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
  },
  btn: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 6, gap: 4 },
  label: { fontFamily: FONTS.bodyBold, fontSize: 10.5 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.electro, marginTop: 1 },
});
