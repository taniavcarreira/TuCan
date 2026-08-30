import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { useData } from '../context/DataContext';
import { supabase } from '../supabaseClient';
import { DEFAULT_AVATAR } from '../utils/avatars';
import ToucanAvatar from '../components/ToucanAvatar';

export default function ProfileScreen({ onClose }) {
  const { profile, updateProfile } = useData();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const dirty = firstName !== profile.firstName || lastName !== profile.lastName;

  async function save() {
    setError(''); setMessage('');
    setSaving(true);
    try {
      await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() });
      setMessage('Perfil atualizado.');
    } catch (e) {
      setError(e.message || 'Não foi possível guardar. Tenta de novo.');
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
      else setMessage('Enviámos um email para ' + profile.email + ' com instruções para repor a password.');
    } finally {
      setResetting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>A minha conta</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>Fechar</Text></TouchableOpacity>
        )}
      </View>

      <View style={styles.avatarPreviewWrap}>
        <ToucanAvatar hat={DEFAULT_AVATAR.hat} top={DEFAULT_AVATAR.top} base={DEFAULT_AVATAR.base} leg={DEFAULT_AVATAR.leg} size={72} />
      </View>

      <Text style={styles.label}>Email</Text>
      <View style={styles.readOnlyField}>
        <Text style={styles.readOnlyText}>{profile.email}</Text>
      </View>

      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="O teu nome"
        placeholderTextColor={COLORS.inkSoft}
      />

      <Text style={styles.label}>Apelido</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholder="O teu apelido"
        placeholderTextColor={COLORS.inkSoft}
      />

      <Text style={styles.label}>Avatar</Text>
      <Text style={styles.hint}>
        O teu tucano aparece a voar até ao ramo e pisca o olho sempre que atingires o Perfect! do dia.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!message && <Text style={styles.info}>{message}</Text>}

      <TouchableOpacity
        style={[styles.saveBtn, !dirty && styles.saveBtnDisabled]}
        disabled={!dirty || saving}
        onPress={save}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar alterações</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} disabled={resetting} onPress={resetPassword}>
        {resetting ? <ActivityIndicator color={COLORS.ink} /> : <Text style={styles.resetBtnText}>Reset Password</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutBtn} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutBtnText}>Terminar sessão</Text>
      </TouchableOpacity>
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
