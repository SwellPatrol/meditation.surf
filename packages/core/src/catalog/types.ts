/*
 * Copyright (C) 2025-2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { PlaybackSource } from "@meditation-surf/player-core";

/**
 * @brief Constructor data used to build a media item domain object
 */
export type MediaItemInit = {
  id: string;
  title: string;
  description: string;
  playbackSource: PlaybackSource;
};

/**
 * @brief Constructor data used to build a catalog section domain object
 */
export type CatalogSectionInit = {
  id: string;
  title: string;
  items: MediaItem[];
};

/**
 * @brief Constructor data used to build a catalog domain object
 */
export type CatalogInit = {
  sections: CatalogSection[];
};

/**
 * @brief A single piece of playable meditation content
 *
 * This object keeps content metadata and playback information together so
 * app-layer code can reason about content through behavior-oriented methods.
 */
export class MediaItem {
  public readonly id: string;
  public readonly title: string;
  public readonly description: string;
  private readonly playbackSource: PlaybackSource;

  /**
   * @brief Create a media item from stable content metadata
   *
   * @param init - Raw data used to build the item
   */
  public constructor(init: MediaItemInit) {
    this.id = init.id;
    this.title = init.title;
    this.description = init.description;
    this.playbackSource = init.playbackSource;
  }

  /**
   * @brief Return the playback source used to play this item
   *
   * @returns Shared playback source metadata for player adapters
   */
  public getPlaybackSource(): PlaybackSource {
    return this.playbackSource;
  }
}

/**
 * @brief A catalog grouping shown by frontend-specific navigation and layout layers
 *
 * The section owns a concrete list of media items and exposes small helper
 * methods so apps can ask intentful questions instead of indexing arrays.
 */
export class CatalogSection {
  public readonly id: string;
  public readonly title: string;
  private readonly items: MediaItem[];

  /**
   * @brief Create a catalog section from a title and item collection
   *
   * @param init - Raw data used to build the section
   */
  public constructor(init: CatalogSectionInit) {
    this.id = init.id;
    this.title = init.title;
    this.items = init.items;
  }

  /**
   * @brief Return the items contained in this section
   *
   * @returns A shallow copy of the section items to keep ownership local
   */
  public getItems(): MediaItem[] {
    return [...this.items];
  }

  /**
   * @brief Determine whether the section currently contains playable content
   *
   * @returns `true` when at least one item exists
   */
  public hasItems(): boolean {
    return this.items.length > 0;
  }

  /**
   * @brief Return the first item when present
   *
   * @returns The first section item, or `null` when the section is empty
   */
  public getFeaturedItem(): MediaItem | null {
    return this.items[0] ?? null;
  }
}

/**
 * @brief Shared catalog payload returned by content clients
 *
 * The catalog provides small domain methods for the "featured content" shape
 * used by the current demo surface without baking in any runtime UI rules.
 */
export class Catalog {
  private readonly sections: CatalogSection[];

  /**
   * @brief Create a catalog from pre-built section objects
   *
   * @param init - Raw data used to build the catalog
   */
  public constructor(init: CatalogInit) {
    this.sections = init.sections;
  }

  /**
   * @brief Return all catalog sections
   *
   * @returns A shallow copy of the catalog section list
   */
  public getSections(): CatalogSection[] {
    return [...this.sections];
  }

  /**
   * @brief Determine whether any section currently has content
   *
   * @returns `true` when the catalog contains at least one playable item
   */
  public hasItems(): boolean {
    return this.sections.some((section: CatalogSection): boolean =>
      section.hasItems(),
    );
  }

  /**
   * @brief Return the first non-empty section when present
   *
   * @returns The first section with content, or `null` when the catalog is empty
   */
  public getFeaturedSection(): CatalogSection | null {
    const featuredSection: CatalogSection | undefined = this.sections.find(
      (section: CatalogSection): boolean => section.hasItems(),
    );

    return featuredSection ?? null;
  }

  /**
   * @brief Return the first featured item across all sections
   *
   * @returns The first playable item, or `null` when no content exists
   */
  public getFeaturedItem(): MediaItem | null {
    const featuredSection: CatalogSection | null = this.getFeaturedSection();

    return featuredSection?.getFeaturedItem() ?? null;
  }
}

/**
 * @brief Backward-compatible alias kept while the domain model shifts to classes
 */
export type MediaContent = MediaItem;

/**
 * @brief Backward-compatible alias kept while the domain model shifts to classes
 */
export type CatalogCategory = CatalogSection;

/**
 * @brief Backward-compatible alias kept while the domain model shifts to classes
 */
export type AppCatalog = Catalog;
