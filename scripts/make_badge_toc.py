"""
Gera o som de badge da TuCAN! — especificação v2, secção 5 (12/09/2026):
"um acento, não uma celebração". Duração alvo: 0,8 a 1,2s, sempre a
mesma para os 12 badges (sons diferentes criam hierarquia, o que a
especificação proíbe).

Composição:
  1. Assobio ascendente único, no mesmo timbre do coro do Perfect!
     (reaproveita a função `whistle()` de make_exotic_birds_call.py,
     mas com uma nota só em vez de uma frase inteira).
  2. Toque percussivo seco no impacto — "toc" de bico em madeira: dois
     harmónicos, decay rápido, sem tom sustentado.

Não é uma gravação real — síntese em Python/numpy, tal como os outros
sons da app (ver make_exotic_birds_call.py, make_toucan_call.py).

Corre com: python3 scripts/make_badge_toc.py
Produz:    assets/sounds/badge-toc.wav (mono, 16-bit, 44.1kHz)
"""
import numpy as np
import wave

SR = 44100


def env(n, attack=0.006, decay_curve=2.2):
    e = np.ones(n)
    a = max(1, int(attack * SR))
    e[:a] = np.linspace(0, 1, a) ** 1.3
    e *= np.linspace(1, 0, n) ** decay_curve
    return e


def whistle(duration, freqs, amp=1.0):
    """Assobio de pássaro: seno + um toque do 2º harmónico, tal como em
    make_exotic_birds_call.py — mesma identidade sonora do coro."""
    n = int(duration * SR)
    t = np.arange(n) / SR
    xp = np.linspace(0, duration, len(freqs))
    f = np.interp(t, xp, freqs)
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(phase) + 0.12 * np.sin(2 * phase)
    sig *= env(n, attack=0.01, decay_curve=1.6)
    return sig * amp


def toc(duration=0.09, f1=1400, f2=2600):
    """"Toc" seco de bico em madeira: dois harmónicos, decay muito
    rápido, sem tom sustentado — um acento, não uma nota."""
    n = int(duration * SR)
    t = np.arange(n) / SR
    sig = 0.75 * np.sin(2 * np.pi * f1 * t) + 0.35 * np.sin(2 * np.pi * f2 * t)
    sig *= env(n, attack=0.001, decay_curve=6.0)
    return sig


def place(canvas, sig, start_time):
    start = int(start_time * SR)
    end = start + len(sig)
    if end > len(canvas):
        canvas = np.concatenate([canvas, np.zeros(end - len(canvas))])
    canvas[start:end] += sig
    return canvas


def build():
    total = 1.0
    canvas = np.zeros(int(total * SR))
    # Assobio único, ascendente — entrada suave.
    canvas = place(canvas, whistle(0.30, [2200, 3400], amp=0.8), 0.00)
    # Toque percussivo no impacto (t ≈ 0,26s), a coincidir com o fim do
    # assobio, como um "pouso".
    canvas = place(canvas, toc(), 0.26)
    canvas = place(canvas, toc(duration=0.07, f1=1200, f2=2200), 0.34)  # segundo harmónico, mais leve

    peak = np.max(np.abs(canvas))
    if peak > 0:
        canvas = canvas / peak * 0.9
    return canvas


def save_wav(path, signal):
    data = np.clip(signal, -1, 1)
    pcm = (data * 32767).astype(np.int16)
    with wave.open(path, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())


if __name__ == '__main__':
    signal = build()
    save_wav('assets/sounds/badge-toc.wav', signal)
    print(f"Gerado assets/sounds/badge-toc.wav ({len(signal) / SR:.2f}s)")
