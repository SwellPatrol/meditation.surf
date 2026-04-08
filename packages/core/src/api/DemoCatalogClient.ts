/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { Catalog } from "../catalog/Catalog";
import { DemoCatalog } from "../catalog/DemoCatalog";
import type { ICatalogClient } from "./ICatalogClient";

/**
 * @brief In-memory client that serves the shared demo catalog
 *
 * This implementation returns the static demo catalog without remote fetching.
 */
export class DemoCatalogClient implements ICatalogClient {
  /**
   * @brief Get the demo catalog
   *
   * This resolves to the shared in-memory catalog fixture.
   *
   * @returns The demo catalog payload
   */
  public async getCatalog(): Promise<Catalog> {
    return DemoCatalog.getCatalog();
  }
}
