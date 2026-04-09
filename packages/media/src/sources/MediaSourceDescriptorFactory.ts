/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { MediaSourceDescriptor } from "./MediaSourceDescriptor";
import type { MediaSourceKind } from "./MediaSourceKind";
import type { MediaSourcePlaybackSource } from "./MediaSourcePlaybackSource";

/**
 * @brief Build stable source descriptors for shared media planning
 *
 * This helper keeps source inference centralized so later source-model growth
 * does not leak into planners or experience wiring.
 */
export class MediaSourceDescriptorFactory {
  /**
   * @brief Create a stable source descriptor from shared playback metadata
   *
   * @param sourceId - Stable identifier assigned by the caller
   * @param playbackSource - Shared playback metadata for one source
   *
   * @returns Shared source descriptor suitable for orchestration state
   */
  public static create(
    sourceId: string,
    playbackSource: MediaSourcePlaybackSource,
  ): MediaSourceDescriptor {
    return {
      sourceId,
      kind: this.inferMediaSourceKind(
        playbackSource.url,
        playbackSource.mimeType,
      ),
      url: playbackSource.url,
      mimeType: playbackSource.mimeType,
      posterUrl: playbackSource.posterUrl,
    };
  }

  /**
   * @brief Infer a high-level source kind from stable playback metadata
   *
   * @param url - Shared playback URL
   * @param mimeType - Optional explicit playback MIME type
   *
   * @returns Best-effort shared source kind for the playback source
   */
  private static inferMediaSourceKind(
    url: string,
    mimeType: string | null,
  ): MediaSourceKind {
    const normalizedUrl: string = url.toLowerCase();
    const normalizedMimeType: string = (mimeType ?? "").toLowerCase();

    if (
      normalizedMimeType.includes("mpegurl") ||
      normalizedMimeType.includes("application/vnd.apple.mpegurl") ||
      normalizedUrl.endsWith(".m3u8")
    ) {
      return "hls";
    }

    if (normalizedMimeType.includes("mp4") || normalizedUrl.endsWith(".mp4")) {
      return "mp4";
    }

    if (
      normalizedMimeType.includes("bittorrent") ||
      normalizedUrl.startsWith("magnet:") ||
      normalizedUrl.endsWith(".torrent")
    ) {
      return "torrent";
    }

    return "unknown";
  }
}
