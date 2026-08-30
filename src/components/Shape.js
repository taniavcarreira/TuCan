import React from 'react';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';

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

// The special multi-color confetti icon used for ProudOfMe.
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
