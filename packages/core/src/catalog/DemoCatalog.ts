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
  private static readonly SURF_VIDEO: MediaItem = new MediaItem(
    "swellpatrol-featured-break",
    "Featured Break",
    "A calm featured surf stream used as shared sample content.",
    new PlaybackSource(
      "https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8",
      "application/x-mpegURL",
      undefined,
      "stereo",
    ),
  );

  private static readonly DOLBY_ATMOS_SPEAKER_TEST: MediaItem = new MediaItem(
    "dolby-atmos-speaker-test",
    "Dolby Atmos Speaker Test",
    "A Dolby Atmos demo clip for speaker testing.",
    new PlaybackSource(
      "https://stream.mux.com/whqnGD00ducpABKumM02GTcWDAfGhwczU3LH1rHptzqOU.m3u8",
      "application/x-mpegURL",
      undefined,
      "stereo",
    ),
  );

  private static readonly CATALOG: Catalog = new Catalog([
    new CatalogSection("featured", "Featured", [
      DemoCatalog.SURF_VIDEO,
      DemoCatalog.DOLBY_ATMOS_SPEAKER_TEST,
    ]),
  ]);

  /**
   * @brief Return the shared demo surf video
   *
   * @returns Demo media item used as the featured background source
   */
  public static getSurfVideo(): MediaItem {
    return DemoCatalog.SURF_VIDEO;
  }

  /**
   * @brief Return the shared Dolby Atmos demo item
   *
   * @returns Demo media item used for speaker testing
   */
  public static getDolbyAtmosSpeakerTest(): MediaItem {
    return DemoCatalog.DOLBY_ATMOS_SPEAKER_TEST;
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
