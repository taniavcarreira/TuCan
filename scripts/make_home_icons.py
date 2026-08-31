"""
Gera os icones usados quando alguem adiciona a TuCAN! ao ecra inicial do
telemovel (apple-touch-icon para iOS, icons do manifest.json para
Android/Chrome) — o mascote tucano "Perfect!" (ToucanAvatar.js, paleta
DEFAULT_AVATAR de src/utils/avatars.js) desenhado num fundo quadrado com a
cor de fundo da propria app (COLORS.bg, #121417), com uma margem à volta
para não ficar cortado pelo recorte automático de cantos redondos do
telemovel.

A geometria do SVG abaixo é uma cópia 1:1 dos <Path>/<Circle> de
ToucanAvatar.js (sem a pata/legs — muito finas, desaparecem em ícones
pequenos — e sem o olho animado, aqui sempre aberto) no viewBox nativo
227x310, recortada por baixo (o corpo/cauda vão até y=305, mas cortamos a
composição num quadrado centrado na "cara" do tucano, que é o que fica
reconhecível a 40x40px no ecrã de um telemóvel).
"""
import asyncio
from playwright.async_api import async_playwright

INK = "#14171A"
CREAM = "#F7F5EF"
TOP = "#E3AC2E"   # mostarda — DEFAULT_AVATAR.top
BASE = "#E8503A"  # coral — DEFAULT_AVATAR.base
BG = "#121417"    # COLORS.bg

# Mesma geometria de ToucanAvatar.js (corpo inteiro + cauda, viewBox nativo
# 227x310 — igual ao usado no Onboarding/Perfil), sem as pernas (traço fino
# demais, desaparece em ícones pequenos) e sem a animação do olho (fica
# sempre aberto).
TOUCAN_SVG = f"""
<svg viewBox="0 0 227 310" xmlns="http://www.w3.org/2000/svg">
  <path d="M146 59 C177 59 202 67 215 93 C222 110 219 135 212 155 C205 174 190 192 170 200 C150 207 122 208 103 203 C88 202 86 191 87 174 L89 146 C91 138 97 133 108 130 L140 130 C135 120 132 105 135 90 C137 78 142 66 146 59 Z" fill="{INK}"/>
  <g transform="translate(12,-26)">
    <path d="M73 203 C68 222 56 255 48 283 C45 293 46 297 51 300 C56 297 59 290 62 262 C65 235 71 212 75 203 Z" fill="{INK}"/>
    <path d="M73 203 C70 213 64 225 58 236 L71 236 C74 224 75 212 75 203 Z" fill="{BASE}"/>
    <path d="M77 203 C74 225 70 255 68 283 C67 295 71 303 79 305 C87 303 88 295 87 283 C86 255 84 225 80 203 Z" fill="{INK}"/>
    <path d="M77 203 C75 215 74 227 73 238 L86 238 C85 227 83 215 80 203 Z" fill="{BASE}"/>
    <path d="M83 203 C85 225 90 255 97 280 C101 292 104 297 107 298 C109 294 113 283 116 265 C119 245 108 220 87 203 Z" fill="{INK}"/>
    <path d="M83 203 C85 213 87 224 89 236 L100 236 C99 224 95 212 87 203 Z" fill="{BASE}"/>
  </g>
  <path d="M146,64.8 L151.3,65.2 L163.4,68.1 L167.7,70.6 L172.6,73.5 L175.0,76.4 L178.4,79.3 L180.3,82.2 L182.3,85.1 L183.7,88.0 L185.2,90.9 L186.1,93.8 L186.1,96.7 L187.1,99.6 L187.1,102.5 L187.1,105.4 L187.1,108.3 L187.1,111.2 L186.1,114.1 L185.6,116.9 L184.6,119.8 L183.2,122.7 L181.7,125.6 L179.3,128.5 L176.9,131.4 L175.0,134.3 L170.7,137.2 L166.8,140.1 L160.1,143.0 L156.3,143.9 L155.8,144.4 L152.3,144.7 L146,144.7 Z" fill="{CREAM}"/>
  <circle cx="147.7" cy="90.6" r="24.4" fill="#D3921A"/>
  <circle cx="157.8" cy="86.5" r="6.4" fill="{INK}"/>
  <path d="M153.5,84 C155.5,81.5 160,81.5 162,84" stroke="#40848E" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M28.6,74.4 L27.1,74.4 L25.2,76.4 L23.3,78.3 L21.3,80.2 L19.4,82.2 L17.5,84.1 L16,86 L14.6,88 L13.1,89.9 L12.2,91.8 L10.7,93.8 L9.7,95.7 L8.8,97.6 L7.8,99.6 L6.4,101.5 L5.9,103.4 L5.4,105.4 L4.4,107.3 L3.9,109.2 L3,111.2 L3,113.1 L2,115 L2,117 L2,118.9 L1.5,120.8 L1,122.7 L1,130 L28.6,130 Z" fill="{INK}"/>
  <path d="M146,58 L63,58 L58.5,59 L50.8,60.9 L45,62.8 L41.1,64.8 L37.3,66.7 L33.9,68.6 L31,70.6 L28.6,72.5 L28.6,95.2 L146,95.2 Z" fill="{TOP}"/>
  <path d="M28.6,95.2 L146,95.2 L146,130 L28.6,130 Z" fill="{BASE}"/>
</svg>
"""

def page_html(size, padding_frac):
    pad = size * padding_frac
    inner_h = size - 2 * pad
    inner_w = inner_h * (227 / 310)
    return f"""
<!doctype html><html><head><meta charset="utf-8">
<style>
  html,body {{ margin:0; padding:0; }}
  .canvas {{
    width:{size}px; height:{size}px; background:{BG};
    display:flex; align-items:center; justify-content:center;
  }}
  .canvas svg {{ width:{inner_w}px; height:{inner_h}px; display:block; }}
</style></head>
<body>
  <div class="canvas">{TOUCAN_SVG}</div>
</body></html>
"""

SIZES = [
    ("apple-touch-icon.png", 180, 0.10),
    ("icon-192.png", 192, 0.10),
    ("icon-512.png", 512, 0.10),
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        for filename, size, pad in SIZES:
            page = await browser.new_page(viewport={"width": size, "height": size})
            await page.set_content(page_html(size, pad))
            el = await page.query_selector(".canvas")
            await el.screenshot(path=f"/home/claude/project/vasy-app/public/{filename}")
            await page.close()
            print(f"wrote {filename} ({size}x{size})")
        await browser.close()

asyncio.run(main())
