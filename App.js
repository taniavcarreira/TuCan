import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import Svg, { Path, Circle } from 'react-native-svg';
import { useFonts, Archivo_400Regular, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { IBMPlexMono_400Regular, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';

import { COLORS, FONTS } from './src/theme';
import { supabase } from './src/supabaseClient';
import { DataProvider, useData } from './src/context/DataContext';
import AuthScreen from './src/screens/AuthScreen';
import HojeScreen from './src/screens/HojeScreen';
import SemanaScreen from './src/screens/SemanaScreen';
import TreinoScreen from './src/screens/TreinoScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNav from './src/components/BottomNav';
import Confetti from './src/components/Confetti';
import ToucanAvatar from './src/components/ToucanAvatar';
import { DEFAULT_AVATAR } from './src/utils/avatars';

function GearIcon({ color }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}
function MotionIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 32 32" fill="none">
      <Path d="M4 22 L14 22 L14 8 L26 8" stroke={COLORS.c1} strokeWidth={3.4} strokeLinecap="square" />
      <Path d="M20 3 L27 8 L20 13" stroke={COLORS.agua} strokeWidth={3.4} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
    </Svg>
  );
}
function PersonIcon({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </Svg>
  );
}

// On native (iOS/Android) this is a no-op passthrough — `webOuter`/
// `webFrame` are plain `{ flex: 1 }` there. On web, it centers the app
// in a phone-width column instead of letting it stretch full-bleed
// across a desktop browser window; on a narrow (mobile) browser the
// column is just as wide as the viewport, so nothing changes visually.
function WebFrame({ children }) {
  return (
    <View style={styles.webOuter}>
      <View style={styles.webFrame}>{children}</View>
    </View>
  );
}

function Root() {
  const [tab, setTab] = useState('hoje');
  const [configOpen, setConfigOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const { ready, profile } = useData();
  const celebrate = () => setConfettiTrigger(Date.now());

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.electro} size="large" />
      </View>
    );
  }

  if (profileOpen) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <ProfileScreen onClose={() => setProfileOpen(false)} />
      </SafeAreaView>
    );
  }

  if (configOpen) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <ConfigScreen onClose={() => setConfigOpen(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.topbar}>
        <View style={styles.brand}>
          <MotionIcon />
          <Text style={styles.title}>TuCAN!</Text>
        </View>
        <View style={styles.right}>
          <TouchableOpacity style={styles.gearBtn} onPress={() => setProfileOpen(true)}>
            <ToucanAvatar hat={DEFAULT_AVATAR.hat} top={DEFAULT_AVATAR.top} base={DEFAULT_AVATAR.base} leg={DEFAULT_AVATAR.leg} size={16} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gearBtn} onPress={() => setConfigOpen(true)}>
            <GearIcon color={COLORS.inkSoft} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gearBtn} onPress={() => supabase.auth.signOut()}>
            <Text style={{ color: COLORS.inkSoft, fontSize: 11 }}>⎋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'hoje' && <HojeScreen onCelebrate={celebrate} />}
        {tab === 'semana' && <SemanaScreen />}
        {tab === 'treino' && <TreinoScreen />}
      </View>

      <BottomNav active={tab} onChange={setTab} />

      {/* Rendered above everything (topbar, tabs, bottom nav) so a
          celebration always falls across the whole screen. */}
      <View pointerEvents="none" style={styles.confettiLayer}>
        <Confetti trigger={confettiTrigger} />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold,
    ArchivoBlack_400Regular,
    IBMPlexMono_400Regular, IBMPlexMono_600SemiBold,
  });

  const [session, setSession] = useState(undefined); // undefined = still checking, null = logged out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    // So the confetti "pop" is still heard even with the phone's silent
    // switch on — it's a deliberate, user-triggered celebration sound.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!fontsLoaded || session === undefined) {
    return (
      <WebFrame>
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.electro} size="large" />
        </View>
      </WebFrame>
    );
  }

  if (!session) {
    return (
      <WebFrame>
        <AuthScreen />
      </WebFrame>
    );
  }

  return (
    <WebFrame>
      <DataProvider user={session.user}>
        <Root />
      </DataProvider>
    </WebFrame>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.ink },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gearBtn: { width: 32, height: 32, borderRadius: 9, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  confettiLayer: { ...StyleSheet.absoluteFillObject, elevation: 50, zIndex: 50 },
  webOuter: Platform.OS === 'web' ? { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center' } : { flex: 1 },
  webFrame: Platform.OS === 'web' ? { flex: 1, width: '100%', maxWidth: 480 } : { flex: 1 },
});
