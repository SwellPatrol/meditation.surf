/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { PlaybackSource } from "./PlaybackSource";
import { type PlaybackStatus, PlaybackStatuses } from "./PlaybackStatuses";

/**
 * @brief Constructor data used to build a playback state domain object
 */
export type PlaybackStateInit = {
  status: PlaybackStatus;
  source: PlaybackSource | null;
  muted: boolean;
  volume: number;
};

/**
 * @brief Minimal playback state model shared across app boundaries
 *
 * This immutable domain object captures the core playback state shared by
 * controllers, observers, and runtime-specific adapters.
 */
export class PlaybackState {
  public readonly status: PlaybackStatus;
  public readonly source: PlaybackSource | null;
  public readonly muted: boolean;
  public readonly volume: number;

  /**
   * @brief Create a playback state from stable shared playback data
   *
   * @param init - Shared playback state values
   */
  public constructor(init: PlaybackStateInit) {
    this.status = init.status;
    this.source = init.source;
    this.muted = init.muted;
    this.volume = init.volume;
  }

  /**
   * @brief Return whether this state currently owns a playback source
   */
  public hasSource(): boolean {
    return this.source !== null;
  }

  /**
   * @brief Return whether playback is actively playing
   */
  public isPlaying(): boolean {
    return this.status === PlaybackStatuses.PLAYING;
  }

  /**
   * @brief Return a copy of this state with an updated status
   *
   * @param status - Shared playback lifecycle status
   *
   * @returns New playback state with the provided status
   */
  public withStatus(status: PlaybackStatus): PlaybackState {
    return new PlaybackState({
      status,
      source: this.source,
      muted: this.muted,
      volume: this.volume,
    });
  }

  /**
   * @brief Return a copy of this state with an updated playback source
   *
   * @param source - Shared playback source or `null` when unloaded
   *
   * @returns New playback state with the provided source
   */
  public withSource(source: PlaybackSource | null): PlaybackState {
    return new PlaybackState({
      status: this.status,
      source,
      muted: this.muted,
      volume: this.volume,
    });
  }

  /**
   * @brief Return a copy of this state with an updated mute flag
   *
   * @param muted - Whether playback should be muted
   *
   * @returns New playback state with the provided mute flag
   */
  public withMuted(muted: boolean): PlaybackState {
    return new PlaybackState({
      status: this.status,
      source: this.source,
      muted,
      volume: this.volume,
    });
  }

  /**
   * @brief Return a copy of this state with an updated volume
   *
   * @param volume - Shared playback volume value
   *
   * @returns New playback state with the provided volume
   */
  public withVolume(volume: number): PlaybackState {
    return new PlaybackState({
      status: this.status,
      source: this.source,
      muted: this.muted,
      volume,
    });
  }
}
