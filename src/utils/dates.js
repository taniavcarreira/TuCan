// Nomes de dias/meses e formatação de datas, por idioma. As funções
// aceitam um parâmetro `lang` opcional ('pt' | 'en' | 'fr'); quando
// omitido mantém o comportamento antigo (português), para não partir
// chamadas existentes.
const LOCALE_MAP = { pt: 'pt-PT', en: 'en-US', fr: 'fr-FR' };

export function localeFor(lang) {
  return LOCALE_MAP[lang] || LOCALE_MAP.pt;
}

const DAYS_BY_LANG = {
  pt: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
};

const MONTHS_BY_LANG = {
  pt: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
};

// Mantido por compatibilidade com código que ainda importa a constante
// diretamente (sempre em português). Preferir DAYS_FOR(language).
export const DAYS = DAYS_BY_LANG.pt;

export function DAYS_FOR(lang) {
  return DAYS_BY_LANG[lang] || DAYS_BY_LANG.pt;
}

export function isoMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function fmt(d) {
  return d.toISOString().slice(0, 10);
}

export function fmtShort(d, lang) {
  const locale = LOCALE_MAP[lang] || LOCALE_MAP.pt;
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

// "12 de setembro" — usado para identificar travessias na interface
// (especificação v2, secção 3: nunca mostrar o número/id internos,
// só a data, por extenso). Aceita tanto um Date como uma string
// 'YYYY-MM-DD'.
export function fmtLongDate(d, lang) {
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
  const locale = LOCALE_MAP[lang] || LOCALE_MAP.pt;
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

export function weekKey(monday) {
  return 'week:' + fmt(monday);
}

export function monthLabelPt(y, m, lang) {
  const names = MONTHS_BY_LANG[lang] || MONTHS_BY_LANG.pt;
  return names[m] + '/' + String(y).slice(2);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
