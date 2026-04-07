/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import {
  type AppCatalog,
  DemoCatalogClient,
  type MediaContent,
} from "@meditation-surf/core";

/**
 * Placeholder mobile screen model used until the Expo UI layer is wired in.
 * This keeps the scaffold honest without sharing any Lightning UI code.
 */
export type MobileHomeScreenModel = {
  heading: string;
  subheading: string;
  featuredItem: MediaContent;
};

/**
 * Build the initial mobile shell state from the shared demo catalog.
 *
 * @returns Placeholder home-screen content for the Expo app
 */
const catalogClient: DemoCatalogClient = new DemoCatalogClient();

export async function createMobileHomeScreenModel(): Promise<MobileHomeScreenModel> {
  const catalog: AppCatalog = await catalogClient.getCatalog();
  const featuredItem: MediaContent = catalog.categories[0].items[0];

  return {
    heading: "meditation.surf",
    subheading: "Expo app scaffold",
    featuredItem,
  };
}
