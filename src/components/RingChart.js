import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { fieldOk } from '../utils/fields';
import ToucanAvatar from './ToucanAvatar';
import Branch from './Branch';

const SIZE = 190;
const R = 82;
const CX = 100;
const CY = 100;
const C = 2 * Math.PI * R;

// The Perfect!+avatar "hero" composition (toucan + tropical-leaves photo,
// no visible ring) was designed and validated separately as a mockup at
// its own scale, then ported here by matching *ratios* to the ring's
// real rendered diameter rather than by eyeballing pixel sizes:
//   - the leaves photo behind the toucan was sized to 275/160 of the
//     ring's diameter in the mockup;
//   - the toucan itself was sized to 110% of the ring's diameter, so it
//     gently overflows where the ring used to be drawn.
// No ring stroke is drawn in this composition any more — the mockup's
// final, approved state removed it entirely — but its diameter is still
// the sizing reference these two are derived from.
const RING_DIAMETER = (SIZE * (2 * R)) / 200;
const AVATAR_BG_SIZE = RING_DIAMETER * (275 / 160);
const AVATAR_CHAR_SIZE = RING_DIAMETER * 1.1;

export default function RingChart({ day, customFields, score, max, perfect, avatar, perfectTrigger }) {
  // Entrance animation: the avatar flies in from off-screen (small,
  // faint, offset up and to the side) and swoops down onto the branch,
  // with a little spring bounce on arrival; once it has settled, it
  // winks (see ToucanAvatar's `blinkTrigger`). Starts already "arrived"
  // (opacity/scale = 1, no offset) so simply being on a Perfect! day
  // never replays the flourish — only an actual tap on Perfect! (a
  // fresh `perfectTrigger`) does.
  const flyScale = useRef(new Animated.Value(1)).current;
  const flyOpacity = useRef(new Animated.Value(1)).current;
  const flyTX = useRef(new Animated.Value(0)).current;
  const flyTY = useRef(new Animated.Value(0)).current;
  const [blinkTrigger, setBlinkTrigger] = useState(0);

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
    ]).start(() => setBlinkTrigger(Date.now()));
  }, [perfectTrigger]);

  if (perfect) {
    // A chosen avatar (Conta > Avatar) takes over the ring on a Perfect!
    // day instead of the default drawn smiley — flying in to land on a
    // branch, with a tropical-leaves photo behind it (sized off the
    // ring's own diameter, see AVATAR_BG_SIZE/AVATAR_CHAR_SIZE above) and
    // no ring stroke drawn on top. Elsewhere ToucanAvatar keeps its plain
    // "no background" look (e.g. the profile avatar picker).
    if (avatar) {
      return (
        <View style={styles.wrap}>
          <Image
            source={require('../../assets/images/toucan-leaves-bg.png')}
            style={{
              position: 'absolute',
              width: AVATAR_BG_SIZE,
              height: AVATAR_BG_SIZE,
            }}
            resizeMode="stretch"
          />
          <View style={styles.center} pointerEvents="none">
            <Animated.View
              style={{
                opacity: flyOpacity,
                transform: [{ translateX: flyTX }, { translateY: flyTY }, { scale: flyScale }],
              }}
            >
              <ToucanAvatar
                hat={avatar.hat} top={avatar.top} base={avatar.base} leg={avatar.leg}
                size={AVATAR_CHAR_SIZE} blinkTrigger={blinkTrigger}
              />
            </Animated.View>
            <View style={styles.branchWrap}>
              <Branch width={132} />
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.wrap}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200">
          <Circle cx={CX} cy={CY} r={R} fill={COLORS.c4} />
          <Circle cx="70" cy="80" r="10" fill={COLORS.bg} />
          <Circle cx="130" cy="80" r="10" fill={COLORS.bg} />
          <Path
            d="M58 112 Q100 158 142 112"
            stroke={COLORS.bg}
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.n}>PERFECT</Text>
        </View>
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
  branchWrap: { marginTop: -14 },
});
