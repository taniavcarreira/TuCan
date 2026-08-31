import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { supabase } from '../supabaseClient';
import { signInWithGoogle } from '../utils/googleAuth';
import { checkEmailStatus } from '../utils/authChecks';

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

// A single "notice" (error or info) replaces the old separate
// error/info strings, because several of the messages below need an
// inline tappable action ("Cria a tua conta", "Reinicia a password",
// "Continuar com o Google") glued to the end of the sentence, not just
// plain text.
function Notice({ notice }) {
  if (!notice) return null;
  return (
    <Text style={[styles.notice, notice.kind === 'error' ? styles.noticeError : styles.noticeInfo]}>
      {notice.text}
      {notice.action ? (
        <>
          {' '}
          <Text onPress={notice.action.onPress} style={styles.noticeAction}>{notice.action.label}</Text>
        </>
      ) : null}
    </Text>
  );
}

export default function AuthScreen() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'recover'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [notice, setNotice] = useState(null);

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
      setNotice({ kind: 'error', text: decodeURIComponent(desc.replace(/\+/g, ' ')) });
      // Limpa a URL para não repetir o erro num refresh futuro.
      window.history.replaceState(null, '', window.location.pathname + window.location.search.split('#')[0]);
    }
  }, []);

  function switchToSignin() { setMode('signin'); setNotice(null); }
  function switchToSignup() { setMode('signup'); setNotice(null); }
  function switchToRecover() { setMode('recover'); setNotice(null); }

  async function submitSignIn() {
    setNotice(null);
    if (!email.trim() || !password) {
      setNotice({ kind: 'error', text: 'Preenche o email e a password.' });
      return;
    }
    setLoading(true);
    try {
      // O check de email é "melhor esforço": se a função check_email_status
      // ainda não existir na Supabase (ver supabase/sql/check_email_status.sql),
      // ou falhar por qualquer razão, seguimos em frente com o login
      // normal em vez de bloquear tudo — só perdemos a mensagem mais
      // específica, não a funcionalidade.
      let status = null;
      try { status = await checkEmailStatus(email); } catch (_) { /* cai no fallback abaixo */ }

      if (status === 'not_registered') {
        setNotice({ kind: 'error', text: 'Utilizador não registado.', action: { label: 'Cria a tua conta', onPress: switchToSignup } });
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) {
        setNotice({ kind: 'error', text: 'Password incorreta.', action: { label: 'Reinicia a password', onPress: switchToRecover } });
        return;
      }
      // sucesso — o onAuthStateChange no App.js trata do resto
    } catch (err) {
      // Antes, um erro "a sério" aqui (rede em baixo, armazenamento do
      // browser bloqueado — ex.: modo privado/navegador de app como o do
      // WhatsApp/Instagram — em vez de uma simples password errada) ficava
      // completamente silencioso: o botão parecia não fazer nada. Agora
      // mostra-se sempre alguma coisa, mesmo que genérica.
      setNotice({ kind: 'error', text: err?.message || 'Algo correu mal ao tentar entrar. Tenta noutro browser (ex.: abre o link no Safari/Chrome em vez de dentro do WhatsApp) e tenta de novo.' });
    } finally {
      setLoading(false);
    }
  }

  async function submitSignUp() {
    setNotice(null);
    if (!email.trim() || !password) {
      setNotice({ kind: 'error', text: 'Preenche o email e a password.' });
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
      if (err) setNotice({ kind: 'error', text: err.message });
      else setNotice({ kind: 'info', text: 'Conta criada. Consoante as definições do teu projeto Supabase, pode ser preciso confirmar por email antes de entrares.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err?.message || 'Algo correu mal ao criar a conta. Tenta de novo.' });
    } finally {
      setLoading(false);
    }
  }

  async function submitRecover() {
    setNotice(null);
    if (!email.trim()) {
      setNotice({ kind: 'error', text: 'Escreve o teu email.' });
      return;
    }
    setLoading(true);
    try {
      let status = null;
      try { status = await checkEmailStatus(email); } catch (_) { /* cai no fallback abaixo */ }

      if (status === 'not_registered') {
        setNotice({ kind: 'error', text: 'Email não reconhecido.', action: { label: 'Regista-te', onPress: switchToSignup } });
        return;
      }
      if (status === 'google') {
        setNotice({ kind: 'info', text: 'Registaste-te pelo Google.', action: { label: 'Continuar com o Google', onPress: submitGoogle } });
        return;
      }

      // Sem check_email_status disponível (fallback), ou email confirmado
      // como sendo de password: pede sempre o reset — a Supabase já não
      // revela por si só se o email existe, o que é seguro por omissão.
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : undefined;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), redirectTo ? { redirectTo } : undefined);
      if (err) {
        setNotice({ kind: 'error', text: err.message });
        return;
      }
      setNotice({ kind: 'info', text: 'Verifica o teu email — enviámos um link para definires uma nova password.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err?.message || 'Algo correu mal. Tenta de novo.' });
    } finally {
      setLoading(false);
    }
  }

  async function submitGoogle() {
    setNotice(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setNotice({ kind: 'error', text: err?.message || 'Não foi possível continuar com o Google.' });
    } finally {
      setGoogleLoading(false);
    }
  }

  function submit() {
    if (mode === 'signin') return submitSignIn();
    if (mode === 'signup') return submitSignUp();
    return submitRecover();
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>TuCAN!</Text>
      <Text style={styles.subtitle}>
        {mode === 'signin' ? 'Entra na tua conta' : mode === 'signup' ? 'Cria a tua conta' : 'Recuperar password'}
      </Text>
      {mode === 'recover' && (
        <Text style={styles.recoverLede}>Escreve o teu email e enviamos-te um link para definires uma nova password.</Text>
      )}

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

      {mode !== 'recover' && (
        <>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.inkSoft}
            secureTextEntry
          />
        </>
      )}

      <Notice notice={notice} />

      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.submitBtnText}>
            {mode === 'signin' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link de recuperação'}
          </Text>
        )}
      </TouchableOpacity>

      {mode === 'signin' && (
        <TouchableOpacity onPress={switchToRecover}>
          <Text style={styles.forgotText}>Esqueci-me da password</Text>
        </TouchableOpacity>
      )}

      {mode !== 'recover' ? (
        <TouchableOpacity onPress={() => (mode === 'signin' ? switchToSignup() : switchToSignin())}>
          <Text style={styles.switchText}>
            {mode === 'signin' ? 'Ainda não tens conta? Criar uma' : 'Já tens conta? Entrar'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={switchToSignin}>
          <Text style={styles.switchText}>Voltar ao login</Text>
        </TouchableOpacity>
      )}

      {mode !== 'recover' && (
        <>
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
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  title: { fontFamily: FONTS.display, fontSize: 32, color: COLORS.ink, textAlign: 'center', marginBottom: 4 },
  subtitle: { color: COLORS.inkSoft, textAlign: 'center', marginBottom: 8, fontFamily: FONTS.bodyRegular, fontSize: 13 },
  recoverLede: { color: COLORS.inkSoft, textAlign: 'center', marginBottom: 20, fontFamily: FONTS.bodyRegular, fontSize: 12.5, lineHeight: 18 },
  label: { fontSize: 11, color: COLORS.inkSoft, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { padding: 13, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.card, color: COLORS.ink, fontFamily: FONTS.bodyRegular, fontSize: 15 },
  notice: { fontSize: 12.5, marginTop: 12, textAlign: 'center', lineHeight: 18 },
  noticeError: { color: COLORS.c9 },
  noticeInfo: { color: COLORS.electro },
  noticeAction: { fontFamily: FONTS.bodyBold, textDecorationLine: 'underline' },
  submitBtn: { marginTop: 22, padding: 15, borderRadius: 8, backgroundColor: COLORS.sporting, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 15 },
  forgotText: { color: COLORS.inkSoft, textAlign: 'center', marginTop: 14, fontFamily: FONTS.bodyRegular, fontSize: 12 },
  switchText: { color: COLORS.electro, textAlign: 'center', marginTop: 14, fontFamily: FONTS.bodyBold, fontSize: 12.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 26, marginBottom: 4, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.line },
  dividerText: { color: COLORS.inkSoft, fontSize: 11, fontFamily: FONTS.bodyRegular, textTransform: 'uppercase' },
  googleBtn: { marginTop: 14, padding: 13, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.card, alignItems: 'center' },
  googleBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleBtnText: { color: COLORS.ink, fontFamily: FONTS.bodyBold, fontSize: 14 },
});
