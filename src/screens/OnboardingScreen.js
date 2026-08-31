import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import ToucanAvatar from '../components/ToucanAvatar';
import { DEFAULT_AVATAR } from '../utils/avatars';

const TOTAL = 5;

// Small line/fill icons used inside the feature-list swatches below —
// ported 1:1 from the marketing tutorial (marketing/tucan-tutorial.html)
// so the two stay visually identical.
function MiniIcon({ type, color = COLORS.bg }) {
  switch (type) {
    case 'check':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}><Path d="M5 13l4 4L19 7" /></Svg>;
    case 'star':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill={color}><Path d="M12 2l2.9 7.6L22 12l-7.1 2.4L12 22l-2.9-7.6L2 12l7.1-2.4z" /></Svg>;
    case 'sun':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Circle cx="12" cy="12" r="4" /><Path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" /></Svg>;
    case 'bolt':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}><Path d="M12 20V10M12 10L6 4M12 10l6-6" /></Svg>;
    case 'grid':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Rect x="3" y="4" width="18" height="17" rx="2" /><Path d="M3 10h18" /></Svg>;
    case 'wave':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Path d="M2 12c3-6 5 6 8 0s5 6 8 0 4-4 4-4" /></Svg>;
    case 'trend':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Path d="M3 17l5-6 4 4 8-9" /></Svg>;
    case 'chartAxis':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Path d="M3 3v18h18" /><Path d="M7 15l3-4 3 3 5-7" /></Svg>;
    case 'calendar':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Rect x="3" y="4" width="18" height="17" rx="2" /><Path d="M8 2v4M16 2v4" /></Svg>;
    case 'bars':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Path d="M4 20V10M11 20V4M18 20v-7" /></Svg>;
    case 'list':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></Svg>;
    case 'gridSmall':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Rect x="4" y="4" width="7" height="7" rx="1.5" /><Rect x="13" y="4" width="7" height="7" rx="1.5" /><Rect x="4" y="13" width="7" height="7" rx="1.5" /></Svg>;
    case 'lines':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Path d="M4 6h16M4 12h16M4 18h10" /></Svg>;
    case 'sparkle':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Path d="M12 2l2.4 5 5.6.5-4.2 3.8 1.3 5.5L12 14l-5.1 2.8 1.3-5.5L4 7.5l5.6-.5z" /></Svg>;
    case 'reorder':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}><Path d="M12 19V5M6 11l6-6 6 6" /></Svg>;
    case 'dumbbell':
      return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Path d="M6.5 6.5l11 11M4 9l3-3M20 15l-3 3M2 20l4-4M18 6l4-2M17 7l3-3M4 20l2-4" /></Svg>;
    default:
      return null;
  }
}

function Eyebrow({ label }) {
  return (
    <View style={styles.eyebrow}>
      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={COLORS.electro} strokeWidth={2.4}>
        <Circle cx="12" cy="12" r="9" />
        <Path d="M8 12l3 3 5-6" />
      </Svg>
      <Text style={styles.eyebrowText}>{label}</Text>
    </View>
  );
}

function FeatureItem({ bg, border, icon, iconColor, title, sub }) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.swatch, { backgroundColor: bg }, border && styles.swatchBorder]}>
        <MiniIcon type={icon} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSub}>{sub}</Text>
      </View>
    </View>
  );
}

