/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { PlaybackSource } from "@meditation-surf/player-core";

import { Catalog } from "./Catalog";
import { CatalogSection } from "./CatalogSection";
import { MediaItem } from "./MediaItem";

/**
 * @brief Shared demo catalog fixture used by workspace apps
 *
 * This class keeps demo content assembly close to the fixture concept instead
 * of scattering cross-file helper constants.
 */
export class DemoCatalog {
  private static readonly SURF_VIDEO: MediaItem = new MediaItem({
    id: "swellpatrol-featured-break",
    title: "Featured Break",
    description: "A calm featured surf stream used as shared sample content.",
    playbackSource: new PlaybackSource({
      url: "https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8",
      mimeType: "application/x-mpegURL",
      audioProfile: "stereo",
    }),
  });

  private static readonly CATALOG: Catalog = new Catalog({
    sections: [
      new CatalogSection({
        id: "featured",
        title: "Featured",
        items: [DemoCatalog.SURF_VIDEO],
      }),
    ],
  });

  /**
   * @brief Return the shared demo surf video
   *
   * @returns Demo media item used as the featured background source
   */
  public static getSurfVideo(): MediaItem {
    return DemoCatalog.SURF_VIDEO;
  }

  /**
   * @brief Return the shared demo catalog
   *
   * @returns Demo catalog fixture used across workspace apps
   */
  public static getCatalog(): Catalog {
    return DemoCatalog.CATALOG;
  }
}
