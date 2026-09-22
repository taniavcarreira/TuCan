import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, ActivityIndicator, Modal } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
// Só é usado no ramo web (ver notas junto de cada chamada), mas importa-se
// estaticamente porque é assim que o próprio react-native-view-shot usa o
// html2canvas internamente na sua build web — padrão já validado pelo
// Metro/Expo.
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import { currentScore, maxScore, fieldValue, fieldPercent } from '../utils/fields';
import { monthGrid, monthLongLabel, todayISO, fmt } from '../utils/dates';

// Calendário de partilha — pedido da Tania a 20/09/2026, inspirado no
// ecrã de streak do YaZio (imagem em anexo na conversa), mas adaptado
// aos princípios da secção 0 da especificação:
//   - NUNCA um X vermelho num dia sem registo — não é uma falha, é só
//     um dia sem dados (princípio 6, "reenquadramento não avaliação").
//     Dias sem registo ficam com um contorno neutro, iguais a dias
//     futuros.
//   - Sem "Peso" nem qualquer número que alimente compulsão (princípio
//     5) — o terceiro indicador é "Badges este mês" em vez disso.
//   - Três estados por dia (não dois): todas as âncoras cumpridas /
//     algum registo sem cumprir tudo / sem registo — o mesmo modelo já
//     desenhado para o Bloco 1 do relatório semanal (secção 7.1), só
//     que agora num mês inteiro em vez de uma semana.
//
// Evolução a 21/09/2026 — filtros por campo: além do calendário geral
// (o "Global", primeira posição, continua a ser o que aparece por
// omissão), cada campo — âncora ou observação, não interessa — ganha a
// sua própria variante do calendário:
//   - Campo booleano: cor do próprio campo no dia em que foi marcado,
//     contorno neutro (igual ao "sem registo" de sempre) quando não.
//   - Campo métrico: um anel que enche à proporção do valor/meta desse
//     dia, na cor do campo — dias sem registo ficam sem nenhuma cor
//     (só o contorno neutro habitual), exatamente como pedido.
// O botão Partilhar tira um screenshot de cada variante e junta tudo
// num único PDF de várias páginas (jsPDF no browser, expo-print no
// iOS/Android) — pronto a descarregar ou a enviar pelos mesmos canais
// já propostos (WhatsApp, email, etc.).
//
// Retoque de UX a 23/09/2026, depois de ela ver os filtros em uso: a fila
// de chips no topo (5+ campos) ficava cortada/ilegível em ecrãs estreitos.
// Trocada por um "carrossel" horizontal de verdade — um ScrollView com
// paginação nativa (scroll-snap no browser, o mesmo mecanismo do iOS/
// Android), com um cartão por campo lado a lado. Por baixo do carrossel
// fica um "select" (na verdade um botão que abre uma lista, não há
// `<select>` nativo cross-platform) com "Global" como opção por omissão,
// para quem prefere escolher em vez de deslizar — os dois controlam o
// mesmo estado e ficam sempre sincronizados. A ordem é sempre a mesma em
// todo o lado: Global primeiro, depois os campos pela ordem de
// Configurações — e é essa mesma lista (`fieldOptions`) que o PDF de
// partilha percorre.
// Nota técnica: todos os cartões (Global + um por campo) ficam montados
// ao mesmo tempo lado a lado (o ScrollView não "desmonta" o que está
// fora da vista, só o esconde visualmente) — por isso o Partilhar já não
// precisa de trocar de filtro e esperar o ecrã redesenhar entre cada
// captura (era esse o mecanismo antigo, baseado num gesto manual que se
// mostrou pouco fiável em testes); tira o screenshot de cada cartão
// diretamente pela sua referência (`captureRef`, do próprio
// react-native-view-shot), o que é mais simples e mais robusto.
//
// Retoque de layout do PDF a 23/09/2026, já com o select/carrossel em
// uso: o Partilhar deixou de gerar uma página por calendário (Global +
// um por campo) — passa a gerar uma única folha condensada, com
// estrutura de A4 pronta a imprimir, inspirada numa imagem de
// referência que a Tania mandou (painel principal + barra lateral +
// cartões com anel de percentagem). Ver `MonthlyReportCard` mais abaixo
// — é um componente à parte, sempre montado fora da área visível do
// ecrã (nunca aparece à pessoa a usar a app), com fundo claro em vez do
// tema escuro do resto da app (pedido explícito dela: "parece mais um
// relatório para imprimir... para a psicóloga"). O carrossel/select
// acima não mudou nada — continua a servir para ver cada calendário no
// ecrã; só o que o botão Partilhar produz é que mudou.

