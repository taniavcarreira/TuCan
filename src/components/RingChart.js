import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { fieldOk } from '../utils/fields';

const SIZE = 190;
const R = 82;
const CX = 100;
const CY = 100;
const C = 2 * Math.PI * R;

// Composição "Perfect!" (item 7 do focus group, 11/09/2026): a Tania
// enviou um GIF (tucano animado sobre um círculo verde-água, já com o
// padrão de folhas embutido) para substituir a antiga composição
// toucan-leaves-bg.png + ToucanAvatar a "voar" para o poleiro. Convertido
// para WebP animado (perfect-toucan.webp, sem perdas, alfa preservado —
// ver assets/images/) para animar de forma fiável em iOS/Android/Web via
// expo-image (o <Image> nativo do RN só mostra o 1º frame de GIF/WebP
// animados no iOS). O ficheiro já traz o próprio fundo circular, por isso
// ocupa aqui o mesmo espaço que o anel ocupava, sem stroke por baixo.
const PERFECT_IMAGE_SIZE = SIZE;

export default function RingChart({ day, customFields, score, max, perfect, perfectTrigger }) {
  // Entrada animada: a imagem "voa" a partir de fora do ecrã (pequena,
  // semi-transparente, deslocada) e assenta no lugar com um pequeno
  // efeito de mola. Começa já "pousada" (opacidade/escala = 1, sem
  // deslocamento) para que estar num dia Perfect! não repita a animação
  // sozinho — só um toque real em Perfect! (um `perfectTrigger` novo) o
  // faz.
  const flyScale = useRef(new Animated.Value(1)).current;
  const flyOpacity = useRef(new Animated.Value(1)).current;
  const flyTX = useRef(new Animated.Value(0)).current;
  const flyTY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!perfectTrigger) return;
    flyScale.setValue(0.35);
    flyOpacity.setValue(0);
    flyTX.setValue(64);
    flyTY.setValue(-56);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(flyOpacity, { toValue: 1, duration: 160, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(flyTX, { toValue: 0, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(flyTY, { toValue: 0, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(flyScale, { toValue: 1.08, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.spring(flyScale, { toValue: 1, friction: 4.5, tension: 100, useNativeDriver: true }),
    ]).start();
  }, [perfectTrigger]);

  if (perfect) {
    // Ver nota no topo do ficheiro — item 7 do focus group (11/09/2026).
    return (
      <View style={styles.wrap}>
        <Animated.View
          style={{
            opacity: flyOpacity,
            transform: [{ translateX: flyTX }, { translateY: flyTY }, { scale: flyScale }],
          }}
        >
          <ExpoImage
            source={require('../../assets/images/perfect-toucan.webp')}
            style={{ width: PERFECT_IMAGE_SIZE, height: PERFECT_IMAGE_SIZE }}
            contentFit="contain"
            autoplay
          />
        </Animated.View>
      </View>
    );
  }

  const total = Math.max(0, max);
  const gapFrac = total > 0 ? Math.min(0.02, 0.12 / total) : 0;
  const segFrac = total > 0 ? 1 / total - gapFrac : 0;
  const arcLen = C * segFrac;

  const segments = [];
  let i = 0;
  if (day.therapy) {
    segments.push(
      <Circle
        key="therapy"
        cx={CX} cy={CY} r={R} fill="none"
        stroke={COLORS.c7} strokeWidth="16" strokeLinecap="round"
        strokeDasharray={`${arcLen} ${C - arcLen}`}
        strokeDashoffset={-(C * (i / total))}
      />
    );
  }
  i++;
  customFields.forEach((f) => {
    if (fieldOk(day, f)) {
      segments.push(
        <Circle
          key={f.id}
          cx={CX} cy={CY} r={R} fill="none"
          stroke={f.color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${arcLen} ${C - arcLen}`}
          strokeDashoffset={-(C * (i / total))}
        />
      );
    }
    i++;
  });

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke={COLORS.line} strokeWidth="16" />
        {segments}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.n}>{score}/{max}</Text>
        <Text style={styles.l}>hoje</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center', marginVertical: 12, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  n: { fontFamily: FONTS.display, fontSize: 38, color: COLORS.ink },
  l: { fontSize: 11, color: COLORS.inkSoft, fontWeight: '700', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 },
});
