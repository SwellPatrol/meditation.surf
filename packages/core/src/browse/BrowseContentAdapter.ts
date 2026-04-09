/*
 * Copyright (C) 2026 Garrett Brown
 * This file is part of meditation.surf - https://github.com/SwellPatrol/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import type { Catalog } from "../catalog/Catalog";
import type { CatalogSection } from "../catalog/CatalogSection";
import type { MediaItem } from "../catalog/MediaItem";
import type { MediaItemMetadataTag } from "../catalog/MediaItemMetadata";

/**
 * @brief Artwork slot data prepared for browse-style presentation
 */
export interface BrowseArtworkContent {
  readonly imageUrl: string | null;
  readonly placeholderKey: string;
  readonly placeholderMonogram: string;
  readonly title: string;
}

/**
 * @brief Ordered metadata entry rendered in the hero metadata row
 */
export interface BrowseMetadataEntry {
  readonly id:
    | "created"
    | "duration"
    | "resolution"
    | "aspectRatio"
    | "videoCodec"
    | "audioCodec"
    | "channelLayout";
  readonly kind: "calendar" | "tag";
  readonly value: string;
  readonly iconName: "calendar" | null;
}

/**
 * @brief Browse hero content derived from a shared media item
 */
export interface BrowseHeroContent {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly viewCount: string;
  readonly metadataEntries: readonly BrowseMetadataEntry[];
  readonly artwork: BrowseArtworkContent;
}

/**
 * @brief Thumbnail card content derived from a shared media item
 */
export interface BrowseThumbnailContent {
  readonly id: string;
  readonly title: string;
  readonly secondaryText: string;
  readonly artwork: BrowseArtworkContent;
}

/**
 * @brief One horizontal browse rail rendered below the hero area
 */
export interface BrowseRowContent {
  readonly id: string;
  readonly title: string;
  readonly items: readonly BrowseThumbnailContent[];
}

/**
 * @brief Full browse overlay payload shared by every runtime
 */
export interface BrowseScreenContent {
  readonly hero: BrowseHeroContent | null;
  readonly rows: readonly BrowseRowContent[];
}

/**
 * @brief Adapt shared catalog items into a browse-screen presentation model
 *
 * The adapter keeps browse-specific ordering and fallback rules out of each
 * app, while still leaving rendering decisions to the platform layers.
 */
export class BrowseContentAdapter {
  private static readonly MINIMUM_ROW_COUNT: number = 2;
  private readonly catalog: Catalog;

  /**
   * @brief Create the browse adapter from a shared catalog
   *
   * @param catalog - Shared content catalog consumed by every app surface
   */
  public constructor(catalog: Catalog) {
    this.catalog = catalog;
  }

  /**
   * @brief Build the browse overlay content for the current active item
   *
   * @param activeItem - Current playback item used as the browse hero when set
   *
   * @returns Browse hero and rows derived from the shared catalog
   */
  public getBrowseScreenContent(
    activeItem: MediaItem | null,
  ): BrowseScreenContent {
    const heroItem: MediaItem | null = this.resolveHeroItem(activeItem);

    return {
      hero: heroItem === null ? null : this.createHeroContent(heroItem),
      rows: this.createRows(),
    };
  }

  /**
   * @brief Resolve the item that should currently occupy the hero slot
   *
   * @param activeItem - Current playback item when available
   *
   * @returns Active item first, then the catalog featured item as fallback
   */
  private resolveHeroItem(activeItem: MediaItem | null): MediaItem | null {
    if (activeItem !== null) {
      return activeItem;
    }

    return this.catalog.getFeaturedItem();
  }

  /**
   * @brief Convert a shared media item into hero presentation content
   *
   * @param mediaItem - Shared media item adapted for the hero area
   *
   * @returns Browse hero content with ordered metadata entries
   */
  private createHeroContent(mediaItem: MediaItem): BrowseHeroContent {
    return {
      id: mediaItem.id,
      title: mediaItem.title,
      description: mediaItem.description,
      viewCount: mediaItem.getMetadata().viewCount,
      metadataEntries: this.createMetadataEntries(mediaItem),
      artwork: this.createArtworkContent(mediaItem),
    };
  }

  /**
   * @brief Convert a shared media item into thumbnail card content
   *
   * @param mediaItem - Shared media item adapted for a browse rail card
   *
   * @returns Thumbnail card content shown inside a browse row
   */
  private createThumbnailContent(mediaItem: MediaItem): BrowseThumbnailContent {
    return {
      id: mediaItem.id,
      title: mediaItem.title,
      secondaryText: mediaItem.getMetadata().duration,
      artwork: this.createArtworkContent(mediaItem),
    };
  }

