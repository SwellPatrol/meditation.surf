/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { DEMO_CATALOG } from "../catalog/demoCatalog";
import type { AppCatalog } from "../catalog/types";

/**
 * Shared content client contract.
 * Frontend apps can compose this with their own loading and caching strategy.
 */
export interface CatalogClient {
  getCatalog(): Promise<AppCatalog>;
}

/**
 * In-memory client that serves the shared demo catalog.
 */
export class DemoCatalogClient implements CatalogClient {
  public async getCatalog(): Promise<AppCatalog> {
    return DEMO_CATALOG;
  }
}
