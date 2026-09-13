// Contexto de idioma da app — deteção automática do idioma do
// dispositivo na primeira utilização, com a possibilidade de o
// utilizador escolher manualmente mais tarde (Perfil). A escolha
// manual fica guardada localmente (AsyncStorage) e passa a ter
// sempre prioridade sobre a deteção automática.
//
// Uso:
//   const { language, setLanguage, t, ready } = useLanguage();
//   t('common.save')              -> string traduzida
//   t('profile.resetEmailSent', { email: 'x@y.com' }) -> com interpolação {email}
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { translations } from './translations';

const STORAGE_KEY = 'tucan_language';

export const SUPPORTED_LANGUAGES = ['pt', 'en', 'fr'];
const DEFAULT_LANGUAGE = 'pt';

// Deteta o idioma do dispositivo (funciona em iOS/Android via
// expo-localization, e em web via navigator.language, que a própria
// expo-localization já trata internamente) e devolve um dos idiomas
// suportados, caindo em português quando o idioma do aparelho não é
// nenhum dos 3.
function detectDeviceLanguage() {
  try {
    const locales = Localization.getLocales ? Localization.getLocales() : [];
    const code = locales && locales[0] && locales[0].languageCode;
    if (code && SUPPORTED_LANGUAGES.includes(code)) return code;
  } catch (e) {
    // ambiente sem suporte (ex.: SSR) — ignora e cai no default
  }
  return DEFAULT_LANGUAGE;
}

function interpolate(str, vars) {
  if (!vars) return str;
  return Object.keys(vars).reduce(
    (acc, key) => acc.split(`{${key}}`).join(String(vars[key])),
    str
  );
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let initial = detectDeviceLanguage();
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
          initial = saved;
        }
      } catch (e) {
        // sem AsyncStorage disponível — segue com a deteção automática
      }
      if (!cancelled) {
        setLanguageState(initial);
        setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setLanguage = useCallback((lang) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  }, []);

  const t = useCallback((key, vars) => {
    const dict = translations[language] || translations[DEFAULT_LANGUAGE];
    const fallback = translations[DEFAULT_LANGUAGE];
    const raw = (dict && dict[key] !== undefined) ? dict[key] : (fallback ? fallback[key] : undefined);
    if (raw === undefined) return key;
    return interpolate(raw, vars);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    ready,
    SUPPORTED_LANGUAGES,
  }), [language, setLanguage, t, ready]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage() tem de ser usado dentro de um <LanguageProvider>');
  }
  return ctx;
}
