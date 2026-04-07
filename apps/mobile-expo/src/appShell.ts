/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  Catalog,
  DemoCatalogClient,
  type MediaItem,
} from "@meditation-surf/core";

/**
 * @brief Placeholder mobile screen model used until the Expo UI layer is wired in
 *
 * This keeps the scaffold honest without sharing any Lightning UI code.
 */
export type MobileHomeScreenModel = {
  heading: string;
  subheading: string;
  featuredItem: MediaItem;
};

const catalogClient: DemoCatalogClient = new DemoCatalogClient();

/**
 * @brief Build the initial mobile shell state from the shared demo catalog
 *
 * @returns Placeholder home-screen content for the Expo app
 */
export async function createMobileHomeScreenModel(): Promise<MobileHomeScreenModel> {
  const catalog: Catalog = await catalogClient.getCatalog();
  const featuredItem: MediaItem | null = catalog.getFeaturedItem();

  if (featuredItem === null) {
    throw new Error("Expected the demo catalog to expose a featured item.");
  }

  return {
    heading: "meditation.surf",
    subheading: "Expo app scaffold",
    featuredItem,
  };
}
