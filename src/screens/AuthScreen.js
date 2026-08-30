import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { supabase } from '../supabaseClient';
import { signInWithGoogle } from '../utils/googleAuth';

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <Path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
      <Path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <Path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
    </Svg>
  );
}

export default function AuthScreen() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Depois de voltar do login com Google (web), o Supabase devolve o
  // resultado embutido no final da própria URL (depois do #). Se algo
  // correu mal do lado dele (ex.: URL de retorno não autorizada), o
  // erro fica silencioso — este efeito apanha-o e mostra-o no ecrã, em
  // vez de simplesmente voltarmos ao formulário sem explicação.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const raw = window.location.hash || window.location.search || '';
    if (!raw || raw.length < 2) return;
    const parsed = new URLSearchParams(raw.slice(1));
    const desc = parsed.get('error_description') || parsed.get('error');
    if (desc) {
      setError(decodeURIComponent(desc.replace(/\+/g, ' ')));
      // Limpa a URL para não repetir o erro num refresh futuro.
      window.history.replaceState(null, '', window.location.pathname + window.location.search.split('#')[0]);
    }
  }, []);

  async function submit() {
    setError(''); setInfo('');
    if (!email.trim() || !password) {
      setError('Preenche o email e a password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) setError(err.message);
      } else {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) setError(err.message);
        else setInfo('Conta criada. Consoante as definições do teu projeto Supabase, pode ser preciso confirmar por email antes de entrares.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitGoogle() {
    setError(''); setInfo('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err?.message || 'Não foi possível continuar com o Google.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>TuCAN!</Text>
      <Text style={styles.subtitle}>
        {mode === 'signin' ? 'Entra na tua conta' : 'Cria a tua conta'}
      </Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        placeholderTextColor={COLORS.inkSoft}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor={COLORS.inkSoft}
        secureTextEntry
      />

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!info && <Text style={styles.info}>{info}</Text>}

      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.submitBtnText}>{mode === 'signin' ? 'Entrar' : 'Criar conta'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo(''); }}>
        <Text style={styles.switchText}>
          {mode === 'signin' ? 'Ainda não tens conta? Criar uma' : 'Já tens conta? Entrar'}
        </Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity style={styles.googleBtn} onPress={submitGoogle} disabled={googleLoading}>
        {googleLoading ? <ActivityIndicator color={COLORS.ink} /> : (
          <View style={styles.googleBtnContent}>
            <GoogleIcon />
            <Text style={styles.googleBtnText}>Continuar com o Google</Text>
          </View>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  title: { fontFamily: FONTS.display, fontSize: 32, color: COLORS.ink, textAlign: 'center', marginBottom: 4 },
  subtitle: { color: COLORS.inkSoft, textAlign: 'center', marginBottom: 28, fontFamily: FONTS.bodyRegular, fontSize: 13 },
  label: { fontSize: 11, color: COLORS.inkSoft, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { padding: 13, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.card, color: COLORS.ink, fontFamily: FONTS.bodyRegular, fontSize: 15 },
  error: { color: COLORS.c9, fontSize: 12.5, marginTop: 12, textAlign: 'center' },
  info: { color: COLORS.electro, fontSize: 12.5, marginTop: 12, textAlign: 'center', lineHeight: 18 },
  submitBtn: { marginTop: 22, padding: 15, borderRadius: 8, backgroundColor: COLORS.sporting, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 15 },
  switchText: { color: COLORS.electro, textAlign: 'center', marginTop: 18, fontFamily: FONTS.bodyBold, fontSize: 12.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 26, marginBottom: 4, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.line },
  dividerText: { color: COLORS.inkSoft, fontSize: 11, fontFamily: FONTS.bodyRegular, textTransform: 'uppercase' },
  googleBtn: { marginTop: 14, padding: 13, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.card, alignItems: 'center' },
  googleBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleBtnText: { color: COLORS.ink, fontFamily: FONTS.bodyBold, fontSize: 14 },
});
