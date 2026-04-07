/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  type AudioPreferences,
  type AudioPreferencesStorage,
  normalizeAudioPreferences,
} from "@meditation-surf/core";

/**
 * Browser local-storage implementation of the shared audio preference storage.
 */
class BrowserAudioPreferencesStorage implements AudioPreferencesStorage {
  // Storage key for the mute flag
  private static readonly MUTED_KEY: string = "audioMuted";

  // Storage key for the volume level
  private static readonly VOLUME_KEY: string = "audioVolume";

  /**
   * @brief Load persisted preferences from browser storage
   *
   * @returns A complete preference model with safe defaults
   */
  public load(): AudioPreferences {
    const mutedValue: string | null = window.localStorage.getItem(
      BrowserAudioPreferencesStorage.MUTED_KEY,
    );
    const volumeValue: string | null = window.localStorage.getItem(
      BrowserAudioPreferencesStorage.VOLUME_KEY,
    );
    const parsedVolume: number =
      volumeValue === null ? Number.NaN : parseFloat(volumeValue);

    return normalizeAudioPreferences({
      muted: mutedValue === null ? undefined : mutedValue === "true",
      volume: Number.isNaN(parsedVolume) ? undefined : parsedVolume,
    });
  }

  /**
   * @brief Save shared audio preferences into browser storage
   *
   * @param preferences - Shared preference model to persist
   */
  public save(preferences: AudioPreferences): void {
    const normalizedPreferences: AudioPreferences =
      normalizeAudioPreferences(preferences);

    window.localStorage.setItem(
      BrowserAudioPreferencesStorage.MUTED_KEY,
      normalizedPreferences.muted ? "true" : "false",
    );
    window.localStorage.setItem(
      BrowserAudioPreferencesStorage.VOLUME_KEY,
      normalizedPreferences.volume.toString(),
    );
  }
}

/**
 * @brief Persisted audio configuration for the video player
 *
 * The mute state and volume are stored in local storage so they survive page
 * reloads and Lightning restarts.
 */
export class AudioState {
  // Shared storage implementation used by the TV app
  private static readonly storage: AudioPreferencesStorage =
    new BrowserAudioPreferencesStorage();

  /**
   * @brief Retrieve the persisted mute flag
   *
   * @returns `true` when audio should be muted
   */
  public static isMuted(): boolean {
    return AudioState.storage.load().muted;
  }

  /**
   * @brief Retrieve the persisted volume level
   *
   * @returns Volume level clamped to [0, 1]
   */
  public static getVolume(): number {
    return AudioState.storage.load().volume;
  }

  /**
   * @brief Persist the mute flag
   *
   * @param muted - Whether audio should be muted
   */
  public static setMuted(muted: boolean): void {
    AudioState.storage.save({
      muted,
      volume: AudioState.getVolume(),
    });
  }

  /**
   * @brief Persist the volume level
   *
   * @param volume - Volume value in [0, 1]
   */
  public static setVolume(volume: number): void {
    AudioState.storage.save({
      muted: AudioState.isMuted(),
      volume,
    });
  }
}

export default AudioState;
