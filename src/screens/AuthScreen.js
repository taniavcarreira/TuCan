import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { supabase } from '../supabaseClient';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

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

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Vas-Y!</Text>
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
});
