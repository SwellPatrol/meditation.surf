/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type {
  PlaybackController,
  PlaybackSource,
} from "@meditation-surf/player-core";

/**
 * Placeholder Expo playback adapter.
 * The mobile app owns its eventual player implementation separately from TV.
 */
export class ExpoPlaybackController implements PlaybackController {
  // Last loaded source retained for scaffold-level testing and wiring
  private currentSource: PlaybackSource | null;

  /**
   * @brief Create an empty placeholder controller
   */
  constructor() {
    this.currentSource = null as PlaybackSource | null;
  }

  /**
   * @brief Prepare the placeholder controller
   */
  public initialize(): void {}

  /**
   * @brief Store the requested playback source until Expo playback lands
   *
   * @param source - Shared playback source metadata
   */
  public async load(source: PlaybackSource): Promise<void> {
    this.currentSource = source;
  }

  /**
   * @brief No-op play method for the initial scaffold
   */
  public play(): void {}

  /**
   * @brief No-op pause method for the initial scaffold
   */
  public pause(): void {}

  /**
   * @brief No-op mute method for the initial scaffold
   *
   * @param muted - Requested mute state
   */
  public setMuted(muted: boolean): void {
    void muted;
  }

  /**
   * @brief No-op volume method for the initial scaffold
   *
   * @param volume - Requested volume value
   */
  public setVolume(volume: number): void {
    void volume;
  }

  /**
   * @brief Clear the current source when the scaffold shuts down
   */
  public async destroy(): Promise<void> {
    this.currentSource = null;
  }
}
