import React from 'react';
import Svg, { Path, Ellipse } from 'react-native-svg';

// A little wooden branch with a couple of leaves — the perch the
// toucan avatar lands on in the "Perfect!" moment (RingChart.js). Kept
// as its own small component since it's purely decorative and never
// appears anywhere the avatar itself is used (topbar, profile grid).
export default function Branch({ width = 140 }) {
  const height = width * 0.22;
  return (
    <Svg width={width} height={height} viewBox="0 0 140 30">
      <Path
        d="M2 18 C30 10, 90 10, 138 16 L138 24 C90 19, 30 19, 2 26 Z"
        fill="#7A5230"
      />
      <Path
        d="M2 18 C30 10, 90 10, 138 16"
        stroke="#5C3D22"
        strokeWidth={1.5}
        fill="none"
        opacity={0.5}
      />
      <Ellipse cx="18" cy="10" rx="9" ry="4.5" fill="#16702F" transform="rotate(-25 18 10)" />
      <Ellipse cx="10" cy="15" rx="7" ry="3.5" fill="#0E8F58" transform="rotate(-15 10 15)" />
    </Svg>
  );
}
