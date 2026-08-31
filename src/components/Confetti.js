import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, View, StyleSheet, Easing } from 'react-native';
import { useAudioPlayer } from 'expo-audio';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COLORS = ['#C1552B', '#566331', '#E3AC2E', '#0F847F', '#29D3FF', '#F3E8AE'];
const PIECES = 30;
// Coro sintetizado de pássaros exóticos (não é uma gravação real — ver
// scripts/make_exotic_birds_call.py) que toca no momento Perfect!,
// substituindo o antigo "pop" de confetis.
const PERFECT_SOUND = require('../../assets/sounds/perfect-exotic-birds.wav');

// Call `trigger` (a number that changes, e.g. a timestamp) to fire a new
// confetti burst + celebration sound. Rendered at the very top of the
// app (see App.js) so it always falls in front of everything — topbar,
// tabs, bottom nav — rather than being clipped to whichever screen
// fired it.
export default function Confetti({ trigger }) {
  const player = useAudioPlayer(PERFECT_SOUND);
  const anims = useRef(
    Array.from({ length: PIECES }, () => new Animated.Value(0))
  ).current;
  const pieces = useRef(
    Array.from({ length: PIECES }, () => ({
      left: Math.random() * SCREEN_W,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      duration: 1600 + Math.random() * 1200,
      rotate: Math.floor(Math.random() * 360),
    }))
  ).current;

  useEffect(() => {
    if (!trigger) return;
    anims.forEach((v, i) => {
      v.setValue(0);
      Animated.timing(v, {
        toValue: 1,
        duration: pieces[i].duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    });
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      // Sound is a nice-to-have — never let a playback hiccup break the
      // celebratory animation itself.
      console.warn('confetti sound', e);
    }
  }, [trigger]);

  if (!trigger) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {anims.map((v, i) => {
        const p = pieces[i];
        const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-20, SCREEN_H + 20] });
        const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });
        const opacity = v.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', left: p.left, width: 8, height: 14,
              backgroundColor: p.color, opacity,
              transform: [{ translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
