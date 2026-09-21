import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { useLanguage } from '../i18n/LanguageContext';
import { useData } from '../context/DataContext';

// Aviso visível sempre que um registo não chegou a ser confirmado pelo
// Supabase (ligação em baixo, sessão expirada, ou — o caso real que
// motivou isto, 21/09/2026 — uma coluna nova que a base de dados ainda
// não tinha, depois de uma atualização em que faltou correr o SQL da
// migração). Até aqui isto só ia para a consola: a app continuava a
// mostrar a marca (estado otimista local), e o registo desaparecia
// sozinho na visita seguinte, sem nenhum aviso — o oposto do princípio
// 1 da especificação ("a app recompensa o ato de registar, nunca o ato
// de cumprir"). Os dados não se perdem enquanto este aviso está visível
// — "Tentar novamente" volta a enviá-los.
//
// `dismissedAt` guarda a contagem de falhas que já foi fechada pela
// pessoa — se depois disso aparecer uma falha nova (a contagem muda),
// o banner reaparece sozinho; fechar não apaga os dados por enviar.
export default function SaveErrorBanner() {
  const { t } = useLanguage();
  const { saveErrorCount, retrySaveError } = useData();
  const [dismissedAt, setDismissedAt] = useState(0);
  const [retrying, setRetrying] = useState(false);

  if (!saveErrorCount || dismissedAt === saveErrorCount) return null;

  async function handleRetry() {
    setRetrying(true);
    try {
      await retrySaveError();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <View style={styles.banner}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{t('save.errorTitle')}</Text>
        <Text style={styles.body}>
          {saveErrorCount === 1 ? t('save.errorBodyOne') : t('save.errorBodyMany', { count: saveErrorCount })}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleRetry} disabled={retrying}>
            <Text style={styles.btnPrimaryText}>{retrying ? t('save.retrying') : t('save.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => setDismissedAt(saveErrorCount)}
        style={styles.closeBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.coral,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  textCol: { flex: 1 },
  title: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.ink, marginBottom: 3 },
  body: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.ink, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnPrimary: { backgroundColor: COLORS.ink, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 12 },
  btnPrimaryText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.coral },
  closeBtn: { paddingTop: 2 },
  closeText: { fontSize: 15, color: COLORS.ink, opacity: 0.85 },
});
