import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Path } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { BADGE_DEFS, PHASES } from '../utils/badges';

// Medalhas Bauhaus (especificação v2, secção 6, 12/09/2026): círculo de
// 88px, fundo ink, composição geométrica ao centro em cor lisa (zero
// gradientes, zero brilho). Cada badge combina 1-2 formas do
// vocabulário círculo/quadrado/triângulo/meio-círculo/arco — nunca uma
// ilustração à parte.
//
// Os quatro badges de "acumulação longa" (#2, #8, #11, #12) partilham o
// triângulo-a-subir explícito da especificação; a contagem de
// triângulos empilhados (1 → 2 → 3) e a chegada a um círculo completo no
// #12 fazem a progressão ler-se visualmente sem precisar de 4 ilustrações
// distintas.

function phaseColor(phaseKey) {
  const colorKey = PHASES[phaseKey]?.color || 'mostarda';
  return COLORS[colorKey];
}

function Shape({ shape, color }) {
  switch (shape) {
    case 'dot':
      // #1 Primeira batida — uma só marca.
      return <Circle cx="44" cy="44" r="10" fill={color} />;
    case 'tri1':
      // #2 Três asas — um triângulo a subir.
      return <Path d="M44 26 L60 58 L28 58 Z" fill={color} />;
    case 'tri2':
      // #8 Bando — dois triângulos empilhados.
      return (
        <>
          <Path d="M44 22 L56 44 L32 44 Z" fill={color} />
          <Path d="M44 40 L60 66 L28 66 Z" fill={color} />
        </>
      );
    case 'tri3':
      // #11 Fila indiana — três triângulos empilhados.
      return (
        <>
          <Path d="M44 18 L53 34 L35 34 Z" fill={color} />
          <Path d="M44 32 L55 51 L33 51 Z" fill={color} />
          <Path d="M44 48 L60 66 L28 66 Z" fill={color} />
        </>
      );
    case 'triCircle':
      // #12 Altaneira — o triângulo chega ao círculo completo.
      return (
        <>
          <Circle cx="44" cy="50" r="14" fill="none" stroke={color} strokeWidth="3" />
          <Path d="M44 20 L54 42 L34 42 Z" fill={color} />
        </>
      );
    case 'square':
      // #3 Planeio — quadrado sólido: "isto conta mesmo".
      return <Rect x="30" y="30" width="28" height="28" fill={color} />;
    case 'arc':
      // #4 De volta ao oco.
      return <Path d="M26 40 A18 18 0 0 0 62 40" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />;
    case 'half':
      // #5 Primeira fruta.
      return <Path d="M24 46 A20 20 0 0 1 64 46 Z" fill={color} />;
    case 'halfRot':
      // #9 Bico ao vento — o mesmo meio-círculo, rodado 90°.
      return <Path d="M42 24 A20 20 0 0 1 42 64 Z" fill={color} />;
    case 'circleSquare':
      // #6 Sete dias de presença — marco redondo com um núcleo firme.
      return (
        <>
          <Circle cx="44" cy="44" r="17" fill="none" stroke={color} strokeWidth="4" />
          <Rect x="37" y="37" width="14" height="14" fill={color} />
        </>
      );
    case 'hop':
      // #7 Salto — um pequeno salto, contorno apenas (esforço mínimo).
      return <Path d="M44 24 L54 44 L34 44 Z" stroke={color} strokeWidth="3" fill="none" strokeLinejoin="round" />;
    case 'bareHead':
      // #10 Orgulho nu — a cabeça do ProudOfMe (meio-círculo + olho)
      // sem o bico: "nu" porque falta a peça que assinala cumprir.
      return (
        <>
          <Path d="M26 46 A18 18 0 0 1 62 46" fill={color} />
          <Circle cx="44" cy="52" r="4" fill={COLORS.ink} />
        </>
      );
    default:
      return <Circle cx="44" cy="44" r="10" fill={color} />;
  }
}

export default function BadgeIcon({ badgeId, size = 88, count, dimmed = false }) {
  const def = BADGE_DEFS[badgeId];
  if (!def) return null;
  const color = phaseColor(def.phase);

  return (
    <View style={{ width: size, height: size, opacity: dimmed ? 0.45 : 1 }}>
      <Svg width={size} height={size} viewBox="0 0 88 88">
        <Circle cx="44" cy="44" r="44" fill={COLORS.ink} />
        <Shape shape={def.shape} color={color} />
      </Svg>
      {count > 1 && (
        <View style={styles.countChip}>
          <Text style={styles.countChipText}>×{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  countChip: {
    position: 'absolute', right: -4, bottom: -4,
    backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 2, borderColor: COLORS.line,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  countChipText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.ink },
});
