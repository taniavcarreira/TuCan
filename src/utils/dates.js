export const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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

export function fmtShort(d) {
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

export function weekKey(monday) {
  return 'week:' + fmt(monday);
}

export function monthLabelPt(y, m) {
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return names[m] + '/' + String(y).slice(2);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
