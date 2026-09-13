// Ecrã informativo (sem toggles) mostrado uma única vez, logo após o
// primeiro login/registo de cada conta neste dispositivo (Google ou
// email/password) — item 4 do focus group (11/09/2026). Decisão do
// produto: a app só usa o email para identificar a conta, não acede a
// mais nada, por isso não há permissões para ligar/desligar — só uma
// explicação clara do que NÃO é acedido. App.js controla quando este
// ecrã aparece (ver `permissionsSeen` em App.js) e chama `onContinue`
// quando o utilizador confirma ter lido.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { useLanguage } from '../i18n/LanguageContext';

function Row({ symbol, text }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowSymbol}>{symbol}</Text>
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

export default function PermissionsScreen({ onContinue }) {
  const { t } = useLanguage();
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('permissions.title')}</Text>
        <Text style={styles.body}>{t('permissions.body')}</Text>

        <View style={styles.list}>
          <Row symbol="✓" text={t('permissions.item1')} />
          <Row symbol="✕" text={t('permissions.item2')} />
          <Row symbol="✕" text={t('permissions.item3')} />
          <Row symbol="✕" text={t('permissions.item4')} />
        </View>

        <TouchableOpacity style={styles.btn} onPress={onContinue}>
          <Text style={styles.btnText}>{t('permissions.continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  card: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 12, padding: 22 },
  title: { fontFamily: FONTS.display, fontSize: 20, color: COLORS.ink, textAlign: 'center', marginBottom: 12, lineHeight: 26 },
  body: { fontSize: 13, color: COLORS.inkSoft, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
  list: { gap: 10, marginBottom: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bg, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 8, padding: 12 },
  rowSymbol: { width: 18, textAlign: 'center', fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.inkSoft },
  rowText: { flex: 1, fontSize: 12.5, color: COLORS.ink, fontFamily: FONTS.bodyRegular },
  btn: { padding: 15, borderRadius: 8, backgroundColor: COLORS.sporting, alignItems: 'center' },
  btnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 15 },
});
