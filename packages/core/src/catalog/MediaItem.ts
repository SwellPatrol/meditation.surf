/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PlaybackSource } from "@meditation-surf/player-core";

/**
 * @brief Constructor data used to build a media item domain object
 */
export type MediaItemInit = {
  id: string;
  title: string;
  description: string;
  playbackSource: PlaybackSource;
};

/**
 * @brief A single piece of playable meditation content
 *
 * This object keeps content metadata and playback information together so
 * app-layer code can reason about content through behavior-oriented methods.
 */
export class MediaItem {
  public readonly id: string;
  public readonly title: string;
  public readonly description: string;
  private readonly playbackSource: PlaybackSource;

  /**
   * @brief Create a media item from stable content metadata
   *
   * @param init - Raw data used to build the item
   */
  public constructor(init: MediaItemInit) {
    this.id = init.id;
    this.title = init.title;
    this.description = init.description;
    this.playbackSource = init.playbackSource;
  }

  /**
   * @brief Return the playback source used to play this item
   *
   * @returns Shared playback source metadata for player adapters
   */
  public getPlaybackSource(): PlaybackSource {
    return this.playbackSource;
  }
}