function ChevronIcon({ dir, color }) {
  const d = dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6';
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <Path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ChevronDownIcon({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <Path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CheckIcon({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6}>
      <Path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ShareIcon({ color }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
      <Path d="M12 3v12M7 8l5-5 5 5M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Anel de percentagem para um campo métrico, desenhado por cima do
// círculo do dia (mesma técnica do RingChart da Hoje: um Circle de
// fundo + um Circle com strokeDasharray proporcional, rodado -90º para
// começar às 12h). viewBox fixo 0-100 + width/height "100%" para
// acompanhar o tamanho do círculo do dia em qualquer ecrã, sem precisar
// de saber o tamanho em píxeis.
const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;
function PercentRing({ percent, color }) {
  const filled = RING_C * Math.max(0, Math.min(1, percent));
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" style={styles.ringSvg}>
      <Circle cx={50} cy={50} r={RING_R} fill="none" stroke={COLORS.line} strokeWidth={9} />
      {percent > 0 && (
        <Circle
          cx={50} cy={50} r={RING_R} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={`${filled} ${RING_C - filled}`}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

// Estado de um dia — devolve sempre { kind, percent? }. `kind` é
// 'full' | 'partial' | 'none' | 'future' no calendário geral (field
// nulo), ou 'on' | 'ring' | 'empty' | 'future' quando é a variante de um
// campo. Partilhado entre o `CalendarCard` do carrossel e o
// `MonthlyReportCard` do PDF (ver 23/09/2026 mais abaixo) — mesma lógica
// de sempre, só muda o desenho à volta (tema escuro do carrossel vs.
// relatório claro para imprimir).
function computeDayState(dateStr, field, { today, daysByDate, customFields }) {
  if (dateStr > today) return { kind: 'future' };
  const day = daysByDate[dateStr];
  if (field) {
    if (!day) return { kind: 'empty' };
    const percent = fieldPercent(day, field);
    if (percent <= 0) return { kind: 'empty' };
    return field.type === 'bool' ? { kind: 'on' } : { kind: 'ring', percent };
  }
  if (!day) return { kind: 'none' };
  const max = maxScore(customFields);
  const score = currentScore(day, customFields);
  const anyLog = day.mood > 0 || customFields.some((f) => {
    const v = fieldValue(day, f);
    return f.type === 'bool' ? !!v : v > 0;
  });
  if (max > 0 && score === max) return { kind: 'full' };
  if (anyLog) return { kind: 'partial' };
  return { kind: 'none' };
}

// Quantos dias do mês têm pelo menos um registo — geral (qualquer campo)
// ou de um campo específico. Também partilhado entre os dois cartões.
function computeLoggedCount(daysByDate, customFields) {
  return Object.values(daysByDate).filter((day) => {
    return day.mood > 0 || customFields.some((f) => {
      const v = fieldValue(day, f);
      return f.type === 'bool' ? !!v : v > 0;
    });
  }).length;
}
function computeFieldLoggedCount(daysByDate, field) {
  if (!field) return 0;
  return Object.values(daysByDate).filter((day) => fieldPercent(day, field) > 0).length;
}

// Um cartão de calendário — o geral (field=null) ou a variante de um
// campo (field=objeto do campo). Isolado num componente à parte porque o
// carrossel monta vários ao mesmo tempo, lado a lado, cada um com a sua
// própria referência para a captura de ecrã do PDF.
const CalendarCard = React.forwardRef(function CalendarCard(props, ref) {
  const {
    field, weeks, daysByDate, today, customFields, monthLabel, loading,
    changeMonth, liveCycle, badgesThisMonth, daysInMonth, t,
  } = props;

  function dayState(dateStr) {
    return computeDayState(dateStr, field, { today, daysByDate, customFields });
  }

  const loggedCount = useMemo(() => computeLoggedCount(daysByDate, customFields), [daysByDate, customFields]);
  const fieldLoggedCount = useMemo(() => computeFieldLoggedCount(daysByDate, field), [daysByDate, field]);

  return (
    <View ref={ref} style={styles.shareCard}>
      <View style={styles.brandRow}>
        <Text style={styles.brandText}>{t('common.appName')}</Text>
        {field && <Text style={styles.brandFieldText}>{field.name}</Text>}
      </View>

      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <ChevronIcon dir="left" color={COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <ChevronIcon dir="right" color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeaderRow}>
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
          <Text key={i} style={styles.weekHeaderText}>{d}</Text>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.electro} style={{ marginVertical: 30 }} />
      ) : (
        weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((cell, ci) => {
              if (!cell) return <View key={ci} style={styles.dayCell} />;
              const s = dayState(cell.date);
              return (
                <View key={ci} style={styles.dayCell}>
                  <View style={[
                    styles.dayCircle,
                    s.kind === 'full' && styles.dayCircleFull,
                    s.kind === 'partial' && styles.dayCirclePartial,
                    (s.kind === 'none' || s.kind === 'empty') && styles.dayCircleNone,
                    s.kind === 'future' && styles.dayCircleFuture,
                    s.kind === 'ring' && styles.dayCircleNone,
                    s.kind === 'on' && field && { backgroundColor: field.color, borderColor: field.color },
                  ]}>
                    {s.kind === 'ring' && <PercentRing percent={s.percent} color={field.color} />}
                    <Text style={[
                      styles.dayNumber,
                      (s.kind === 'full' || s.kind === 'partial' || s.kind === 'on') && styles.dayNumberOnColor,
                    ]}>{cell.day}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}

      {field ? (
        field.type === 'bool' ? (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: field.color }]} /><Text style={styles.legendText}>{t('calendar.legendPartial')}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCircleNone]} /><Text style={styles.legendText}>{t('calendar.legendNone')}</Text></View>
          </View>
        ) : (
          <View style={styles.legendRow}>
            <Text style={styles.legendText}>{t('calendar.legendRingHint')}</Text>
          </View>
        )
      ) : (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCircleFull]} /><Text style={styles.legendText}>{t('calendar.legendFull')}</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCirclePartial]} /><Text style={styles.legendText}>{t('calendar.legendPartial')}</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, styles.dayCircleNone]} /><Text style={styles.legendText}>{t('calendar.legendNone')}</Text></View>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{liveCycle ? t('calendar.statCrossingDays', { n: liveCycle.daysLogged }) : '—'}</Text>
          <Text style={styles.statLabel}>{t('calendar.statCrossing')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{field ? `${fieldLoggedCount}/${daysInMonth}` : `${loggedCount}/${daysInMonth}`}</Text>
          <Text style={styles.statLabel}>{field ? t('calendar.statFieldLogged', { name: field.name }) : t('calendar.statLogged')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{badgesThisMonth}</Text>
          <Text style={styles.statLabel}>{t('calendar.statBadges')}</Text>
        </View>
      </View>
    </View>
  );
});

// Cores do relatório de partilha em PDF — só deste componente, nunca
// usadas no resto da app. Fundo claro, pedido explícito da Tania a
// 23/09/2026 ("típico de relatório para imprimir... parece mais 'para a
// psicóloga'"): poupa tinteiro e lê-se melhor em papel do que o tema
// escuro do resto da app. Os tons continuam dentro da família Bauhaus
// (`COLORS.mostarda`/`coral`/`sporting`/`electro`/`azul`, secção 6 da
// especificação) — só a base (fundo/tinta/linhas) é que é nova, pensada
// para papel em vez de ecrã.
const REPORT = {
  bg: '#F7F5EF',
  card: '#FFFFFF',
  ink: '#1B1A17',
  inkSoft: '#6B6558',
  line: '#DAD5C6',
};

// Selo do ProudOfMe em miniatura — meio-círculo (crânio) + triângulo
// (bico) + círculo (olho), especificação v2 secção 1.4 ("Hierarquia
// limpa: parte e todo"). Usado só como marca junto ao nome da app no
// cabeçalho do relatório, reaproveitando a identidade visual já
// aprovada em vez de inventar um logótipo novo.
function ToucanMark({ size = 30 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M4 33 A16 16 0 0 1 36 33 Z" fill={COLORS.mostarda} />
      <Path d="M19 17 L38 23 L19 29 Z" fill={COLORS.coral} />
      <Circle cx={13} cy={25} r={2.4} fill={REPORT.ink} />
    </Svg>
  );
}

// Anel de percentagem dos cartões do relatório — mesma técnica do
// `PercentRing` de cima, mas maior e com texto ao centro (a contagem
// "dias/mês", nunca a percentagem em bruto — princípio 5 da
// especificação: nada de números que alimentem compulsão em destaque;
// o que interessa aqui é a adesão ao registo, não uma nota de
// "sucesso").
function ReportRing({ percent, color, size, top, bottom }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const filled = c * Math.max(0, Math.min(1, percent));
  return (
    <View style={[styles.reportRingWrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={r} fill="none" stroke={REPORT.line} strokeWidth={9} />
        {percent > 0 && (
          <Circle
            cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={9}
            strokeDasharray={`${filled} ${c - filled}`}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={styles.reportRingCenter} pointerEvents="none">
        <Text style={[styles.reportRingTop, { fontSize: Math.round(size * 0.19) }]}>{top}</Text>
        {!!bottom && <Text style={[styles.reportRingBottom, { fontSize: Math.round(size * 0.1) }]}>{bottom}</Text>}
      </View>
    </View>
  );
}

// Relatório condensado para imprimir — pedido explícito da Tania a
// 23/09/2026, depois de mandar uma imagem de referência (um "dashboard"
// com um painel grande, um painel de legenda e cartões com anéis de
// percentagem) e pedir uma "folha A4" única em vez de uma página por
// calendário. Mantém a estrutura do exemplo (painel principal + barra
// lateral + cartões com anel) mas com conteúdo e linguagem 100% TuCAN:
// o painel principal é o calendário Global de verdade (não um círculo
// decorativo), a barra lateral mostra as contagens já estabelecidas no
// resto da app (nunca uma percentagem em destaque), e cada campo ganha
// um cartão com um anel de "dias/mês" — a mesma leitura de adesão que
// já aparece em cada página do carrossel, só reaproveitada aqui.
// Nasce sempre com proporção A4 (largura fixa, 210:297) — o
// `handleShare` mais abaixo usa essa proporção para gerar um PDF de
// página única do tamanho certo para imprimir, seja qual for a
// resolução em que o ecrã capturou a imagem.
const REPORT_WIDTH = 800;
const MonthlyReportCard = React.forwardRef(function MonthlyReportCard(props, ref) {
  const {
    customFields, weeks, daysByDate, today, monthLabel, liveCycle,
    badgesThisMonth, daysInMonth, loggedCount, t,
  } = props;

  return (
    <View ref={ref} style={styles.reportPage} collapsable={false}>
      <View style={styles.reportHeaderRow}>
        <View style={styles.reportBrandRow}>
          <ToucanMark size={30} />
          <Text style={styles.reportBrandText}>{t('common.appName')}</Text>
        </View>
        <View style={styles.reportHeaderRight}>
          <Text style={styles.reportSubtitle}>{t('calendar.reportSubtitle')}</Text>
          <Text style={styles.reportMonthLabel}>{monthLabel}</Text>
        </View>
      </View>
      <View style={styles.reportDivider} />

      <View style={styles.reportHeroRow}>
        <View style={styles.reportHeroMain}>
          <Text style={styles.reportBlockHeading}>{t('calendar.filterAll')}</Text>
          <View style={styles.reportWeekHeaderRow}>
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
              <Text key={i} style={styles.reportWeekHeaderText}>{d}</Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.reportWeekRow}>
              {week.map((cell, ci) => {
                if (!cell) return <View key={ci} style={styles.reportDayCell} />;
                const s = computeDayState(cell.date, null, { today, daysByDate, customFields });
                return (
                  <View key={ci} style={styles.reportDayCell}>
                    <View style={[
                      styles.reportDayCircle,
                      s.kind === 'full' && styles.reportDayCircleFull,
                      s.kind === 'partial' && styles.reportDayCirclePartial,
                      s.kind === 'none' && styles.reportDayCircleNone,
                      s.kind === 'future' && styles.reportDayCircleFuture,
                    ]}>
                      <Text style={[
                        styles.reportDayNumber,
                        (s.kind === 'full' || s.kind === 'partial') && styles.reportDayNumberOnColor,
                      ]}>{cell.day}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
          <View style={styles.reportLegendRow}>
            <View style={styles.reportLegendItem}><View style={[styles.reportLegendDot, styles.reportDayCircleFull]} /><Text style={styles.reportLegendText}>{t('calendar.legendFull')}</Text></View>
            <View style={styles.reportLegendItem}><View style={[styles.reportLegendDot, styles.reportDayCirclePartial]} /><Text style={styles.reportLegendText}>{t('calendar.legendPartial')}</Text></View>
            <View style={styles.reportLegendItem}><View style={[styles.reportLegendDot, styles.reportDayCircleNone]} /><Text style={styles.reportLegendText}>{t('calendar.legendNone')}</Text></View>
          </View>
        </View>

        <View style={styles.reportSidebar}>
          <View style={styles.reportSidebarRingBlock}>
            <ReportRing
              percent={daysInMonth > 0 ? loggedCount / daysInMonth : 0}
              color={COLORS.sporting}
              size={104}
              top={`${loggedCount}/${daysInMonth}`}
            />
            <Text style={styles.reportSidebarRingCaption}>{t('calendar.statLogged')}</Text>
          </View>
          <View style={styles.reportSidebarStat}>
            <Text style={styles.reportSidebarStatValue}>{liveCycle ? t('calendar.statCrossingDays', { n: liveCycle.daysLogged }) : '—'}</Text>
            <Text style={styles.reportSidebarStatLabel}>{t('calendar.statCrossing')}</Text>
          </View>
          <View style={styles.reportSidebarStat}>
            <Text style={styles.reportSidebarStatValue}>{badgesThisMonth}</Text>
            <Text style={styles.reportSidebarStatLabel}>{t('calendar.statBadges')}</Text>
          </View>
        </View>
      </View>

      {customFields.length > 0 && (
        <View style={styles.reportFieldsBlock}>
          <Text style={styles.reportBlockHeading}>{t('calendar.reportFieldsHeading')}</Text>
          <View style={styles.reportFieldsGrid}>
            {customFields.map((f) => {
              const n = computeFieldLoggedCount(daysByDate, f);
              return (
                <View key={f.id} style={styles.reportFieldCard}>
                  <View style={styles.reportFieldCardLeft}>
                    <View style={styles.reportFieldNameRow}>
                      <View style={[styles.reportFieldDot, { backgroundColor: f.color }]} />
                      <Text style={styles.reportFieldName} numberOfLines={1}>{f.name}</Text>
                    </View>
                    <Text style={styles.reportFieldKind}>
                      {f.kind === 'observation' ? t('config.kindObservation') : t('config.kindAnchor')}
                    </Text>
                  </View>
                  <ReportRing
                    percent={daysInMonth > 0 ? n / daysInMonth : 0}
                    color={f.color}
                    size={64}
                    top={`${n}/${daysInMonth}`}
                  />
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
});

export default function CalendarShareScreen({ onClose }) {
  const { customFields, loadTrendDays, badgesData } = useData();
  const { t, language } = useLanguage();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [daysByDate, setDaysByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState('');
  const [activeIndex, setActiveIndex] = useState(0); // índice em fieldOptions; 0 = Global, sempre a 1.ª posição
  const [selectOpen, setSelectOpen] = useState(false);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const scrollRef = useRef(null);
  const pageRefs = useRef([]);
  const reportRef = useRef(null);

  const today = todayISO();
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  // Só a primeira letra maiúscula ("Agosto de 2026", não "Agosto De
  // 2026") — capitalizar via CSS (textTransform) capitalizaria todas as
  // palavras, incluindo o "de" em português.
  const rawMonthLabel = monthLongLabel(cursor.year, cursor.month, language);
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fromISO = fmt(new Date(cursor.year, cursor.month, 1));
    const toISO = fmt(new Date(cursor.year, cursor.month + 1, 0));
    loadTrendDays(fromISO, toISO).then((rows) => {
      if (cancelled) return;
      const map = {};
      rows.forEach((r) => { map[r.date] = r; });
      setDaysByDate(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [cursor, loadTrendDays]);

  // Lista única (Global + um por campo, pela ordem de Configurações) —
  // usada pelo carrossel, pelo seletor, e pelo `handleShare` mais abaixo,
  // para as três coisas percorrerem sempre a mesma ordem.
  const fieldOptions = useMemo(() => ([
    { id: null, label: t('calendar.filterAll'), color: null, fieldObj: null },
    ...customFields.map((f) => ({ id: f.id, label: f.name, color: f.color, fieldObj: f })),
  ]), [customFields, t]);

  const safeIndex = Math.max(0, Math.min(fieldOptions.length - 1, activeIndex));
  const activeOption = fieldOptions[safeIndex] || fieldOptions[0];
  const filterField = activeOption ? activeOption.fieldObj : null;

  // Mantém o carrossel alinhado com a página atual quando a largura
  // disponível muda (ex.: rodar o telemóvel, redimensionar a janela no
  // browser) — sem isto, uma mudança de largura a meio deixava o
  // carrossel "desalinhado" das páginas.
  useEffect(() => {
    if (scrollRef.current && carouselWidth > 0) {
      scrollRef.current.scrollTo({ x: safeIndex * carouselWidth, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselWidth]);

  function goToIndex(idx) {
    const clamped = Math.max(0, Math.min(fieldOptions.length - 1, idx));
    setActiveIndex(clamped);
    if (scrollRef.current && carouselWidth > 0) {
      scrollRef.current.scrollTo({ x: clamped * carouselWidth, animated: true });
    }
  }
  function selectOption(id) {
    setSelectOpen(false);
    const idx = fieldOptions.findIndex((o) => o.id === id);
    if (idx >= 0) goToIndex(idx);
  }
  // Chamado a cada evento de scroll do carrossel — deteta em que página
  // ele está (arredondado à página mais próxima) e atualiza o estado (e,
  // por conseguinte, o texto do seletor por baixo). Usa `onScroll` (não
  // `onMomentumScrollEnd`) de propósito: no React Native Web a
  // implementação do ScrollView nunca dispara os eventos de "momentum"
  // (só existem para gestos táteis nativos), só o `onScroll` normal —
  // por isso é este o único evento que funciona de forma fiável tanto no
  // browser como no telemóvel.
  function handleScroll(e) {
    if (!carouselWidth) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setActiveIndex(Math.max(0, Math.min(fieldOptions.length - 1, idx)));
  }

  const badgesThisMonth = useMemo(() => {
    const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
    let n = 0;
    Object.values(badgesData.byBadge || {}).forEach((list) => {
      list.forEach((e) => { if (e.date.startsWith(prefix)) n++; });
    });
    return n;
  }, [badgesData, cursor]);

  const liveCycle = badgesData.cycles && badgesData.cycles.length ? badgesData.cycles[badgesData.cycles.length - 1] : null;
  const loggedCount = useMemo(() => computeLoggedCount(daysByDate, customFields), [daysByDate, customFields]);

  function changeMonth(delta) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  // Espera que o browser/motor nativo já tenha pintado o mês atual antes
  // de começar a tirar os screenshots — trocar de mês só faz efeito no
  // ecrã depois do próximo render, e o React não dá nenhuma garantia
  // síncrona disso. Como todos os cartões (Global + campos) já estão
  // montados ao mesmo tempo lado a lado no carrossel, uma única espera
  // chega para todos.
  function waitForPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  // Tira o screenshot de um nó qualquer e devolve sempre um data URI (já
  // pronto a usar num <img> ou num pdf.addImage) — no web via
  // html2canvas diretamente sobre o nó (funciona mesmo que esteja fora
  // da parte visível do ecrã, porque o html2canvas clona o elemento em
  // si, não o que está visível na janela), no iOS/Android via
  // captureRef do react-native-view-shot.
  async function captureNode(node) {
    if (Platform.OS === 'web') {
      const canvas = await html2canvas(node, { backgroundColor: '#FFFFFF' });
      return { dataUri: canvas.toDataURL('image/png', 0.95), width: canvas.width, height: canvas.height };
    }
    const base64 = await captureRef(node, { format: 'png', quality: 0.95, result: 'base64' });
    return { dataUri: `data:image/png;base64,${base64}`, width: null, height: null };
  }

  // Retoque de 23/09/2026: o Partilhar deixou de percorrer um calendário
  // por campo (era uma página por calendário) — passa a tirar UM único
  // screenshot do relatório condensado (`reportRef`, o `MonthlyReportCard`
  // montado escondido logo abaixo, sempre com proporção A4) e a
  // transformá-lo numa única página de PDF pronta para imprimir. Pedido
  // explícito da Tania depois de ver os filtros/carrossel em uso, com
  // uma imagem de referência de um layout "dashboard" em folha A4.
  async function handleShare() {
    setNote('');
    setSharing(true);
    try {
      await waitForPaint();
      const page = await captureNode(reportRef.current);

      if (Platform.OS === 'web') {
        // Página A4 verdadeira (210×297mm) sempre — o conteúdo do
        // relatório cresce com o número de campos (mais campos, cartão
        // mais alto), por isso a altura capturada nem sempre enche a
        // folha toda. Em vez de encolher/esticar o PDF à medida do
        // conteúdo (o que deixava de ser uma "folha A4" a sério),
        // pinta-se a página inteira com o tom de fundo do relatório e
        // encaixa-se a imagem a partir do topo, sem distorcer — sobra
        // só espaço em branco (bege) por baixo, igual ao fundo, nunca
        // uma emenda visível.
        const A4_W = 210;
        const A4_H = 297;
        const pdf = new jsPDF({ unit: 'mm', format: [A4_W, A4_H] });
        pdf.setFillColor(247, 245, 239); // REPORT.bg
        pdf.rect(0, 0, A4_W, A4_H, 'F');
        let w = A4_W;
        let h = A4_W * (page.height / page.width);
        if (h > A4_H) { h = A4_H; w = A4_H * (page.width / page.height); }
        const x = (A4_W - w) / 2;
        pdf.addImage(page.dataUri, 'PNG', x, 0, w, h);
        const blob = pdf.output('blob');
        // O Web Share API só consegue anexar ficheiros reais (não um
        // link), por isso tentamos partilhar o PDF diretamente; se o
        // browser não suportar partilha de ficheiros (a maioria dos
        // desktops), descarregamos o PDF e explicamos à pessoa como o
        // anexar à mão.
        const file = new File([blob], 'tucan-progresso.pdf', { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: t('calendar.shareTitle') });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'tucan-progresso.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setNote(t('calendar.shareDownloaded'));
        }
      } else {
        // iOS/Android: expo-print compõe a imagem num PDF de página
        // única em formato A4 (595×842pt a 72dpi); a folha de partilha
        // nativa que já tínhamos serve na mesma.
        const html = `<!doctype html><html><head><meta charset="utf-8" /><style>@page { size: A4; margin: 0; }</style></head><body style="margin:0;padding:0;"><img src="${page.dataUri}" style="width:100%;display:block;" /></body></html>`;
        const { uri } = await Print.printToFileAsync({ html, base64: false, width: 595, height: 842 });
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, { dialogTitle: t('calendar.shareTitle'), mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
        } else {
          setNote(t('calendar.shareError'));
        }
      }
    } catch (e) {
      console.error('CalendarShareScreen share', e);
      setNote(t('calendar.shareError'));
    } finally {
      setSharing(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>{t('calendar.title')}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>{t('common.close')}</Text></TouchableOpacity>
        )}
      </View>

      <View style={styles.carouselWrap} onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}>
        {carouselWidth > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {fieldOptions.map((o, i) => (
              <View key={o.id || 'global'} style={{ width: carouselWidth }}>
                <CalendarCard
                  ref={(el) => { pageRefs.current[i] = el; }}
                  field={o.fieldObj}
                  weeks={weeks}
                  daysByDate={daysByDate}
                  today={today}
                  customFields={customFields}
                  monthLabel={monthLabel}
                  loading={loading}
                  changeMonth={changeMonth}
                  liveCycle={liveCycle}
                  badgesThisMonth={badgesThisMonth}
                  daysInMonth={daysInMonth}
                  t={t}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {fieldOptions.length > 1 && (
        <>
          <TouchableOpacity style={styles.selectBox} onPress={() => setSelectOpen(true)}>
            <View style={styles.selectBoxLeft}>
              {filterField ? (
                <View style={[styles.selectDot, { backgroundColor: filterField.color }]} />
              ) : (
                <View style={styles.selectDotAll} />
              )}
              <Text style={styles.selectBoxText}>{filterField ? filterField.name : t('calendar.filterAll')}</Text>
            </View>
            <ChevronDownIcon color={COLORS.inkSoft} />
          </TouchableOpacity>
          <Text style={styles.swipeHint}>{t('calendar.swipeHint')}</Text>

          <Modal visible={selectOpen} transparent animationType="fade" onRequestClose={() => setSelectOpen(false)}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectOpen(false)}>
              <View style={styles.modalSheet}>
                {fieldOptions.map((o) => {
                  const active = o.id === (filterField ? filterField.id : null);
                  return (
                    <TouchableOpacity key={o.id || 'global'} style={styles.modalOption} onPress={() => selectOption(o.id)}>
                      {o.color ? (
                        <View style={[styles.selectDot, { backgroundColor: o.color }]} />
                      ) : (
                        <View style={styles.selectDotAll} />
                      )}
                      <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>{o.label}</Text>
                      {active && <CheckIcon color={COLORS.electro} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
        {sharing ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.shareBtnText}>{t('calendar.preparingShare')}</Text>
          </>
        ) : (
          <>
            <ShareIcon color="#fff" />
            <Text style={styles.shareBtnText}>{t('calendar.shareButton')}</Text>
          </>
        )}
      </TouchableOpacity>

      {!!note && <Text style={styles.note}>{note}</Text>}

      {/* Relatório condensado para o PDF — montado sempre, fora da área
          visível (ver styles.reportHidden), pronto a capturar a
          qualquer momento sem ter de trocar de filtro nem esperar
          repaint nenhum. Mesma técnica dos cartões do carrossel. */}
      <View style={styles.reportHidden} pointerEvents="none">
        <MonthlyReportCard
          ref={reportRef}
          customFields={customFields}
          weeks={weeks}
          daysByDate={daysByDate}
          today={today}
          monthLabel={monthLabel}
          liveCycle={liveCycle}
          badgesThisMonth={badgesThisMonth}
          daysInMonth={daysInMonth}
          loggedCount={loggedCount}
          t={t}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  h1: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.ink },
  closeText: { color: COLORS.electro, fontFamily: FONTS.bodyBold, fontSize: 13 },

  carouselWrap: { overflow: 'hidden' },

  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.line,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 16,
  },
  selectBoxLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectBoxText: { fontSize: 14, color: COLORS.ink, fontFamily: FONTS.bodyBold },
  selectDot: { width: 10, height: 10, borderRadius: 5 },
  selectDotAll: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.inkSoft },
  swipeHint: { fontSize: 11, color: COLORS.inkSoft, textAlign: 'center', marginTop: 8 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingVertical: 10, paddingHorizontal: 8, borderTopWidth: 2, borderColor: COLORS.line,
  },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10,
  },
  modalOptionText: { flex: 1, fontSize: 15, color: COLORS.ink, fontFamily: FONTS.bodyRegular },
  modalOptionTextActive: { fontFamily: FONTS.bodyBold },

  shareCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 2, borderColor: COLORS.line, padding: 18 },
  brandRow: { alignItems: 'center', marginBottom: 4 },
  brandText: { fontFamily: FONTS.display, fontSize: 15, color: COLORS.ink, letterSpacing: 0.5 },
  brandFieldText: { fontSize: 11.5, color: COLORS.inkSoft, fontFamily: FONTS.bodyBold, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 8, marginBottom: 14 },
  navBtn: { padding: 6 },
  monthLabel: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.ink, minWidth: 150, textAlign: 'center' },

  weekHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  weekHeaderText: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.inkSoft, fontFamily: FONTS.bodyBold },

  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: '78%', height: '78%', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  dayCircleFull: { backgroundColor: COLORS.sporting },
  dayCirclePartial: { backgroundColor: COLORS.mostarda },
  dayCircleNone: { borderColor: COLORS.line },
  dayCircleFuture: { borderColor: 'transparent' },
  dayNumber: { fontSize: 12, color: COLORS.inkSoft, fontFamily: FONTS.bodyRegular },
  dayNumberOnColor: { color: '#fff', fontFamily: FONTS.bodyBold },
  ringSvg: { position: 'absolute', top: 0, left: 0 },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginBottom: 4, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10.5, color: COLORS.inkSoft, textAlign: 'center' },

  statsRow: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 14 },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: FONTS.display, fontSize: 17, color: COLORS.ink },
  statLabel: { fontSize: 9.5, color: COLORS.inkSoft, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },

  shareBtn: { marginTop: 20, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.electro, borderRadius: 10, paddingVertical: 14 },
  shareBtnText: { color: '#fff', fontFamily: FONTS.display, fontSize: 14 },
  note: { color: COLORS.inkSoft, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 17, paddingHorizontal: 10 },

  // Relatório condensado (PDF) — sempre montado, sempre fora da área
  // visível do ecrã (ver comentário na chamada), nunca visto pela
  // pessoa a usar a app, só pelo captureNode/captureRef no Partilhar.
  reportHidden: { position: 'absolute', top: 0, left: -9999, width: REPORT_WIDTH },
  reportPage: {
    width: REPORT_WIDTH, backgroundColor: REPORT.bg, padding: 40,
  },
  reportHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  reportBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportBrandText: { fontFamily: FONTS.display, fontSize: 20, color: REPORT.ink, letterSpacing: 0.4 },
  reportHeaderRight: { alignItems: 'flex-end' },
  reportSubtitle: { fontSize: 11, color: REPORT.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: FONTS.bodyBold },
  reportMonthLabel: { fontSize: 15, color: REPORT.ink, fontFamily: FONTS.bodyBold, marginTop: 2 },
  reportDivider: { height: 1.5, backgroundColor: REPORT.line, marginTop: 16, marginBottom: 26 },

  reportBlockHeading: { fontSize: 11, color: REPORT.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: FONTS.bodyBold, marginBottom: 12 },

  reportHeroRow: { flexDirection: 'row', gap: 28 },
  reportHeroMain: { flex: 1.65 },
  reportWeekHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  reportWeekHeaderText: { flex: 1, textAlign: 'center', fontSize: 10.5, color: REPORT.inkSoft, fontFamily: FONTS.bodyBold },
  reportWeekRow: { flexDirection: 'row' },
  reportDayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  reportDayCircle: { width: '76%', height: '76%', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  reportDayCircleFull: { backgroundColor: COLORS.sporting },
  reportDayCirclePartial: { backgroundColor: COLORS.mostarda },
  reportDayCircleNone: { borderColor: REPORT.line },
  reportDayCircleFuture: { borderColor: 'transparent' },
  reportDayNumber: { fontSize: 11.5, color: REPORT.inkSoft, fontFamily: FONTS.bodyRegular },
  reportDayNumberOnColor: { color: '#fff', fontFamily: FONTS.bodyBold },

  reportLegendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14, flexWrap: 'wrap' },
  reportLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reportLegendDot: { width: 9, height: 9, borderRadius: 4.5 },
  reportLegendText: { fontSize: 10, color: REPORT.inkSoft },

  reportSidebar: { flex: 1, gap: 18 },
  reportSidebarRingBlock: { alignItems: 'center', backgroundColor: REPORT.card, borderRadius: 14, borderWidth: 1, borderColor: REPORT.line, paddingVertical: 18 },
  reportSidebarRingCaption: { fontSize: 10.5, color: REPORT.inkSoft, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 10, textAlign: 'center' },
  reportSidebarStat: { backgroundColor: REPORT.card, borderRadius: 14, borderWidth: 1, borderColor: REPORT.line, paddingVertical: 16, alignItems: 'center' },
  reportSidebarStatValue: { fontFamily: FONTS.display, fontSize: 20, color: REPORT.ink },
  reportSidebarStatLabel: { fontSize: 10, color: REPORT.inkSoft, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 4, textAlign: 'center' },

  reportRingWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  reportRingCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  reportRingTop: { fontFamily: FONTS.display, color: REPORT.ink },
  reportRingBottom: { fontFamily: FONTS.bodyBold, color: REPORT.inkSoft, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.2 },

  reportFieldsBlock: { marginTop: 30 },
  reportFieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  reportFieldCard: {
    width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: REPORT.card, borderRadius: 14, borderWidth: 1, borderColor: REPORT.line,
    paddingVertical: 12, paddingHorizontal: 14, gap: 10,
  },
  reportFieldCardLeft: { flexShrink: 1, gap: 4 },
  reportFieldNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reportFieldDot: { width: 10, height: 10, borderRadius: 5 },
  reportFieldName: { fontSize: 13, color: REPORT.ink, fontFamily: FONTS.bodyBold, flexShrink: 1 },
  reportFieldKind: { fontSize: 10, color: REPORT.inkSoft, textTransform: 'uppercase', letterSpacing: 0.3 },
});
