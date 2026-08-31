import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { supabase } from '../supabaseClient';

// Reached only by clicking the link in the "recuperar password" email
// (see AuthScreen.js's 'recover' mode) — App.js detects `type=recovery`
// in the URL and renders this instead of the normal login/onboarding
// flow, regardless of session state (see isPasswordRecoveryUrl there).
//
// Clicking that link is itself what logs the person in (Supabase's
// implicit flow parses the recovery tokens the same way it parses a
// normal OAuth callback) — `hasSession` reflects whether that succeeded.
// If it did, `supabase.auth.updateUser` below uses that same session to
// set the new password; no separate "log in first" step needed.
export default function ResetPasswordScreen({ hasSession, onDone, onRequestNewLink }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    setError('');
    if (!password || password.length < 6) {
      setError('A password precisa de pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As passwords não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Não foi possível atualizar a password. Tenta de novo.');
    } finally {
      setLoading(false);
    }
  }

  if (!hasSession) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Link inválido ou expirado</Text>
        <Text style={styles.subtitle}>Este link de recuperação já não é válido — pede um novo na página de login.</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={onRequestNewLink}>
          <Text style={styles.submitBtnText}>Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Password atualizada!</Text>
        <Text style={styles.subtitle}>A tua nova password já está ativa.</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={onDone}>
          <Text style={styles.submitBtnText}>Continuar para a TuCAN!</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Nova password</Text>
      <Text style={styles.subtitle}>Define a tua nova password para a TuCAN!.</Text>

      <Text style={styles.label}>Nova password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor={COLORS.inkSoft}
        secureTextEntry={!showPassword}
      />

      <Text style={styles.label}>Confirmar password</Text>
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        placeholder="••••••••"
        placeholderTextColor={COLORS.inkSoft}
        secureTextEntry={!showPassword}
      />

      <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
        <Text style={styles.showToggle}>{showPassword ? 'Ocultar password' : 'Mostrar password'}</Text>
      </TouchableOpacity>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Guardar nova password</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  title: { fontFamily: FONTS.display, fontSize: 26, color: COLORS.ink, textAlign: 'center', marginBottom: 8 },
  subtitle: { color: COLORS.inkSoft, textAlign: 'center', marginBottom: 20, fontFamily: FONTS.bodyRegular, fontSize: 13, lineHeight: 19 },
  label: { fontSize: 11, color: COLORS.inkSoft, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { padding: 13, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.card, color: COLORS.ink, fontFamily: FONTS.bodyRegular, fontSize: 15 },
  showToggle: { color: COLORS.electro, textAlign: 'center', marginTop: 12, fontFamily: FONTS.bodyBold, fontSize: 12 },
  error: { color: COLORS.c9, fontSize: 12.5, marginTop: 14, textAlign: 'center' },
  submitBtn: { marginTop: 22, padding: 15, borderRadius: 8, backgroundColor: COLORS.sporting, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 15 },
});
