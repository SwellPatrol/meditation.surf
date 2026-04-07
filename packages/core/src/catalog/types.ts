/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PlaybackSource } from "@meditation-surf/player-core";

/**
 * A single piece of playable meditation content.
 */
export type MediaContent = {
  id: string;
  title: string;
  description: string;
  playbackSource: PlaybackSource;
};

/**
 * A catalog grouping shown by frontend-specific navigation and layout layers.
 */
export type CatalogCategory = {
  id: string;
  title: string;
  items: MediaContent[];
};

/**
 * Shared catalog payload returned by content clients.
 */
export type AppCatalog = {
  categories: CatalogCategory[];
};
