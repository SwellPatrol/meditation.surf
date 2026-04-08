/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { AudioProfile } from "./AudioProfile";

/**
 * @brief Constructor data used to build a playback source domain object
 */
export type PlaybackSourceInit = {
  url: string;
  mimeType?: string;
  posterUrl?: string;
  audioProfile?: AudioProfile;
};

/**
 * @brief Platform-agnostic media source details shared by all runtimes
 *
 * Platform-specific player implementations decide how to consume this shared
 * domain object, while the object itself owns the stable metadata surface.
 */
export class PlaybackSource {
  public readonly url: string;
  public readonly mimeType?: string;
  public readonly posterUrl?: string;
  public readonly audioProfile?: AudioProfile;

  /**
   * @brief Create a playback source from stable media metadata
   *
   * @param init - Raw source metadata shared across runtimes
   */
  public constructor(init: PlaybackSourceInit) {
    this.url = init.url;
    this.mimeType = init.mimeType;
    this.posterUrl = init.posterUrl;
    this.audioProfile = init.audioProfile;
  }

  /**
   * @brief Return whether this source defines an explicit MIME type
   */
  public hasMimeType(): boolean {
    return this.mimeType !== undefined;
  }

  /**
   * @brief Return whether this source defines a poster image URL
   */
  public hasPosterUrl(): boolean {
    return this.posterUrl !== undefined;
  }

  /**
   * @brief Return whether this source defines audio profile metadata
   */
  public hasAudioProfile(): boolean {
    return this.audioProfile !== undefined;
  }
}
