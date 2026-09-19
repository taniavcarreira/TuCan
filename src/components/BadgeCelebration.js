import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import ToucanAvatar from './ToucanAvatar';
import BadgeIcon from './BadgeIcon';
import { COLORS, FONTS } from '../theme';

// Coreografia do badge — especificação v2, secção 5 (12/09/2026),
// ~1,4s + 2s de permanência antes de dissolver:
//   0,0–0,6s  tucano entra de fora do ecrã
//   0,6–1,0s  a medalha "solta-se" e desce — o toque percussivo cai aqui
//   1,0–1,4s  a medalha assenta com micro-overshoot; nome aparece
//   +2s       dissolve. Sem botão, sem modal.
//
// `badge` = { id, name } | null. `trigger` muda (timestamp) sempre que
// há um novo badge a celebrar — o mesmo padrão do Confetti.js.
// `muted` = true quando coincide com um Perfect! nesse mesmo dia (só
// toca o som do Perfect!, a medalha aparece em silêncio — secção 2).
const TOC_SOUND = require('../../assets/sounds/badge-toc.wav');

export default function BadgeCelebration({ badge, trigger, muted }) {
  const player = useAudioPlayer(TOC_SOUND);
  const [visible, setVisible] = useState(false);
  const [shownBadge, setShownBadge] = useState(null);

  const birdOpacity = useRef(new Animated.Value(0)).current;
  const birdTX = useRef(new Animated.Value(70)).current;
  const birdTY = useRef(new Animated.Value(-36)).current;
  const medalScale = useRef(new Animated.Value(0)).current;
  const medalOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const dissolve = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!trigger || !badge) return;
    setShownBadge(badge);
    setVisible(true);

    birdOpacity.setValue(0); birdTX.setValue(70); birdTY.setValue(-36);
    medalScale.setValue(0); medalOpacity.setValue(0);
    nameOpacity.setValue(0); dissolve.setValue(1);

    if (!muted) {
      try { player.seekTo(0); player.play(); } catch (e) { /* som é um extra, nunca bloqueia a celebração */ }
    }

    Animated.sequence([
      // 0 – 0.6s: tucano entra de fora do ecrã
      Animated.parallel([
        Animated.timing(birdOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(birdTX, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(birdTY, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      // 0.6 – 1.0s: a medalha solta-se e desce (o som já tocou ao entrar aqui)
      Animated.parallel([
        Animated.timing(medalOpacity, { toValue: 1, duration: 220, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(medalScale, { toValue: 1.12, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      // 1.0 – 1.4s: micro-overshoot da medalha + nome aparece
      Animated.parallel([
        Animated.spring(medalScale, { toValue: 1, friction: 4.2, tension: 120, useNativeDriver: true }),
        Animated.timing(nameOpacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();

    const dismissAt = 1400 + 2000;
    const timer = setTimeout(() => {
      Animated.timing(dissolve, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true })
        .start(() => setVisible(false));
    }, dismissAt);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!visible || !shownBadge) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.card, { opacity: dissolve }]}>
        <Animated.View
          style={{
            opacity: birdOpacity,
            transform: [{ translateX: birdTX }, { translateY: birdTY }],
          }}
        >
          <ToucanAvatar size={54} />
        </Animated.View>
        <Animated.View style={{ opacity: medalOpacity, transform: [{ scale: medalScale }], marginTop: -6 }}>
          <BadgeIcon badgeId={shownBadge.id} size={56} />
        </Animated.View>
        <Animated.Text style={[styles.name, { opacity: nameOpacity }]}>{shownBadge.name}</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 78, left: 0, right: 0, alignItems: 'center' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 2, borderColor: COLORS.line,
    paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center', gap: 2,
  },
  name: { fontFamily: FONTS.bodyBold, fontSize: 12.5, color: COLORS.ink, marginTop: 2 },
});
