import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS } from '../theme';

// Google actively refuses to complete OAuth inside embedded ("in-app")
// browsers — WhatsApp, Instagram, Facebook, TikTok, etc. all open links
// in their own WebView instead of the phone's real browser, and some of
// them also restrict localStorage/cookies, which can break the
// email/password login too (this is what the focus group hit on
// 30/08/2026 — see the project doc). There's no script that can force a
// real redirect out of that WebView — iOS in particular sandboxes this
// on purpose — so the practical fix is telling the person how to leave
// it themselves. Android in-app browsers, unlike iOS's, do honour an
// `intent://` URL asking to reopen the page in Chrome, so there we also
// offer a one-tap button; iOS only gets the manual instructions.
function detectInAppBrowser() {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return null;
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  let name = null;
  if (/Instagram/i.test(ua)) name = 'Instagram';
  else if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) name = 'Facebook';
  else if (/Messenger/i.test(ua)) name = 'Messenger';
  else if (/\bLine\//i.test(ua)) name = 'Line';
  else if (/MicroMessenger/i.test(ua)) name = 'WeChat';
  else if (/TikTok|BytedanceWebview/i.test(ua)) name = 'TikTok';
  else if (/Twitter/i.test(ua)) name = 'Twitter/X';
  else if (/LinkedInApp/i.test(ua)) name = 'LinkedIn';
  else if (/Snapchat/i.test(ua)) name = 'Snapchat';
  else if (/WhatsApp/i.test(ua)) name = 'WhatsApp';

  return name ? { name, isAndroid, isIOS } : null;
}

export default function InAppBrowserBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  // useMemo (not useState/useEffect) is enough — the user agent never
  // changes during the life of the page.
  const info = useMemo(() => (Platform.OS === 'web' ? detectInAppBrowser() : null), []);

  if (!info || dismissed) return null;

  function openInChrome() {
    try {
      const withoutScheme = window.location.href.replace(/^https?:\/\//, '');
      window.location.href = `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;end`;
    } catch (e) {
      // best-effort only — if this fails for any reason, the manual
      // instructions in the banner text still apply.
    }
  }

  function copyLink() {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // clipboard API can be unavailable (older WebViews) — no harm,
      // the person can still select/copy the address bar manually.
    }
  }

  return (
    <View style={styles.banner}>
      <View style={styles.textCol}>
        <Text style={styles.title}>Estás a abrir isto dentro do {info.name}</Text>
        <Text style={styles.body}>
          O login com Google não funciona aqui dentro (e o resto da app também pode falhar sem aviso).{' '}
          {info.isAndroid
            ? 'Toca em "Abrir no Chrome" para continuares sem problemas.'
            : 'Toca em ⋯ ou no ícone de partilha, no canto do ecrã, e escolhe "Abrir no Safari" — ou copia o link e cola lá diretamente.'}
        </Text>
        <View style={styles.actions}>
          {info.isAndroid && (
            <TouchableOpacity style={styles.btnPrimary} onPress={openInChrome}>
              <Text style={styles.btnPrimaryText}>Abrir no Chrome</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnGhost} onPress={copyLink}>
            <Text style={styles.btnGhostText}>{copied ? 'Link copiado!' : 'Copiar link'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity onPress={() => setDismissed(true)} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
    backgroundColor: COLORS.mostarda,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  textCol: { flex: 1 },
  title: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.bg, marginBottom: 3 },
  body: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.bg, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnPrimary: { backgroundColor: COLORS.bg, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 12 },
  btnPrimaryText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.mostarda },
  btnGhost: { borderWidth: 1.5, borderColor: COLORS.bg, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 12 },
  btnGhostText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.bg },
  closeBtn: { paddingTop: 2 },
  closeText: { fontSize: 15, color: COLORS.bg, opacity: 0.7 },
});
