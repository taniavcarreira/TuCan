"""
Gera um som sintetizado "coro de pássaros exóticos" para o momento
Perfect! da app.

Histórico: a primeira tentativa (grasnido rouco de tucano) não agradou
("não gosto, quero um som de pássaros exóticos"); a segunda (coro de
pássaros, ~0.85s) agradou mas era demasiado curta ("quero um som de
5 segundos") — esta versão estica a mesma ideia para ~5s, preenchendo o
tempo com várias "vozes" a chamar e responder ao longo da frase, em vez
de só esticar silêncio.

Não é uma gravação real (este ambiente não tem acesso a bibliotecas de
som na internet) — é síntese em Python/numpy: tons quase puros
(assobios) com trinado/vibrato, não ruído bruto.

Corre com: python3 scripts/make_exotic_birds_call.py
Produz:    assets/sounds/perfect-exotic-birds.wav (mono, 16-bit, 44.1kHz)
"""
import numpy as np
import wave

SR = 44100
DURATION = 5.0
rng = np.random.default_rng(11)


def env(n, attack=0.008, decay_curve=2.0):
    e = np.ones(n)
    a = max(1, int(attack * SR))
    e[:a] = np.linspace(0, 1, a) ** 1.3
    e *= np.linspace(1, 0, n) ** decay_curve
    return e


def whistle(duration, freqs, vibrato_hz=0, vibrato_depth=0, amp=1.0):
    """Um assobio de pássaro: tom quase puro (seno + um toque do 2º
    harmónico para não soar sintético a mais) que percorre os pontos de
    `freqs` (lista de Hz, interpolados ao longo da duração), com
    vibrato/trinado opcional."""
    n = int(duration * SR)
    t = np.arange(n) / SR
    xp = np.linspace(0, duration, len(freqs))
    f = np.interp(t, xp, freqs)
    if vibrato_hz:
        f = f + vibrato_depth * np.sin(2 * np.pi * vibrato_hz * t)
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(phase) + 0.12 * np.sin(2 * phase)
    sig *= env(n)
    return sig * amp


def place(canvas, sig, start_time):
    start = int(start_time * SR)
    end = start + len(sig)
    if end > len(canvas):
        canvas = np.concatenate([canvas, np.zeros(end - len(canvas))])
    canvas[start:end] += sig
    return canvas


# Um pequeno "elenco" de espécies/timbres distintos, para as vozes de
# preenchimento ao longo dos 5s soarem como pássaros diferentes, não a
# mesma nota repetida.
def species_a(t0, canvas):  # agudo, brilhante, sobe-desce rápido
    canvas = place(canvas, whistle(0.09, [3400, 4400]), t0)
    canvas = place(canvas, whistle(0.08, [4200, 3200]), t0 + 0.11)
    return canvas


def species_b(t0, canvas):  # médio, trinado tremido
    canvas = place(canvas, whistle(0.22, [2400, 3000, 2600], vibrato_hz=30, vibrato_depth=160), t0)
    return canvas


def species_c(t0, canvas):  # grave, frase curta em três notas (tipo bem-te-vi)
    canvas = place(canvas, whistle(0.10, [1700, 2300]), t0)
    canvas = place(canvas, whistle(0.10, [2300, 1900]), t0 + 0.13)
    canvas = place(canvas, whistle(0.12, [1900, 2500]), t0 + 0.27)
    return canvas


def species_d(t0, canvas):  # muito agudo, floreado curto tipo "sparkle"
    canvas = place(canvas, whistle(0.16, [4800, 5400, 4600], vibrato_hz=48, vibrato_depth=260, amp=0.85), t0)
    return canvas


def build_call():
    canvas = np.zeros(int((DURATION + 0.3) * SR))

    # --- Abertura: a mesma frase "de assinatura" da versão anterior,
    # reconhecível, para ainda soar como a mesma identidade sonora.
    canvas = place(canvas, whistle(0.11, [1800, 2600]), 0.00)
    canvas = place(canvas, whistle(0.09, [2400, 3100]), 0.13)
    canvas = place(canvas, whistle(0.20, [3400, 4200, 3800], vibrato_hz=32, vibrato_depth=180), 0.24)
    canvas = place(canvas, whistle(0.10, [2200, 1600]), 0.50)
    canvas = place(canvas, whistle(0.08, [2000, 2800]), 0.60)

    # --- Meio: várias vozes diferentes a entrar e a responder-se ao
    # longo do tempo, com espaçamento levemente aleatório (mas
    # reprodutível, seed fixa) para soar orgânico em vez de mecânico —
    # cobre de ~0.85s a ~4.3s.
    species = [species_a, species_b, species_c, species_d]
    t = 0.85
    order = []
    last = None
    while t < 4.3:
        choices = [s for s in species if s is not last]
        sp = choices[rng.integers(0, len(choices))]
        canvas = sp(t, canvas)
        order.append(sp.__name__)
        last = sp
        t += 0.34 + rng.random() * 0.30  # intervalo entre 0.34s e 0.64s

    # --- Fecho: floreado final agudo, o "selo" brilhante da recompensa,
    # a terminar mesmo perto dos 5s.
    canvas = place(canvas, whistle(0.14, [4600, 5200, 4400], vibrato_hz=45, vibrato_depth=250, amp=0.9), 4.55)
    canvas = place(canvas, whistle(0.10, [5000, 4200], amp=0.7), 4.72)

    # Fundo muito discreto de "ambiente exterior" ao longo de toda a
    # duração — quase impercetível, só para não soar a silêncio digital
    # entre as chamadas.
    canvas += 0.010 * rng.standard_normal(len(canvas))

    # Corta para exatamente 5.0s.
    total = int(DURATION * SR)
    canvas = canvas[:total]
    if len(canvas) < total:
        canvas = np.concatenate([canvas, np.zeros(total - len(canvas))])

    canvas = canvas / np.max(np.abs(canvas)) * 0.9
    return canvas


def write_wav(path, sig):
    pcm = np.clip(sig * 32767, -32768, 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    call = build_call()
    out_path = 'assets/sounds/perfect-exotic-birds.wav'
    write_wav(out_path, call)
    print(f'Escrito {out_path} — {len(call) / SR:.2f}s')