function Tag({ label }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function LockChip({ symbol, symbolColor, label }) {
  return (
    <View style={styles.lockChip}>
      <Text style={[styles.lockSymbol, { color: symbolColor }]}>{symbol}</Text>
      <Text style={styles.lockLabel}>{label}</Text>
      <Text style={styles.lockIcon}>🔒</Text>
    </View>
  );
}

function PitchSlide() {
  return (
    <View style={styles.pitchWrap}>
      <View style={styles.badge}>
        <ToucanAvatar hat="none" top={DEFAULT_AVATAR.top} base={DEFAULT_AVATAR.base} leg={DEFAULT_AVATAR.leg} size={78} />
      </View>
      <Text style={styles.pitchTitle}>TuCAN<Text style={{ color: COLORS.mostarda }}>!</Text></Text>
      <Text style={styles.pitchSlogan}>Yes. Tu podes.</Text>
      <Text style={styles.pitchBody}>
        Mais do que uma app de hábitos com gráficos bonitos, a TuCAN é o bater de asas que te faz voltar diariamente — mesmo depois da segunda semana.
        {'\n\n'}
        É a pergunta simples que te fazes todos os dias:{' '}
        <Text style={styles.pitchBodyStrong}>hoje, cumpri o que prometi a mim própria?</Text>{' '}
        Sem culpa quando um dia corre mal. Sem sermões. Só o teu progresso, campo a campo — e um tucano genuinamente convencido a aplaudir-te quando acertas em cheio.
      </Text>
      <View style={styles.tagsRow}>
        <Tag label="Hábitos diários" />
        <Tag label="Sem streaks a castigar" />
        <Tag label="Um tucano orgulhoso" />
      </View>
    </View>
  );
}

function HojeSlide() {
  return (
    <View>
      <Eyebrow label="ABA 1 DE 3" />
      <Text style={styles.h2}>Hoje</Text>
      <Text style={styles.lede}>O check-in do dia. Abres, marcas o que fizeste, fechas. <Text style={styles.ledeStrong}>30 segundos, no máximo.</Text></Text>
      <View style={styles.featureList}>
        <FeatureItem bg={COLORS.agua} icon="sun" iconColor={COLORS.bg} title="ProudOfMe" sub="Marca sempre que fizeres algo só por ti — vale 75% do dia." />
        <FeatureItem bg={COLORS.mostarda} icon="star" iconColor={COLORS.bg} title="Perfect!" sub="Quando o dia correu redondinho — os outros 25%, e o confeti dispara." />
        <FeatureItem bg={COLORS.c5} icon="check" iconColor={COLORS.ink} title="Até 10 campos teus" sub='Sim/não simples, ou contagens com meta própria — "60 min", "2 litros".' />
        <FeatureItem bg={COLORS.c9} icon="bolt" iconColor={COLORS.ink} title="Energia, de 1 a 5" sub="Um número livre. Sem certo, sem errado — só um registo honesto." />
      </View>
      <Text style={styles.footnote}>Chegaste a 100%? Confetis, som, e o tucano voa até ao ramo e pisca-te o olho. A sério.</Text>
    </View>
  );
}

function SemanaSlide() {
  return (
    <View>
      <Eyebrow label="ABA 2 DE 3" />
      <Text style={styles.h2}>Semana</Text>
      <Text style={styles.lede}>A vista de longe. <Text style={styles.ledeStrong}>Um padrão vale mais do que um dia perfeito isolado.</Text></Text>
      <View style={styles.featureList}>
        <FeatureItem bg={COLORS.card} border icon="grid" iconColor={COLORS.ink} title="Grelha de 7 dias" sub="Todos os campos, todos os dias, num relance só." />
        <FeatureItem bg={COLORS.electro} icon="wave" iconColor={COLORS.bg} title="Corrige em atraso" sub="Esqueceste-te de marcar ontem? Toca no dia e resolve." />
        <FeatureItem bg={COLORS.c5} icon="trend" iconColor={COLORS.ink} title="Onda semanal + resumo" sub="Tendência automática: ProudOfMe, energia média, totais por campo." />
        <FeatureItem bg={COLORS.agua} icon="chartAxis" iconColor={COLORS.bg} title="Tendência mensal & anual" sub="Um acordeão para quando quiseres olhar mais longe." />
      </View>
      <Text style={styles.footnote}>Uma semana mais fraca não apaga as outras — o padrão ao longo dos meses é que conta.</Text>
    </View>
  );
}

function TreinoSlide() {
  return (
    <View>
      <Eyebrow label="ABA 3 DE 3" />
      <Text style={styles.h2}>Treino</Text>
      <Text style={styles.lede}>Fora dos campos diários — o registo de tudo o que suaste.</Text>
      <View style={styles.featureList}>
        <FeatureItem bg={COLORS.sporting} icon="calendar" iconColor={COLORS.ink} title="Data, atividade, duração, intensidade" sub='RPM, BodyPump, Hidroginástica, Step, Elíptica, Bicicleta, Passadeira, ou "Outro".' />
        <FeatureItem bg={COLORS.c9} icon="bars" iconColor={COLORS.ink} title="Gráfico por semana, mês ou ano" sub="A tua constância, em barras, sem teres de somar nada." />
        <FeatureItem bg={COLORS.card} border icon="list" iconColor={COLORS.ink} title="Histórico dos últimos 30" sub="Revê ou apaga qualquer sessão registada." />
      </View>
      <Text style={styles.footnote}>Fora da grelha dos hábitos de propósito — o exercício tem o seu próprio ritmo.</Text>
    </View>
  );
}

function ConfigSlide() {
  return (
    <View>
      <Eyebrow label="A ESPINHA DORSAL" />
      <Text style={styles.h2}>Configurações</Text>
      <Text style={styles.lede}>Aqui é onde a TuCAN! deixa de ser genérica e passa a ser <Text style={styles.ledeStrong}>tua</Text>.</Text>
      <View style={styles.lockRow}>
        <LockChip symbol="★" symbolColor={COLORS.mostarda} label="Perfect!" />
        <LockChip symbol="✨" symbolColor={COLORS.agua} label="ProudOfMe" />
      </View>
      <View style={styles.featureList}>
        <FeatureItem bg={COLORS.card} border icon="gridSmall" iconColor={COLORS.ink} title="Até 10 campos próprios" sub="Estes dois ficam sempre — o resto constróis tu." />
        <FeatureItem bg={COLORS.electro} icon="lines" iconColor={COLORS.bg} title="Nome, tipo, cor e ícone" sub='Sim/não, ou contagem com meta e unidade (ex.: "min", "litros").' />
        <FeatureItem bg={COLORS.c9} icon="sparkle" iconColor={COLORS.ink} title="Cor e ícone únicos por campo" sub="Cada um só pode pertencer a um campo — para nunca te confundires a ler." />
        <FeatureItem bg={COLORS.c5} icon="reorder" iconColor={COLORS.ink} title="Reordena, edita, apaga" sub="Quando quiseres. A app segue-te a ti, não o contrário." />
      </View>
    </View>
  );
}

const SLIDES = [PitchSlide, HojeSlide, SemanaSlide, TreinoSlide, ConfigSlide];

// Shown every time the app opens without an active session — right
// before AuthScreen (see App.js's LoggedOutFlow). Purely local state:
// there is deliberately no "don't show again" flag, so it reappears
// after every sign-out too (explicit product decision, 31/08/2026).
export default function OnboardingScreen({ onDone }) {
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const isLast = i === TOTAL - 1;
  const Slide = SLIDES[i];

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [i]);

  function next() {
    if (isLast) { onDone(); return; }
    setI((v) => Math.min(TOTAL - 1, v + 1));
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <View style={styles.topRow}>
          <Text style={styles.brand}>TuCAN!</Text>
          <Text style={styles.stepLabel}>PASSO {i + 1}/{TOTAL}</Text>
        </View>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL }).map((_, di) => (
            <View key={di} style={[styles.dot, di < i && styles.dotDone, di === i && styles.dotActive]} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.stage} contentContainerStyle={styles.stageContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fade }}>
          <Slide />
        </Animated.View>
      </ScrollView>

      <View style={styles.navbar}>
        {!isLast ? (
          <TouchableOpacity onPress={onDone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 1 }} />}
        <TouchableOpacity style={[styles.nextBtn, isLast && styles.nextBtnFinal]} onPress={next}>
          <Text style={[styles.nextText, isLast && styles.nextTextFinal]}>{isLast ? 'Entrar' : 'Avançar'}</Text>
          <Text style={[styles.nextArrow, isLast && styles.nextTextFinal]}>{isLast ? '↵' : '→'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  topbar: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: FONTS.display, fontSize: 16, color: COLORS.ink },
  stepLabel: { fontFamily: FONTS.mono, fontSize: 10.5, color: COLORS.inkSoft, letterSpacing: 0.6 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.line },
  dotDone: { backgroundColor: COLORS.c5 },
  dotActive: { backgroundColor: COLORS.mostarda },

  stage: { flex: 1 },
  stageContent: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 24 },

  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 5, paddingLeft: 8, paddingRight: 11, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.line, marginBottom: 16 },
  eyebrowText: { fontSize: 11, fontFamily: FONTS.bodyBold, letterSpacing: 0.3, color: COLORS.inkSoft },

  h2: { fontFamily: FONTS.display, fontSize: 27, color: COLORS.ink, marginBottom: 10, lineHeight: 30 },
  lede: { fontSize: 13.5, lineHeight: 20, color: COLORS.inkSoft, fontFamily: FONTS.bodyRegular, marginBottom: 18 },
  ledeStrong: { color: COLORS.ink, fontFamily: FONTS.bodyBold },

  featureList: { gap: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 10, padding: 13 },
  swatch: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  swatchBorder: { borderWidth: 1.5, borderColor: COLORS.line },
  featureTitle: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: COLORS.ink, marginBottom: 2 },
  featureSub: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.inkSoft, lineHeight: 17 },

  footnote: { marginTop: 16, fontSize: 12, color: COLORS.inkSoft, lineHeight: 18, textAlign: 'center', fontFamily: FONTS.bodyRegular },

  pitchWrap: { alignItems: 'center', paddingTop: 6 },
  badge: { width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.agua, borderWidth: 2, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pitchTitle: { fontFamily: FONTS.display, fontSize: 40, color: COLORS.ink, textAlign: 'center' },
  pitchSlogan: { fontFamily: FONTS.display, fontSize: 18, color: COLORS.mostarda, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  pitchBody: { fontSize: 14, lineHeight: 21, color: COLORS.inkSoft, fontFamily: FONTS.bodyRegular, marginTop: 14, textAlign: 'left' },
  pitchBodyStrong: { color: COLORS.ink, fontFamily: FONTS.bodyBold },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16, justifyContent: 'center' },
  tag: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.line },
  tagText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: COLORS.inkSoft },

  lockRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  lockChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.line, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 11 },
  lockSymbol: { fontSize: 13 },
  lockLabel: { fontSize: 12, fontFamily: FONTS.bodyBold, color: COLORS.ink, flex: 1 },
  lockIcon: { fontSize: 10, opacity: 0.6 },

  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: COLORS.card, borderTopWidth: 2, borderTopColor: COLORS.line },
  skipText: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: COLORS.inkSoft },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.sporting, borderRadius: 9, paddingVertical: 12, paddingHorizontal: 18 },
  nextBtnFinal: { backgroundColor: COLORS.mostarda },
  nextText: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: '#fff' },
  nextTextFinal: { color: COLORS.bg },
  nextArrow: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#fff' },
});
