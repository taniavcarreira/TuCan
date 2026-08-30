import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';
import { COLORS } from '../theme';

// A toucan mascot in a flat, geometric "poster illustration" style (big
// continuous black silhouette, blocky two-tone beak, banded tail
// feathers) instead of the earlier photorealistic/cartoon takes — this
// is the shape and palette language the rest of the app already speaks.
// No background shape is ever drawn — avatars sit directly on whatever
// card/button hosts them (topbar icon, profile grid), except the
// "Perfect!" hero moment where RingChart.js layers a leaves photo behind
// this same component.
//
// The head/beak/eye geometry below was traced pixel-by-pixel from a
// reference photo (see the design notes in the project docs) so the
// beak curve, the asymmetric white eye-patch and the gold iris —
// partly occluded by the beak, as in the reference — match exactly.
// Everything lives in native coordinates on a 227x310 canvas.
//
// Personalisation is deliberately kept to two easy, independent knobs
// so every combination always looks clean:
//   - `hat`: a small accessory drawn last, on top of everything, near
//     the crown — swapping it never touches the body/beak paths.
//   - `top` / `base` / `leg`: recolors the beak (two blocks) — the tail
//     bands reuse `base` so the palette reads as one coordinated bird —
//     and the legs.
// See src/utils/avatars.js for the 8 preset combinations.
const INK = '#14171A'; // plumage — a soft black, not pure #000
const CREAM = COLORS.ink;

// Native canvas the geometry below was authored on.
const NATIVE_W = 227;
const NATIVE_H = 310;
// Eye centre / radius, reused for the eyelid so the wink covers the same
// gold-iris area the reference photo shows.
const EYE_CX = 147.7;
const EYE_CY = 90.6;
const EYE_R = 24.4;
// The hat symbols below were drawn for the old, smaller head. Each one
// has its own natural bounding box, so each gets its own re-anchoring
// transform (translate differs per style, scale is the same 1.4 for
// all) — tuned so that style's own bottom-centre point lands on the
// same spot on the crown of the new, larger head, instead of reusing
// one transform (calibrated on the tophat) for every style.
const HAT_TRANSFORMS = {
  tophat: 'translate(82.2,31.4) scale(1.4)',
  cap: 'translate(76.6,30.0) scale(1.4)',
  bow: 'translate(79.4,32.8) scale(1.4)',
  flower: 'translate(77.3,32.0) scale(1.4)',
  crown: 'translate(79.4,31.4) scale(1.4)',
  headphones: 'translate(76.6,27.2) scale(1.4)',
  bandana: 'translate(75.2,30.0) scale(1.4)',
};

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

function Hat({ style, color, accent }) {
  switch (style) {
    case 'tophat':
      return (
        <>
          <Path d="M44 17 C44 14 50 12 58 12 C66 12 72 14 72 17 L72 19 L44 19 Z" fill={color} />
          <Rect x="48" y="-4" width="20" height="21" rx="2" fill={color} />
          <Rect x="48" y="10" width="20" height="4" fill={accent} />
        </>
      );
    case 'cap':
      return (
        <>
          <Path d="M42 19 C42 5 52 -3 64 -3 C76 -3 82 5 82 17 L82 20 L42 20 Z" fill={color} />
          <Path d="M42 18 C34 17 26 18 20 22 C26 24 36 24 43 22 Z" fill={accent} />
        </>
      );
    case 'bow':
      return (
        <>
          <Path d="M48 4 L60 11 L48 18 Z" fill={color} />
          <Path d="M72 4 L60 11 L72 18 Z" fill={color} />
          <Circle cx="60" cy="11" r="3.4" fill={accent} />
        </>
      );
    case 'flower':
      return (
        <>
          <Circle cx="52" cy="6" r="4.6" fill={color} />
          <Circle cx="62" cy="2" r="4.6" fill={color} />
          <Circle cx="71" cy="6" r="4.6" fill={color} />
          <Circle cx="68" cy="14" r="4.6" fill={color} />
          <Circle cx="56" cy="14" r="4.6" fill={color} />
          <Circle cx="62" cy="8" r="4" fill={accent} />
        </>
      );
    case 'crown':
      return (
        <>
          <Rect x="46" y="12" width="28" height="7" rx="1.5" fill={color} />
          <Path d="M46 12 L52 -2 L60 8 L68 -2 L74 12 Z" fill={color} />
          <Circle cx="52" cy="1" r="2" fill={accent} />
          <Circle cx="60" cy="6" r="2" fill={accent} />
          <Circle cx="68" cy="1" r="2" fill={accent} />
        </>
      );
    case 'headphones':
      return (
        <>
          <Path d="M38 22 C38 2 86 2 86 22" stroke={color} strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <Circle cx="85" cy="27" r="7.5" fill={color} />
          <Circle cx="85" cy="27" r="4" fill={accent} />
        </>
      );
    case 'bandana':
      return (
        <>
          <Path d="M38 15 C38 4 88 4 88 15 L88 20 L38 20 Z" fill={color} />
          <Path d="M84 17 L96 25 L85 27 Z" fill={accent} />
        </>
      );
    default:
      return null;
  }
}

