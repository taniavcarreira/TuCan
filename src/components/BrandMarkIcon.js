import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS } from '../theme';

// A marca da TuCAN! — o pin de duas cores (mostarda em baixo, coral em
// cima) com o "olho" escuro no meio, usado no cabeçalho do tutorial
// (marketing/tucan-tutorial.html, canto superior esquerdo do passo 1/5)
// e agora reutilizado como favicon (assets/images/favicon.png, gerado a
// partir deste mesmo desenho) e como ícone de "a minha conta" na topbar
// da app (ver App.js). Geometria idêntica ao SVG do tutorial — manter os
// dois em sincronia se o desenho voltar a mudar.
// `rotate` gira o desenho (graus, sentido horário) à volta do seu
// próprio centro — 0 é a orientação original do tutorial (pin, ponta
// para baixo). Por omissão fica a 180° (de cabeça para baixo), que era
// o resultado do "flip vertical" pedido inicialmente — como o desenho é
// simétrico esquerda-direita, um flip vertical e uma rotação de 180°
// dão exatamente o mesmo resultado visual. Cada sítio onde o ícone
// aparece pode escolher a sua própria rotação (ver AuthScreen.js e
// App.js para os valores em uso).
export default function BrandMarkIcon({ size = 20, bg = COLORS.bg, rotate = 180 }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={rotate ? { transform: [{ rotate: `${rotate}deg` }] } : undefined}
    >
      <Path
        d="M12 3c4 0 7 2.8 7 7 0 3.6-2.2 6-4.3 7.6L12 21l-2.7-3.4C7.2 16 5 13.6 5 10c0-4.2 3-7 7-7z"
        fill={COLORS.mostarda}
      />
      <Path
        d="M12 3c4 0 7 2.8 7 7 0 1-.15 1.9-.45 2.75C16.7 10.2 14.6 8.6 12 8.6c-2.6 0-4.7 1.6-6.55 4.15C5.15 11.9 5 11 5 10c0-4.2 3-7 7-7z"
        fill={COLORS.c9}
      />
      <Circle cx="12" cy="9.3" r="1.15" fill={bg} />
    </Svg>
  );
}
