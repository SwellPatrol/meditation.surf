/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * Persisted audio preferences shared by both frontends.
 */
export type AudioPreferences = {
  muted: boolean;
  volume: number;
};

/**
 * Storage contract for audio preferences.
 * Each frontend keeps its own persistence implementation.
 */
export interface AudioPreferencesStorage {
  load(): AudioPreferences;
  save(preferences: AudioPreferences): void;
}

/**
 * Default audio preferences used when no storage value exists.
 */
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  muted: false,
  volume: 1,
};

/**
 * Clamp a volume value into the valid media element range.
 *
 * @param volume - Candidate volume value
 * @returns Volume clamped to [0, 1]
 */
export function clampAudioVolume(volume: number): number {
  return Math.min(Math.max(volume, 0), 1);
}

/**
 * Normalize an arbitrary preference object into the shared model.
 *
 * @param preferences - Partial or invalid preference input
 * @returns A complete and safe preference object
 */
export function normalizeAudioPreferences(
  preferences: Partial<AudioPreferences>,
): AudioPreferences {
  return {
    muted: preferences.muted ?? DEFAULT_AUDIO_PREFERENCES.muted,
    volume: clampAudioVolume(
      preferences.volume ?? DEFAULT_AUDIO_PREFERENCES.volume,
    ),
  };
}
