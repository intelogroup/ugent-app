"""Programmatic EKG/rhythm strip generator for USMLE questions.
Usage: python3 scripts/generate-ekg.py <output_path> <rhythm_type> [--labeled/--unlabeled]

Rhythm types:
  normal_sinus, sinus_bradycardia, sinus_tachycardia,
  atrial_fibrillation, atrial_flutter, ventricular_tachycardia,
  ventricular_fibrillation, stemi_anterior, stemi_inferior,
  av_block_first, av_block_mobitz1, av_block_mobitz2, av_block_third,
  wpw, long_qt, hyperkalemia, hypokalemia
"""
import sys
import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

OUTPUT_PATH = sys.argv[1]
RHYTHM = sys.argv[2] if len(sys.argv) > 2 else 'normal_sinus'
LABELED = '--unlabeled' not in sys.argv

DPI = 150
WIDTH_INCHES = 8
HEIGHT_INCHES = 3
DURATION_SEC = 10
SAMPLE_RATE = 500

def generate_ecg_signal(t, rhythm):
    """Generate ECG voltage signal for given rhythm type."""
    def pqrst(t_arr, offset, hr):
        """Single heartbeat PQRS-T complex template at given offset."""
        cycle = 60 / hr
        phase = ((t_arr - offset) % cycle) / cycle
        sig = np.zeros_like(phase)
        # P wave (atrial depolarization)
        sig += 0.15 * np.exp(-((phase - 0.1) ** 2) / (2 * 0.008 ** 2))
        # Q wave
        sig -= 0.1 * np.exp(-((phase - 0.18) ** 2) / (2 * 0.005 ** 2))
        # R wave
        sig += 0.8 * np.exp(-((phase - 0.22) ** 2) / (2 * 0.01 ** 2))
        # S wave
        sig -= 0.3 * np.exp(-((phase - 0.26) ** 2) / (2 * 0.01 ** 2))
        # T wave (ventricular repolarization)
        sig += 0.25 * np.exp(-((phase - 0.42) ** 2) / (2 * 0.03 ** 2))
        # U wave (subtle)
        sig += 0.03 * np.exp(-((phase - 0.55) ** 2) / (2 * 0.02 ** 2))
        return sig

    sig = np.zeros_like(t)
    np.random.seed(42)

    if rhythm == 'normal_sinus':
        hr = 72
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            sig += pqrst(t, (i * 60 / hr) + np.random.normal(0, 0.01), hr)
        sig += np.random.normal(0, 0.015, len(t))

    elif rhythm == 'sinus_bradycardia':
        hr = 48
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            sig += pqrst(t, (i * 60 / hr), hr)
        sig += np.random.normal(0, 0.015, len(t))

    elif rhythm == 'sinus_tachycardia':
        hr = 130
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            sig += pqrst(t, (i * 60 / hr), hr)
        sig += np.random.normal(0, 0.015, len(t))

    elif rhythm == 'atrial_fibrillation':
        hr_irregular = np.random.uniform(80, 150, size=int(DURATION_SEC * 2) + 5)
        cumulative = np.cumsum(60 / hr_irregular)
        for offset in cumulative:
            sig += pqrst(t, offset, 90) * 0.8
        # Irregular baseline noise (no organized P waves)
        sig += 0.08 * np.sin(2 * np.pi * 8 * t) * np.random.uniform(0.5, 1.5, len(t))
        sig += np.random.normal(0, 0.025, len(t))

    elif rhythm == 'atrial_flutter':
        # Sawtooth flutter waves at ~300 bpm
        flutter = 0.12 * np.abs(np.sin(np.pi * 5 * t + 0.5)) - 0.06
        hr = 75  # ventricular response
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            sig += pqrst(t, (i * 60 / hr), hr)
        sig += flutter
        sig += np.random.normal(0, 0.015, len(t))

    elif rhythm == 'ventricular_tachycardia':
        # Wide, bizarre QRS complexes without P waves
        hr = 170
        cycle = 60 / hr
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            offset = i * cycle
            phase = ((t - offset) % cycle) / cycle
            # Wide QRS-like complex
            sig += 0.6 * np.exp(-((phase - 0.15) ** 2) / (2 * 0.04 ** 2))
            sig -= 0.4 * np.exp(-((phase - 0.35) ** 2) / (2 * 0.04 ** 2))
        sig += np.random.normal(0, 0.03, len(t))

    elif rhythm == 'ventricular_fibrillation':
        # Chaotic, undulating waveform
        sig = 0.3 * np.sin(2 * np.pi * 4 * t + np.sin(2 * np.pi * 0.5 * t))
        sig += 0.2 * np.sin(2 * np.pi * 8 * t + np.cos(2 * np.pi * 1.2 * t))
        sig += np.random.normal(0, 0.08, len(t))

    elif rhythm == 'stemi_anterior':
        # ST elevation in V1-V4 leads simulation
        hr = 78
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            offset = i * 60 / hr
            cycle = 60 / hr
            phase = ((t - offset) % cycle) / cycle
            # Normal QRS
            sig += 0.6 * np.exp(-((phase - 0.22) ** 2) / (2 * 0.01 ** 2))
            sig -= 0.2 * np.exp(-((phase - 0.26) ** 2) / (2 * 0.01 ** 2))
            # Elevated ST segment
            st_mask = (phase >= 0.28) & (phase <= 0.42)
            sig[st_mask] += 0.35
            # T wave merged into ST
            sig += 0.2 * np.exp(-((phase - 0.48) ** 2) / (2 * 0.02 ** 2))
        sig += np.random.normal(0, 0.015, len(t))

    elif rhythm == 'stemi_inferior':
        # ST elevation in II, III, aVF
        hr = 75
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            offset = i * 60 / hr
            cycle = 60 / hr
            phase = ((t - offset) % cycle) / cycle
            sig += 0.55 * np.exp(-((phase - 0.22) ** 2) / (2 * 0.01 ** 2))
            sig -= 0.15 * np.exp(-((phase - 0.26) ** 2) / (2 * 0.01 ** 2))
            st_mask = (phase >= 0.28) & (phase <= 0.42)
            sig[st_mask] += 0.30
            sig += 0.18 * np.exp(-((phase - 0.48) ** 2) / (2 * 0.02 ** 2))
        sig += np.random.normal(0, 0.015, len(t))

    elif rhythm in ('av_block_first', 'av_block_mobitz1', 'av_block_mobitz2', 'av_block_third'):
        if rhythm == 'av_block_first':
            pr = 0.28  # prolonged PR
            hr = 65
        elif rhythm == 'av_block_mobitz1':
            pr_values = [0.18, 0.24, 0.32, 0.18, 0.20, 0.26, 0.34, 0.18]
            hr = 68
        elif rhythm == 'av_block_mobitz2':
            # Regular dropped beats (every 3rd)
            hr = 72
        else:  # av_block_third
            # Complete dissociation: P waves at 75, QRS at 35
            hr_atrial = 75
            hr_vent = 35

        for i in range(int(DURATION_SEC * 1.5) + 2):
            offset = i * 60 / hr
            cycle = 60 / hr
            phase = ((t - offset) % cycle) / cycle
            pr_delay = pr if rhythm == 'av_block_first' else (
                pr_values[i % len(pr_values)] if rhythm == 'av_block_mobitz1' else 0.16
            )
            if rhythm == 'av_block_mobitz2' and i % 3 == 2:
                continue
            sig += 0.12 * np.exp(-((phase - 0.1) ** 2) / (2 * 0.005 ** 2))
            sig += 0.55 * np.exp(-((phase - 0.22 + pr_delay - 0.16) ** 2) / (2 * 0.01 ** 2))
            sig -= 0.15 * np.exp(-((phase - 0.26 + pr_delay - 0.16) ** 2) / (2 * 0.01 ** 2))
            sig += 0.2 * np.exp(-((phase - 0.45) ** 2) / (2 * 0.02 ** 2))
        sig += np.random.normal(0, 0.015, len(t))

    elif rhythm == 'wpw':
        hr = 75
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            offset = i * 60 / hr
            cycle = 60 / hr
            phase = ((t - offset) % cycle) / cycle
            sig += 0.08 * np.exp(-((phase - 0.08) ** 2) / (2 * 0.005 ** 2))  # P wave
            # Delta wave (slurred upstroke)
            sig += 0.15 * np.exp(-((phase - 0.14) ** 2) / (2 * 0.015 ** 2))  # delta
            sig += 0.5 * np.exp(-((phase - 0.24) ** 2) / (2 * 0.015 ** 2))  # widened QRS
            sig -= 0.2 * np.exp(-((phase - 0.30) ** 2) / (2 * 0.01 ** 2))
            sig += 0.2 * np.exp(-((phase - 0.48) ** 2) / (2 * 0.02 ** 2))
        sig += np.random.normal(0, 0.015, len(t))

    elif rhythm == 'long_qt':
        hr = 68
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            offset = i * 60 / hr
            cycle = 60 / hr
            phase = ((t - offset) % cycle) / cycle
            sig += 0.12 * np.exp(-((phase - 0.1) ** 2) / (2 * 0.005 ** 2))
            sig += 0.55 * np.exp(-((phase - 0.20) ** 2) / (2 * 0.01 ** 2))
            sig -= 0.15 * np.exp(-((phase - 0.24) ** 2) / (2 * 0.01 ** 2))
            # Prolonged QT (T wave delayed)
            sig += 0.22 * np.exp(-((phase - 0.55) ** 2) / (2 * 0.035 ** 2))
        sig += np.random.normal(0, 0.015, len(t))

    elif rhythm == 'hyperkalemia':
        hr = 75
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            offset = i * 60 / hr
            cycle = 60 / hr
            phase = ((t - offset) % cycle) / cycle
            sig += 0.08 * np.exp(-((phase - 0.08) ** 2) / (2 * 0.005 ** 2))
            # Peaked T wave (tall, narrow, symmetric)
            sig += 0.35 * np.exp(-((phase - 0.42) ** 2) / (2 * 0.01 ** 2))
            # Wide QRS
            sig += 0.3 * np.exp(-((phase - 0.24) ** 2) / (2 * 0.03 ** 2))
            sig -= 0.1 * np.exp(-((phase - 0.30) ** 2) / (2 * 0.02 ** 2))
        sig += np.random.normal(0, 0.02, len(t))

    elif rhythm == 'hypokalemia':
        hr = 75
        for i in range(int(DURATION_SEC * hr / 60) + 2):
            offset = i * 60 / hr
            cycle = 60 / hr
            phase = ((t - offset) % cycle) / cycle
            sig += 0.12 * np.exp(-((phase - 0.1) ** 2) / (2 * 0.005 ** 2))
            sig += 0.5 * np.exp(-((phase - 0.22) ** 2) / (2 * 0.01 ** 2))
            sig -= 0.15 * np.exp(-((phase - 0.26) ** 2) / (2 * 0.01 ** 2))
            # U wave prominent, T wave flattened
            sig += 0.08 * np.exp(-((phase - 0.42) ** 2) / (2 * 0.04 ** 2))
            sig += 0.06 * np.exp(-((phase - 0.52) ** 2) / (2 * 0.01 ** 2))
        sig += np.random.normal(0, 0.015, len(t))

    else:
        raise ValueError(f"Unknown rhythm: {rhythm}")

    return sig