export default function ToucanAvatar({
  hat = 'none',
  top = COLORS.c4,
  base = COLORS.c9,
  leg = COLORS.c5,
  size = 48,
  blinkTrigger,
}) {
  // A quick "wink": an eyelid (same colour as the plumage) sweeps down
  // over the eye and back up. Idle (no blinkTrigger yet) it stays fully
  // open — ry 0 — so mounting the component never plays it unprompted.
  const eyelidRy = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!blinkTrigger) return;
    Animated.sequence([
      Animated.timing(eyelidRy, { toValue: EYE_R, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(eyelidRy, { toValue: EYE_R, duration: 90, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(eyelidRy, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]).start();
  }, [blinkTrigger]);

  return (
    <Svg width={size} height={size * (NATIVE_H / NATIVE_W)} viewBox={`0 0 ${NATIVE_W} ${NATIVE_H}`}>
      {/* body + head, one continuous silhouette */}
      <Path
        d="M146 59 C177 59 202 67 215 93 C222 110 219 135 212 155 C205 174 190 192 170 200 C150 207 122 208 103 203 C88 202 86 191 87 174 L89 146 C91 138 97 133 108 130 L140 130 C135 120 132 105 135 90 C137 78 142 66 146 59 Z"
        fill={INK}
      />

      {/* tail feathers — drawn in front of the body, with a `base`-coloured band */}
      <G transform="translate(12,-26)">
        <Path d="M73 203 C68 222 56 255 48 283 C45 293 46 297 51 300 C56 297 59 290 62 262 C65 235 71 212 75 203 Z" fill={INK} />
        <Path d="M73 203 C70 213 64 225 58 236 L71 236 C74 224 75 212 75 203 Z" fill={base} />
        <Path d="M77 203 C74 225 70 255 68 283 C67 295 71 303 79 305 C87 303 88 295 87 283 C86 255 84 225 80 203 Z" fill={INK} />
        <Path d="M77 203 C75 215 74 227 73 238 L86 238 C85 227 83 215 80 203 Z" fill={base} />
        <Path d="M83 203 C85 225 90 255 97 280 C101 292 104 297 107 298 C109 294 113 283 116 265 C119 245 108 220 87 203 Z" fill={INK} />
        <Path d="M83 203 C85 213 87 224 89 236 L100 236 C99 224 95 212 87 203 Z" fill={base} />
      </G>

      {/* eye — large white patch, gold iris (partly hidden behind the beak below), pupil, highlight */}
      <Path
        d="M146,64.8 L151.3,65.2 L163.4,68.1 L167.7,70.6 L172.6,73.5 L175.0,76.4 L178.4,79.3 L180.3,82.2 L182.3,85.1 L183.7,88.0 L185.2,90.9 L186.1,93.8 L186.1,96.7 L187.1,99.6 L187.1,102.5 L187.1,105.4 L187.1,108.3 L187.1,111.2 L186.1,114.1 L185.6,116.9 L184.6,119.8 L183.2,122.7 L181.7,125.6 L179.3,128.5 L176.9,131.4 L175.0,134.3 L170.7,137.2 L166.8,140.1 L160.1,143.0 L156.3,143.9 L155.8,144.4 L152.3,144.7 L146,144.7 Z"
        fill={CREAM}
      />
      <Circle cx={EYE_CX} cy={EYE_CY} r={EYE_R} fill="#D3921A" />
      <Circle cx="157.8" cy="86.5" r="6.4" fill={INK} />
      <Path d="M153.5,84 C155.5,81.5 160,81.5 162,84" stroke="#40848E" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      {/* eyelid — animates shut/open for the wink, over the iris/pupil */}
      <AnimatedEllipse cx={EYE_CX} cy={EYE_CY} rx={EYE_R} ry={eyelidRy} fill={INK} />

      {/* beak — a dark base wedge, then the two coloured blocks, occluding the left of the eye */}
      <Path d="M28.6,74.4 L27.1,74.4 L25.2,76.4 L23.3,78.3 L21.3,80.2 L19.4,82.2 L17.5,84.1 L16,86 L14.6,88 L13.1,89.9 L12.2,91.8 L10.7,93.8 L9.7,95.7 L8.8,97.6 L7.8,99.6 L6.4,101.5 L5.9,103.4 L5.4,105.4 L4.4,107.3 L3.9,109.2 L3,111.2 L3,113.1 L2,115 L2,117 L2,118.9 L1.5,120.8 L1,122.7 L1,130 L28.6,130 Z" fill={INK} />
      <Path d="M146,58 L63,58 L58.5,59 L50.8,60.9 L45,62.8 L41.1,64.8 L37.3,66.7 L33.9,68.6 L31,70.6 L28.6,72.5 L28.6,95.2 L146,95.2 Z" fill={top} />
      <Path d="M28.6,95.2 L146,95.2 L146,130 L28.6,130 Z" fill={base} />

      {/* legs */}
      <Path d="M132 201 L132 227 L141 227" stroke={leg} strokeWidth={3.4} fill="none" strokeLinecap="square" />
      <Path d="M147 201 L147 227 L156 227" stroke={leg} strokeWidth={3.4} fill="none" strokeLinecap="square" />

      {/* hat — drawn last, repositioned onto the crown of the new head */}
      {hat && hat !== 'none' ? (
        <G transform={HAT_TRANSFORMS[hat]}>
          <Hat style={hat} color={top} accent={base} />
        </G>
      ) : null}
    </Svg>
  );
}
