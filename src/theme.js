// Design tokens ported 1:1 from the web version's CSS custom properties.
export const COLORS = {
  bg: '#121417',
  card: '#1B1E22',
  line: '#3A3F45',
  ink: '#F7F5EF',
  inkSoft: '#B7BBAF',

  c1: '#C1552B', // terracota
  c2: '#566331', // verde tropa
  c3: '#0E8F58', // verde esmeralda
  c4: '#E3AC2E', // amarelo mostarda
  c5: '#0F847F', // verde bali
  c6: '#16702F', // verde sporting
  c7: '#F3E8AE', // amarelo água
  c8: '#29D3FF', // azul electro
  c9: '#E8503A', // vermelho coral
  c10: '#7C5CFF', // roxo violeta

  sporting: '#16702F',
  electro: '#29D3FF',
  agua: '#F3E8AE',
  mostarda: '#E3AC2E',
};

// Colors that need dark text on top of them for contrast (light backgrounds).
export const DARK_TEXT_COLORS = [COLORS.c4, COLORS.c7];
export function textColorFor(color) {
  return DARK_TEXT_COLORS.includes(color) ? COLORS.bg : '#fff';
}

export const FONTS = {
  display: 'ArchivoBlack_400Regular', // headings
  body: 'Archivo_600SemiBold',        // default body weight
  bodyRegular: 'Archivo_400Regular',
  bodyBold: 'Archivo_700Bold',
  mono: 'IBMPlexMono_600SemiBold',
  monoRegular: 'IBMPlexMono_400Regular',
};

export const RADIUS = 10;
export const NAV_HEIGHT = 74;
