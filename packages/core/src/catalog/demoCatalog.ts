/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { AppCatalog, MediaContent } from "./types";

/**
 * Shared demo media item used by both app scaffolds during the split.
 */
export const DEMO_SURF_VIDEO: MediaContent = {
  id: "swellpatrol-featured-break",
  title: "Featured Break",
  description:
    "A calm featured surf stream used as the shared migration sample.",
  playbackSource: {
    url: "https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8",
    mimeType: "application/x-mpegURL",
    audioProfile: "stereo",
  },
};

/**
 * Shared demo catalog proving both apps can consume the same content model.
 */
export const DEMO_CATALOG: AppCatalog = {
  categories: [
    {
      id: "featured",
      title: "Featured",
      items: [DEMO_SURF_VIDEO],
    },
  ],
};
