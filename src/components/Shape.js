import React from 'react';
import Svg, { Circle, Polygon, Rect, Path } from 'react-native-svg';
import { COLORS } from '../theme';

// Renders one of the 10 palette icon shapes at a given size/color.
// Mirrors the CSS clip-path shapes from the web version, but as real
// SVG polygons since React Native has no clip-path support.
export default function Shape({ shape = 'circle', color = '#fff', size = 16 }) {
  const s = size;
  switch (shape) {
    case 'circle':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="11" fill={color} />
        </Svg>
      );
    case 'square':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="1" y="1" width="22" height="22" rx="4" fill={color} />
        </Svg>
      );
    case 'diamond':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon points="12,1 23,12 12,23 1,12" fill={color} />
        </Svg>
      );
    case 'triangle':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon points="12,1 23,22 1,22" fill={color} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon
            points="8,1 16,1 16,8 23,8 23,16 16,16 16,23 8,23 8,16 1,16 1,8 8,8"
            fill={color}
          />
        </Svg>
      );
    case 'star':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon
            points="12,1 14.6,8.4 23.5,8.4 16.3,13.4 19,21 12,16.3 5,21 7.7,13.4 0.5,8.4 9.4,8.4"
            fill={color}
          />
        </Svg>
      );
    case 'hexagon':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon points="6,1 18,1 23,12 18,23 6,23 1,12" fill={color} />
        </Svg>
      );
    case 'pentagon':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon points="12,1 23,9 19,23 5,23 1,9" fill={color} />
        </Svg>
      );
    case 'arrow':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Polygon points="0,5 13,5 13,0 23,12 13,24 13,19 0,19" fill={color} />
        </Svg>
      );
    case 'ring':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="5" />
        </Svg>
      );
    default:
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="11" fill={color} />
        </Svg>
      );
  }
}

// Ícone histórico do ProudOfMe (confetti) — mantido exportado por
// compatibilidade, mas já não usado em lado nenhum desde a
// especificação v2 (ver ProudOfMeIcon abaixo).
export function ConfettiIcon({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="2" width="4" height="4" rx="1" fill="#C1552B" transform="rotate(20 4 4)" />
      <Rect x="15" y="1" width="4" height="4" rx="1" fill="#0F847F" transform="rotate(-15 17 3)" />
      <Circle cx="20" cy="11" r="2" fill="#E3AC2E" />
      <Rect x="2" y="15" width="4" height="4" rx="1" fill="#0E8F58" transform="rotate(30 4 17)" />
      <Circle cx="12" cy="20" r="2" fill="#566331" />
      <Circle cx="11" cy="9" r="1.6" fill="#F3E8AE" />
    </Svg>
  );
}

// Ícone do ProudOfMe (especificação v2, secção 1.4, 12/09/2026): a
// cabeça do tucano composta por três formas geométricas planas — o
// meio-círculo é o crânio, o triângulo o bico, o círculo o olho. Lê-se
// como "montada de três peças" sem sair do vocabulário Bauhaus (nunca
// peças de puzzle — ver nota da especificação). Hierarquia com o
// Perfect! (a ave inteira, a voar, em perfect-toucan.webp): parte e
// todo, registo e execução.
// `active`: quando o botão à volta troca para um fundo claro (ProudOfMe
// marcado, ver HojeScreen/SemanaScreen), o crânio e o olho trocam de
// tom para manterem contraste em vez de desaparecerem num fundo claro
// sobre claro.
export function ProudOfMeIcon({ size = 18, active = false }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M 3 14 A 8 8 0 0 1 19 14 Z" fill={active ? COLORS.bg : COLORS.ink} />
      <Polygon points="13,9 23,13.5 13,18" fill={COLORS.c4} />
      <Circle cx="9" cy="10.5" r="1.9" fill={active ? COLORS.ink : COLORS.bg} />
    </Svg>
  );
}

// Selos discretos de tipo de campo (especificação v2, secção 1.1,
// 13/09/2026): mostrados no canto superior direito de cada campo na
// aba Hoje, para se distinguir de relance quem é "para cumprir"
// (âncora) de quem é "só para ver" (observação) — sem competir com a
// cor/forma do próprio campo, por isso ficam sempre pequenos e com
// opacidade reduzida. `color` por omissão é discreto de propósito.
export function AnchorGlyph({ size = 11, color = COLORS.inkSoft, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Circle cx="12" cy="5" r="2.3" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M12 7.5 V17" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M6 13 A6 6 0 0 0 18 13" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M4.5 13 H7.5 M16.5 13 H19.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function EyeGlyph({ size = 11, color = COLORS.inkSoft, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Path d="M2 12 C5 6 19 6 22 12 C19 18 5 18 2 12 Z" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="2.8" fill={color} />
    </Svg>
  );
}