  /**
   * @brief Create the hero metadata entries in the required UI order
   *
   * The created label is always first and always rendered as the standalone
   * calendar item. Every tag after that preserves the catalog metadata order
   * so runtimes cannot accidentally reorder the row.
   *
   * @param mediaItem - Shared media item that owns the metadata
   *
   * @returns Ordered metadata entries for hero rendering
   */
  private createMetadataEntries(
    mediaItem: MediaItem,
  ): readonly BrowseMetadataEntry[] {
    const streamDetailRow: {
      created: string;
      tags: readonly MediaItemMetadataTag[];
    } = mediaItem.getMetadata().getOrderedStreamDetailRow();
    const metadataEntries: BrowseMetadataEntry[] = [
      {
        id: "created",
        kind: "calendar",
        value: streamDetailRow.created,
        iconName: "calendar",
      },
    ];

    for (const metadataTag of streamDetailRow.tags) {
      metadataEntries.push({
        id: metadataTag.id,
        kind: "tag",
        value: metadataTag.value,
        iconName: null,
      });
    }

    return metadataEntries;
  }

  /**
   * @brief Create the browse rails shown below the hero area
   *
   * Catalog sections become rails directly. When the fixture catalog exposes
   * fewer than two rails, this method derives additional rails from the same
   * shared items so every surface still renders a browse-style layout.
   *
   * @returns Ordered browse rows sourced from the shared catalog
   */
  private createRows(): readonly BrowseRowContent[] {
    const catalogSections: CatalogSection[] = this.catalog
      .getSections()
      .filter((catalogSection: CatalogSection): boolean =>
        catalogSection.hasItems(),
      );
    const browseRows: BrowseRowContent[] = catalogSections.map(
      (catalogSection: CatalogSection): BrowseRowContent =>
        this.createRowFromItems(
          catalogSection.id,
          catalogSection.title,
          catalogSection.getItems(),
        ),
    );
    const allItems: MediaItem[] = this.collectAllItems(catalogSections);

    if (allItems.length === 0) {
      return browseRows;
    }

    if (browseRows.length < BrowseContentAdapter.MINIMUM_ROW_COUNT) {
      browseRows.push(
        this.createRowFromItems(
          "recently-added",
          "Recently Added",
          this.rotateItems(allItems, 1),
        ),
      );
    }

    if (browseRows.length < BrowseContentAdapter.MINIMUM_ROW_COUNT) {
      browseRows.push(
        this.createRowFromItems(
          "continue-browsing",
          "Continue Browsing",
          this.rotateItems(allItems, 2),
        ),
      );
    }

    return browseRows;
  }

  /**
   * @brief Convert shared items into a browse row payload
   *
   * @param rowId - Stable row identifier
   * @param rowTitle - Human-readable row title
   * @param items - Shared media items rendered inside the row
   *
   * @returns Browse row content with thumbnail cards
   */
  private createRowFromItems(
    rowId: string,
    rowTitle: string,
    items: MediaItem[],
  ): BrowseRowContent {
    return {
      id: rowId,
      title: rowTitle,
      items: items.map(
        (mediaItem: MediaItem): BrowseThumbnailContent =>
          this.createThumbnailContent(mediaItem),
      ),
    };
  }

  /**
   * @brief Flatten every section item into one browseable list
   *
   * @param catalogSections - Catalog sections that currently contain content
   *
   * @returns Flat list of section items preserving catalog order
   */
  private collectAllItems(catalogSections: CatalogSection[]): MediaItem[] {
    const allItems: MediaItem[] = [];

    for (const catalogSection of catalogSections) {
      allItems.push(...catalogSection.getItems());
    }

    return allItems;
  }

  /**
   * @brief Rotate items to create a distinct-looking fallback row ordering
   *
   * @param items - Shared media items sourced from the catalog
   * @param offset - Circular offset applied to the item order
   *
   * @returns Rotated item order used for fallback rows
   */
  private rotateItems(items: MediaItem[], offset: number): MediaItem[] {
    if (items.length === 0) {
      return [];
    }

    const normalizedOffset: number = offset % items.length;

    return items
      .slice(normalizedOffset)
      .concat(items.slice(0, normalizedOffset));
  }

  /**
   * @brief Create artwork slot data, leaving room for future real artwork URLs
   *
   * @param mediaItem - Shared media item that owns the artwork slot
   *
   * @returns Artwork content with placeholder-ready fallback fields
   */
  private createArtworkContent(mediaItem: MediaItem): BrowseArtworkContent {
    const titleWords: string[] = mediaItem.title.split(/\s+/).filter(Boolean);
    const placeholderMonogram: string = titleWords
      .slice(0, 2)
      .map((titleWord: string): string => titleWord.charAt(0).toUpperCase())
      .join("");

    return {
      imageUrl: null,
      placeholderKey: mediaItem.id,
      placeholderMonogram,
      title: mediaItem.title,
    };
  }
}