def main():
    t = np.linspace(0, DURATION_SEC, int(DURATION_SEC * SAMPLE_RATE))
    sig = generate_ecg_signal(t, RHYTHM)

    # Apply 0.5-40 Hz bandpass filter
    from scipy.signal import butter, filtfilt
    nyq = 0.5 * SAMPLE_RATE
    b, a = butter(2, [0.5 / nyq, 40 / nyq], btype='band')
    sig = filtfilt(b, a, sig)

    fig, ax = plt.subplots(figsize=(WIDTH_INCHES, HEIGHT_INCHES), dpi=DPI)

    # Grid — classic EKG paper (5mm large, 1mm small)
    ax.set_facecolor('#fafafa')
    ax.grid(which='major', color='#ffcccc', linewidth=0.5, alpha=0.6)
    ax.grid(which='minor', color='#ffe8e8', linewidth=0.2, alpha=0.4)
    ax.minorticks_on()
    ax.xaxis.set_major_locator(plt.MultipleLocator(0.2))
    ax.xaxis.set_minor_locator(plt.MultipleLocator(0.04))
    ax.yaxis.set_major_locator(plt.MultipleLocator(0.5))
    ax.yaxis.set_minor_locator(plt.MultipleLocator(0.1))

    ax.plot(t, sig, color='#111111', linewidth=0.8)
    ax.set_xlim(0, DURATION_SEC)
    ax.set_ylim(-1.2, 1.5)
    ax.set_xlabel('Time (seconds)' if LABELED else '')
    ax.set_ylabel('mV' if LABELED else '')

    # Rhythm label
    rhythm_labels = {
        'normal_sinus': 'Normal Sinus Rhythm',
        'sinus_bradycardia': 'Sinus Bradycardia',
        'sinus_tachycardia': 'Sinus Tachycardia',
        'atrial_fibrillation': 'Atrial Fibrillation',
        'atrial_flutter': 'Atrial Flutter',
        'ventricular_tachycardia': 'Ventricular Tachycardia',
        'ventricular_fibrillation': 'Ventricular Fibrillation',
        'stemi_anterior': 'STEMI — Anterior Leads (V1-V4)',
        'stemi_inferior': 'STEMI — Inferior Leads (II, III, aVF)',
        'av_block_first': 'First-Degree AV Block',
        'av_block_mobitz1': 'Second-Degree AV Block — Mobitz I (Wenckebach)',
        'av_block_mobitz2': 'Second-Degree AV Block — Mobitz II',
        'av_block_third': 'Third-Degree (Complete) AV Block',
        'wpw': 'Wolff-Parkinson-White Syndrome',
        'long_qt': 'Long QT Syndrome',
        'hyperkalemia': 'Hyperkalemia (Peaked T Waves)',
        'hypokalemia': 'Hypokalemia (U Waves, Flat T)',
    }
    if LABELED:
        ax.set_title(rhythm_labels.get(RHYTHM, RHYTHM), fontsize=10, fontfamily='monospace', pad=8)

    plt.tight_layout()
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    plt.savefig(OUTPUT_PATH, dpi=DPI, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f'Generated {RHYTHM} → {OUTPUT_PATH} ({os.path.getsize(OUTPUT_PATH)} bytes)')


if __name__ == '__main__':
    main()
