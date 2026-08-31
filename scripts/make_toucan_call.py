"""
Gera um som sintetizado "tipo tucano exótico" para substituir o antigo
"pop" de confetis no momento Perfect! da app. Não é uma gravação real —
é uma síntese que tenta capturar o timbre rouco/nasal e o ritmo em
staccato de um grasnido de tucano (uma série curta de "crocs" roucos,
em vez de um assobio melódico de pássaro cantor).

Corre com: python3 scripts/make_toucan_call.py
Produz:    assets/sounds/perfect-toucan-call.wav (mono, 16-bit, 44.1kHz)
"""
import numpy as np
import wave
from scipy.signal import butter, sosfilt

SR = 44100
rng = np.random.default_rng(7)


def envelope(n, attack, decay, curve=2.2):
    """Ataque rápido + decaimento em curva (não linear) — dá o formato
    percussivo de um "croc" em vez de um tom sustentado."""
    env = np.ones(n)
    a = max(1, int(attack * SR))
    d = max(1, int(decay * SR))
    env[:a] = np.linspace(0, 1, a) ** 1.5
    tail = min(d, n)
    env[-tail:] *= np.linspace(1, 0, tail) ** curve
    return env


def bandpass(sig, low, high, order=4):
    sos = butter(order, [low, high], btype='band', fs=SR, output='sos')
    return sosfilt(sos, sig)


def croak(duration, f0_start, f0_end, tremor_hz=55, tremor_depth=0.35, noise_click=True):
    """Uma única sílaba do grasnido: varrimento de tom descendente,
    textura buzzy (soma de harmónicos com "flutter" de amplitude, que dá
    o lado rouco/áspero), realçada numa banda nasal."""
    n = int(duration * SR)
    t = np.arange(n) / SR

    # Glide de frequência descendente (o "croc" típico de tucano cai de tom).
    f0 = np.linspace(f0_start, f0_end, n)
    phase = 2 * np.pi * np.cumsum(f0) / SR

    # Onda buzzy: soma de harmónicos com amplitude decrescente (~dente
    # de serra suavizado), mais áspera do que um seno puro.
    sig = np.zeros(n)
    for k, amp in zip(range(1, 7), [1.0, 0.55, 0.38, 0.24, 0.15, 0.08]):
        sig += amp * np.sin(k * phase)
    sig /= np.sum([1.0, 0.55, 0.38, 0.24, 0.15, 0.08])

    # "Tremor" de amplitude — a rugosidade rouca característica de um
    # grasnido, não um tom limpo de pássaro cantor.
    tremor = 1 + tremor_depth * np.sin(2 * np.pi * tremor_hz * t)
    sig *= tremor

    # Um pouco de ruído misturado dá a textura "rasposa" do grasnido.
    sig += 0.06 * rng.standard_normal(n)

    sig *= envelope(n, attack=0.006, decay=duration * 0.75)

    # Realce nasal/beak: a energia de um grasnido de tucano concentra-se
    # numa banda relativamente estreita, não é broadband.
    sig = bandpass(sig, max(200, f0_end * 0.7), min(SR / 2 - 100, f0_start * 2.6))

    if noise_click:
        click_n = int(0.006 * SR)
        click = 0.5 * rng.standard_normal(click_n) * np.linspace(1, 0, click_n) ** 0.5
        sig[:click_n] += click

    return sig


def build_call():
    # Três "crocs" em staccato, o segundo ligeiramente mais agudo (como
    # se o pássaro reforçasse a chamada), o terceiro mais grave e um
    # pouco mais longo a fechar a frase — imita o ritmo irregular real
    # de um grasnido de tucano em vez de uma repetição mecânica.
    syllables = [
        croak(0.14, f0_start=1050, f0_end=620, tremor_hz=58),
        croak(0.12, f0_start=1200, f0_end=700, tremor_hz=62),
        croak(0.20, f0_start=900, f0_end=480, tremor_hz=50, tremor_depth=0.45),
    ]
    gaps = [0.05, 0.07]

    out = syllables[0]
    for gap, syl in zip(gaps, syllables[1:]):
        out = np.concatenate([out, np.zeros(int(gap * SR)), syl])

    # Normaliza com uma pequena margem para não saturar.
    out = out / np.max(np.abs(out)) * 0.9
    return out


def write_wav(path, sig):
    pcm = np.clip(sig * 32767, -32768, 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    call = build_call()
    out_path = 'assets/sounds/perfect-toucan-call.wav'
    write_wav(out_path, call)
    print(f'Escrito {out_path} — {len(call) / SR:.2f}s')
