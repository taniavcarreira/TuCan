import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

// A thin line that stays almost invisible at rest and only lights up —
// briefly, like a synapse firing — when `trigger` changes (fired once
// per field tap in HojeScreen, not a continuous loop).
export default function ElectricLine({ width = 200, trigger }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [trigger]);

  const segmentWidth = width * 0.16;
  const translateX = anim.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [-segmentWidth, width * 0.55, width],
  });
  // Multiple quick stops on the same 0→1 sweep read as a flicker —
  // a fast electric current, not a smooth fade.
  const opacity = anim.interpolate({
    inputRange: [0, 0.06, 0.18, 0.3, 0.42, 0.68, 1],
    outputRange: [0, 1, 0.25, 0.9, 0.15, 0.5, 0],
  });

  return (
    <View style={[styles.track, { width }]}>
      <Animated.View
        style={[styles.bolt, { width: segmentWidth, opacity, transform: [{ translateX }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 1,
    backgroundColor: 'rgba(41,211,255,0.06)',
    overflow: 'hidden',
    borderRadius: 1,
  },
  bolt: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.electro,
    borderRadius: 1,
    shadowColor: COLORS.electro,
    shadowOpacity: 0.6,
    shadowRadius: 2.5,
    shadowOffset: { width: 0, height: 0 },
  },
});
