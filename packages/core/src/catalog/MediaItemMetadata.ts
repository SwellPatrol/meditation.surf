/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

/**
 * @brief Human-readable catalog metadata associated with a media item
 *
 * The shared catalog fixture stores these values in presentation-ready form so
 * all runtimes can consume the same content metadata without adding UI-only
 * ad hoc fields later.
 */
export class MediaItemMetadata {
  public readonly duration: string;
  public readonly status: string;
  public readonly created: string;
  public readonly viewCount: string;

  /**
   * @brief Create the shared metadata attached to a media item
   *
   * @param duration - Human-readable duration label
   * @param status - Human-readable readiness status
   * @param created - Human-readable created timestamp label
   * @param viewCount - Human-readable view count label
   */
  public constructor(
    duration: string,
    status: string,
    created: string,
    viewCount: string,
  ) {
    this.duration = duration;
    this.status = status;
    this.created = created;
    this.viewCount = viewCount;
  }
}
