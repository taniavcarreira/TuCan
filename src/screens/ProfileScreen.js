import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../supabaseClient';
import { DEFAULT_AVATAR } from '../utils/avatars';
import ToucanAvatar from '../components/ToucanAvatar';
import ConfirmModal from '../components/ConfirmModal';

// Nomes nativos de cada idioma suportado — mostram-se sempre assim
// (endónimos), independentemente do idioma atual da interface, tal
// como o nome "TuCAN!" nunca é traduzido.
const LANGUAGE_NAMES = { pt: 'Português', en: 'English', fr: 'Français' };

export default function ProfileScreen({ onClose }) {
  const { profile, updateProfile } = useData();
  const { t, language, setLanguage, SUPPORTED_LANGUAGES } = useLanguage();
  const [username, setUsername] = useState(profile.username);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  const dirty = username !== profile.username;

  async function save() {
    setError(''); setMessage('');
    setSaving(true);
    try {
      await updateProfile({ username: username.trim() });
      setMessage(t('profile.updated'));
    } catch (e) {
      setError(e.message || t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    setError(''); setMessage('');
    setResetting(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(profile.email);
      if (err) setError(err.message);
      else setMessage(t('profile.resetEmailSent', { email: profile.email }));
    } finally {
      setResetting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>{t('profile.title')}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>{t('common.close')}</Text></TouchableOpacity>
        )}
      </View>

      <View style={styles.avatarPreviewWrap}>
        <ToucanAvatar hat={DEFAULT_AVATAR.hat} top={DEFAULT_AVATAR.top} base={DEFAULT_AVATAR.base} leg={DEFAULT_AVATAR.leg} size={72} />
      </View>

      <Text style={styles.label}>{t('profile.emailLabel')}</Text>
      <View style={styles.readOnlyField}>
        <Text style={styles.readOnlyText}>{profile.email}</Text>
      </View>

      <Text style={styles.label}>{t('profile.usernameLabel')}</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder={t('profile.usernamePlaceholder')}
        placeholderTextColor={COLORS.inkSoft}
        autoCapitalize="none"
      />

      <Text style={styles.label}>{t('profile.avatarLabel')}</Text>
      <Text style={styles.hint}>{t('profile.avatarHint')}</Text>

      <Text style={styles.label}>{t('profile.languageLabel')}</Text>
      <View style={styles.langRow}>
        {SUPPORTED_LANGUAGES.map((lng) => (
          <TouchableOpacity
            key={lng}
            style={[styles.langBtn, language === lng && styles.langBtnActive]}
            onPress={() => setLanguage(lng)}
          >
            <Text style={[styles.langBtnText, language === lng && styles.langBtnTextActive]}>{LANGUAGE_NAMES[lng]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!message && <Text style={styles.info}>{message}</Text>}

      <TouchableOpacity
        style={[styles.saveBtn, !dirty && styles.saveBtnDisabled]}
        disabled={!dirty || saving}
        onPress={save}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('profile.saveChanges')}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} disabled={resetting} onPress={resetPassword}>
        {resetting ? <ActivityIndicator color={COLORS.ink} /> : <Text style={styles.resetBtnText}>{t('profile.resetPassword')}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutBtn} onPress={() => setSignOutConfirmOpen(true)}>
        <Text style={styles.signOutBtnText}>{t('profile.signOut')}</Text>
      </TouchableOpacity>

      <ConfirmModal
        visible={signOutConfirmOpen}
        title={t('signOut.confirmTitle')}
        confirmLabel={t('signOut.confirmBtn')}
        cancelLabel={t('signOut.cancelBtn')}
        danger
        onCancel={() => setSignOutConfirmOpen(false)}
        onConfirm={() => { setSignOutConfirmOpen(false); supabase.auth.signOut(); }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  h1: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.ink },
  closeText: { color: COLORS.electro, fontFamily: FONTS.bodyBold, fontSize: 13 },

  avatarPreviewWrap: { alignItems: 'center', marginBottom: 22, minHeight: 112, justifyContent: 'center' },

  label: { fontSize: 11, color: COLORS.inkSoft, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  input: { padding: 13, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.card, color: COLORS.ink, fontFamily: FONTS.bodyRegular, fontSize: 15 },
  readOnlyField: { padding: 13, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg },
  readOnlyText: { color: COLORS.inkSoft, fontFamily: FONTS.bodyRegular, fontSize: 15 },

  hint: { fontSize: 11.5, color: COLORS.inkSoft, lineHeight: 16, marginBottom: 10 },

  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.bg },
  langBtnActive: { backgroundColor: COLORS.electro, borderColor: COLORS.electro },
  langBtnText: { color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, fontSize: 12.5 },
  langBtnTextActive: { color: COLORS.bg },

  error: { color: COLORS.c9, fontSize: 12.5, marginTop: 16, textAlign: 'center' },
  info: { color: COLORS.electro, fontSize: 12.5, marginTop: 16, textAlign: 'center', lineHeight: 18 },

  saveBtn: { marginTop: 20, padding: 15, borderRadius: 8, backgroundColor: COLORS.sporting, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 15 },

  resetBtn: { marginTop: 12, padding: 15, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, alignItems: 'center' },
  resetBtnText: { color: COLORS.ink, fontFamily: FONTS.bodyBold, fontSize: 14 },

  signOutBtn: { marginTop: 12, padding: 15, borderRadius: 8, borderWidth: 2, borderColor: COLORS.c9, alignItems: 'center' },
  signOutBtnText: { color: COLORS.c9, fontFamily: FONTS.bodyBold, fontSize: 14 },
});
