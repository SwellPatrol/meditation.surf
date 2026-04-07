/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { Catalog, CatalogSection, MediaItem } from "./types";

/**
 * @brief Shared demo media item consumed by workspace apps
 */
export const DEMO_SURF_VIDEO: MediaItem = new MediaItem({
  id: "swellpatrol-featured-break",
  title: "Featured Break",
  description: "A calm featured surf stream used as shared sample content.",
  playbackSource: {
    url: "https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8",
    mimeType: "application/x-mpegURL",
    audioProfile: "stereo",
  },
});

/**
 * @brief Shared demo catalog used to exercise the common content model
 */
export const DEMO_CATALOG: Catalog = new Catalog({
  sections: [
    new CatalogSection({
      id: "featured",
      title: "Featured",
      items: [DEMO_SURF_VIDEO],
    }),
  ],
});
