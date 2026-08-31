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
import OnboardingScreen from './src/screens/OnboardingScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import HojeScreen from './src/screens/HojeScreen';
import SemanaScreen from './src/screens/SemanaScreen';
import TreinoScreen from './src/screens/TreinoScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNav from './src/components/BottomNav';
import Confetti from './src/components/Confetti';
import InAppBrowserBanner from './src/components/InAppBrowserBanner';
import BrandMarkIcon from './src/components/BrandMarkIcon';

function GearIcon({ color }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

// Web-only: true when the current URL looks like the page just landed
// back from an OAuth redirect (Google, via Supabase) — an access/refresh
// token, a provider token, or an error, appended to the hash or query
// string. A full-page redirect like this reloads the whole app from
// scratch, which remounts `LoggedOutFlow` below; without this check its
// local state would always reset to "show onboarding first", so anyone
// finishing the Google login would be bounced straight back into the
// 5-slide tutorial instead of into the app — an endless loop, since
// pressing "Continuar com o Google" again just repeats the same
// redirect. Detecting the callback lets us skip onboarding and render
// AuthScreen directly, so it can pick up the returning session (or show
// the actual error, via its own useEffect) instead of hiding it.
function isOAuthCallback() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const raw = (window.location.hash || '') + (window.location.search || '');
  return /access_token=|refresh_token=|provider_token=|error=|error_description=/i.test(raw);
}

// Web-only: true when the URL is specifically a "reset password" email
// link (Supabase tags these `type=recovery`, distinct from a normal
// OAuth callback above). Checked separately, and takes priority over
// everything else in App() below — clicking that link both logs the
// person in (via the same token-in-URL mechanism as Google) *and* means
// they still need to actually set a new password, so neither
// LoggedOutFlow nor Root is the right screen to land on yet.
function isPasswordRecoveryUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const raw = (window.location.hash || '') + (window.location.search || '');
  return /type=recovery/i.test(raw);
}

function cleanAuthUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.history.replaceState(null, '', window.location.pathname + window.location.search.split('#')[0]);
}

// Shown whenever there's no active session: the onboarding tutorial
// first, then AuthScreen (unless `isOAuthCallback()` says we should skip
// straight to AuthScreen, see above). Otherwise, plain local state (not
// persisted) is intentional — a fresh instance of this component mounts
// every time `session` drops to null (including after "Terminar
// sessão"), so the tutorial reappears every time someone lands on the
// login screen from scratch.
function LoggedOutFlow() {
  const [showAuth, setShowAuth] = useState(() => isOAuthCallback());
  if (!showAuth) {
    return <OnboardingScreen onDone={() => setShowAuth(true)} />;
  }
  return <AuthScreen />;
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
          <Text style={styles.title}>TuCAN!</Text>
        </View>
        <View style={styles.right}>
          <TouchableOpacity style={styles.gearBtn} onPress={() => setProfileOpen(true)}>
            <BrandMarkIcon size={17} bg={COLORS.card} />
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
  const [passwordRecovery, setPasswordRecovery] = useState(() => isPasswordRecoveryUrl());

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

  // Web-only: assim que uma sessão fica confirmada (mesmo logo a seguir
  // a um regresso de OAuth/recuperação de password), limpa qualquer
  // access_token/refresh_token/type=recovery que tenha ficado na URL.
  // O próprio Supabase já lê esses tokens sozinho ao carregar a página,
  // mas se não limpar por completo o "#" da barra de endereço, um
  // próximo signInWithOAuth() que reutilize essa URL como redirectTo
  // herda esse resto — e o regresso do Google acrescenta-lhe um segundo
  // "#access_token=...", dando uma URL "##..." que o Supabase já não
  // consegue interpretar. Isto já causou um bug real: login com Google,
  // logout, login com Google outra vez → ficava impossível entrar.
  useEffect(() => {
    if (session) cleanAuthUrl();
  }, [session]);

  let content;
  if (!fontsLoaded || session === undefined) {
    content = (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.electro} size="large" />
      </View>
    );
  } else if (passwordRecovery) {
    // Clicking the emailed recovery link already logged the person in
    // (see isPasswordRecoveryUrl above) — `hasSession` is just a safety
    // net for an expired/reused link, where that never happened.
    content = (
      <ResetPasswordScreen
        hasSession={!!session}
        onDone={() => { setPasswordRecovery(false); cleanAuthUrl(); }}
        onRequestNewLink={() => { setPasswordRecovery(false); cleanAuthUrl(); }}
      />
    );
  } else if (!session) {
    content = <LoggedOutFlow />;
  } else {
    content = (
      <DataProvider user={session.user}>
        <Root />
      </DataProvider>
    );
  }

  return (
    <View style={styles.appOuter}>
      {/* Shown above absolutely everything, on every screen, whenever the
          page is running inside WhatsApp/Instagram/etc.'s embedded
          browser — Google refuses OAuth there, and some of these also
          break plain email/password login (see InAppBrowserBanner.js). */}
      <InAppBrowserBanner />
      <WebFrame>{content}</WebFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  appOuter: { flex: 1, backgroundColor: COLORS.bg },
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
