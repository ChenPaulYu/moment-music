import json

import numpy as np


def analyze_motion(readings_json: str) -> str:
    """Analyze device motion readings and return a text summary of musical parameters.

    Expects a JSON array of objects with:
      {timestamp, acceleration: {x,y,z}, rotation: {alpha,beta,gamma}}
    """
    readings = json.loads(readings_json)
    if not readings or len(readings) < 2:
        return "Movement Analysis:\nInsufficient data — very brief capture.\nEnergy: Low | Flow: Smooth | Movement: Still"

    timestamps = np.array([r["timestamp"] for r in readings], dtype=np.float64)
    acc_x = np.array([r["acceleration"]["x"] for r in readings])
    acc_y = np.array([r["acceleration"]["y"] for r in readings])
    acc_z = np.array([r["acceleration"]["z"] for r in readings])
    rot_alpha = np.array([r["rotation"]["alpha"] for r in readings])
    rot_beta = np.array([r["rotation"]["beta"] for r in readings])
    rot_gamma = np.array([r["rotation"]["gamma"] for r in readings])

    # Duration
    duration_ms = timestamps[-1] - timestamps[0]
    duration_s = max(duration_ms / 1000.0, 0.1)

    # Acceleration magnitude (remove gravity baseline ~9.8)
    acc_mag = np.sqrt(acc_x**2 + acc_y**2 + acc_z**2)
    acc_detrended = acc_mag - np.mean(acc_mag)

    # --- Tempo / BPM via zero-crossing rate on detrended acceleration ---
    zero_crossings = np.sum(np.diff(np.sign(acc_detrended)) != 0)
    crossing_rate_hz = zero_crossings / (2.0 * duration_s)
    estimated_bpm = int(np.clip(crossing_rate_hz * 60, 40, 200))

    # --- Energy level from mean acceleration magnitude deviation ---
    energy_val = float(np.std(acc_mag))
    if energy_val < 1.0:
        energy_label = "Low"
    elif energy_val < 3.0:
        energy_label = "Medium"
    else:
        energy_label = "High"

    # --- Flow quality from rotation rate variance ---
    rot_mag = np.sqrt(rot_alpha**2 + rot_beta**2 + rot_gamma**2)
    rot_variance = float(np.var(rot_mag))
    if rot_variance < 50:
        flow_label = "Smooth"
    elif rot_variance < 500:
        flow_label = "Moderate"
    else:
        flow_label = "Jerky"

    # --- Movement type heuristic ---
    mean_acc_std = energy_val
    mean_rot = float(np.mean(rot_mag))
    if mean_acc_std < 0.5 and mean_rot < 5:
        movement_type = "Still"
    elif mean_acc_std < 1.5:
        movement_type = "Swaying"
    elif mean_acc_std < 4.0:
        movement_type = "Walking"
    else:
        movement_type = "Dancing"

    # --- Intensity curve: first half vs second half ---
    mid = len(acc_mag) // 2
    first_half_energy = float(np.std(acc_mag[:mid]))
    second_half_energy = float(np.std(acc_mag[mid:]))
    ratio = second_half_energy / max(first_half_energy, 0.01)
    if ratio > 1.2:
        intensity_curve = "Building — energy increased throughout the capture"
    elif ratio < 0.8:
        intensity_curve = "Fading — energy decreased toward the end"
    else:
        intensity_curve = "Steady — consistent energy throughout"

    return (
        f"Movement Analysis:\n"
        f"Duration: {duration_s:.1f} seconds | Estimated BPM: {estimated_bpm}\n"
        f"Energy: {energy_label} | Flow: {flow_label} | Movement: {movement_type}\n"
        f"Intensity: {intensity_curve}"
    )
