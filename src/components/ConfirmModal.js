// Diálogo de confirmação genérico e reutilizável (Modal nativo do RN,
// funciona em iOS/Android/web). Usado para já só pelo fluxo de
// "Terminar sessão" (item 2 do focus group, 11/09/2026) em dois sítios
// — App.js (botão ⎋ da topbar) e ProfileScreen.js — mas escrito sem
// nada específico de sign-out para poder ser reaproveitado depois.
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';

export default function ConfirmModal({ visible, title, confirmLabel, cancelLabel, onConfirm, onCancel, danger }) {
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, danger && styles.confirmBtnDanger]} onPress={onConfirm}>
              <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 12, padding: 20 },
  title: { fontFamily: FONTS.display, fontSize: 16, color: COLORS.ink, textAlign: 'center', marginBottom: 18, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 13, borderRadius: 8, borderWidth: 2, borderColor: COLORS.line, alignItems: 'center' },
  cancelBtnText: { color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, fontSize: 14 },
  confirmBtn: { flex: 1, padding: 13, borderRadius: 8, backgroundColor: COLORS.sporting, alignItems: 'center' },
  confirmBtnDanger: { backgroundColor: COLORS.c9 },
  confirmBtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 14 },
});
