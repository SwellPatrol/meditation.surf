/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { DEMO_CATALOG } from "../catalog/demoCatalog";
import type { AppCatalog } from "../catalog/types";

/**
 * @brief Shared content client contract
 *
 * Frontend apps can compose this with their own loading and caching strategy.
 */
export interface CatalogClient {
  /**
   * @brief Get the application catalog
   *
   * This returns the catalog content used to render shared browsing experiences.
   *
   * @returns The application catalog payload.
   */
  getCatalog(): Promise<AppCatalog>;
}

/**
 * @brief In-memory client that serves the shared demo catalog
 *
 * This implementation returns the static demo catalog without remote fetching.
 */
export class DemoCatalogClient implements CatalogClient {
  /**
   * @brief Get the demo catalog
   *
   * This resolves to the shared in-memory catalog fixture.
   *
   * @returns The demo catalog payload.
   */
  public async getCatalog(): Promise<AppCatalog> {
    return DEMO_CATALOG;
  }
}
